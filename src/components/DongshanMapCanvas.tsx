/// <reference types="google.maps" />
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  APILoadingStatus,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { LocateFixed, MapPin, Navigation, RotateCcw } from 'lucide-react';
import type {
  ComputedRouteInfo,
  GuideSpot,
  LatLngPoint,
  RouteStepInfo,
  TravelMode,
} from '../types/guide';
import {
  DONGSHAN_STATION_ORIGIN,
  estimateTravelMinutes,
  formatDistance,
  formatDuration,
  haversineDistanceKm,
} from '../utils/geo';
import { useOnlineStatus } from '../hooks/usePWA';

interface DongshanMapCanvasProps {
  spots: GuideSpot[];
  selectedSpot: GuideSpot | null;
  onSelectSpot: (spot: GuideSpot) => void;
  origin: LatLngPoint;
  travelMode: TravelMode;
  routeActive: boolean;
  itinerarySpots: GuideSpot[];
  onRouteComputed: (route: ComputedRouteInfo | null) => void;
  pickCoordinateMode?: boolean;
  onPickCoordinate?: (coords: LatLngPoint) => void;
  onRequestUserLocation?: () => void;
}

const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();

function SpotMarkerItem({
  spot,
  isSelected,
  itineraryIndex,
  onSelect,
}: {
  spot: GuideSpot;
  isSelected: boolean;
  itineraryIndex: number;
  onSelect: (spot: GuideSpot) => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoOpen, setInfoOpen] = useState(false);

  const handleClick = useCallback(() => {
    onSelect(spot);
    setInfoOpen(true);
  }, [onSelect, spot]);

  useEffect(() => {
    if (!isSelected) setInfoOpen(false);
  }, [isSelected]);

  const pinBg = isSelected
    ? '#B45309'
    : itineraryIndex > 0
      ? '#1B5E43'
      : spot.source === 'student'
        ? '#0F766E'
        : '#2D4F3E';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: spot.lat, lng: spot.lng }}
        title={`${spot.name}（${spot.category}）`}
        zIndex={isSelected ? 40 : itineraryIndex > 0 ? 30 : 10}
        onClick={handleClick}
      >
        <Pin
          background={pinBg}
          borderColor="#FFFFFF"
          glyphColor="#FFFFFF"
          glyphText={itineraryIndex > 0 ? String(itineraryIndex) : undefined}
          scale={isSelected ? 1.25 : 1.0}
        />
      </AdvancedMarker>
      {infoOpen && marker && (
        <InfoWindow anchor={marker} maxWidth={240} onCloseClick={() => setInfoOpen(false)}>
          <div className="text-[#1C1B18] p-0.5 space-y-1">
            <div className="text-[11px] text-[#57544D]">
              {spot.category} · {spot.village}
            </div>
            <div className="text-sm font-semibold leading-snug">{spot.name}</div>
            <p className="text-xs text-[#45423C] line-clamp-2">{spot.summary}</p>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function GoogleRoutesController({
  origin,
  destination,
  waypoints,
  travelMode,
  active,
  onRouteComputed,
}: {
  origin: LatLngPoint;
  destination: LatLngPoint | null;
  waypoints: LatLngPoint[];
  travelMode: TravelMode;
  active: boolean;
  onRouteComputed: (route: ComputedRouteInfo | null) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!active || !destination || !routesLib || !map) {
      return;
    }

    let cancelled = false;

    const request: Record<string, unknown> = {
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      travelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    };

    if (waypoints.length > 0) {
      request.intermediates = waypoints.map((wp) => ({
        location: { lat: wp.lat, lng: wp.lng },
      }));
    }

    const RouteClass = routesLib.Route as unknown as {
      computeRoutes: (req: Record<string, unknown>) => Promise<{
        routes?: Array<{
          distanceMeters?: number;
          durationMillis?: number;
          viewport?: google.maps.LatLngBounds;
          legs?: Array<{
            steps?: Array<{
              navigationInstruction?: { instructions?: string };
              localizedValues?: {
                distance?: { text?: string };
                staticDuration?: { text?: string };
              };
            }>;
          }>;
          createPolylines: () => google.maps.Polyline[];
        }>;
      }>;
    };

    RouteClass.computeRoutes(request)
      .then((response) => {
        if (cancelled) return;
        const primaryRoute = response.routes?.[0];
        if (!primaryRoute) {
          onRouteComputed(null);
          return;
        }

        const newPolylines = primaryRoute.createPolylines();
        newPolylines.forEach((polyline) => {
          polyline.setOptions({
            strokeColor: '#1B5E43',
            strokeOpacity: 0.9,
            strokeWeight: 5,
          });
          polyline.setMap(map);
        });
        polylinesRef.current = newPolylines;

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport, 60);
        }

        const steps: RouteStepInfo[] = [];
        primaryRoute.legs?.forEach((leg) => {
          leg.steps?.forEach((step) => {
            const instruction = step.navigationInstruction?.instructions;
            if (instruction) {
              steps.push({
                instruction,
                distanceText: step.localizedValues?.distance?.text ?? '',
                durationText: step.localizedValues?.staticDuration?.text ?? '',
              });
            }
          });
        });

        onRouteComputed({
          distanceMeters: primaryRoute.distanceMeters ?? 0,
          durationMillis: primaryRoute.durationMillis ?? 0,
          steps,
          source: 'google-routes',
        });
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback to Haversine estimate if Routes API rejects (e.g. transit coverage or quota)
        const distKm = haversineDistanceKm(origin, destination);
        const mins = estimateTravelMinutes(distKm, travelMode);
        onRouteComputed({
          distanceMeters: Math.round(distKm * 1280),
          durationMillis: mins * 60000,
          steps: [
            {
              instruction: `沿冬山鄉主要道路前往目的地`,
              distanceText: formatDistance(distKm * 1280),
              durationText: formatDuration(mins),
            },
          ],
          source: 'spatial-estimate',
        });
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [active, origin, destination, waypoints, travelMode, routesLib, map, onRouteComputed]);

  return null;
}

function GoogleMapCameraHelper({
  selectedSpot,
  pickCoordinateMode,
  onPickCoordinate,
}: {
  selectedSpot: GuideSpot | null;
  pickCoordinateMode?: boolean;
  onPickCoordinate?: (coords: LatLngPoint) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (map && selectedSpot) {
      map.panTo({ lat: selectedSpot.lat, lng: selectedSpot.lng });
    }
  }, [map, selectedSpot]);

  useEffect(() => {
    if (!map || !pickCoordinateMode || !onPickCoordinate) return;
    const listener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        onPickCoordinate({
          lat: Number(event.latLng.lat().toFixed(6)),
          lng: Number(event.latLng.lng().toFixed(6)),
        });
      }
    });
    return () => listener.remove();
  }, [map, pickCoordinateMode, onPickCoordinate]);

  return null;
}

function GoogleLiveMap({
  spots,
  selectedSpot,
  onSelectSpot,
  origin,
  travelMode,
  routeActive,
  itinerarySpots,
  onRouteComputed,
  pickCoordinateMode,
  onPickCoordinate,
  onAuthFailure,
}: DongshanMapCanvasProps & { onAuthFailure: () => void }) {
  const status = useApiLoadingStatus();

  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE || status === APILoadingStatus.FAILED) {
      onAuthFailure();
    }
  }, [status, onAuthFailure]);

  const routeTarget = useMemo(() => {
    if (itinerarySpots.length > 0) {
      return itinerarySpots[itinerarySpots.length - 1];
    }
    return selectedSpot;
  }, [itinerarySpots, selectedSpot]);

  const routeWaypoints = useMemo(() => {
    if (itinerarySpots.length <= 1) return [];
    return itinerarySpots.slice(0, -1).map((s) => ({ lat: s.lat, lng: s.lng }));
  }, [itinerarySpots]);

  return (
    <div className="relative w-full h-full min-h-[420px]">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={DONGSHAN_STATION_ORIGIN}
        defaultZoom={13}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={true}
        fullscreenControl={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        <GoogleMapCameraHelper
          selectedSpot={selectedSpot}
          pickCoordinateMode={pickCoordinateMode}
          onPickCoordinate={onPickCoordinate}
        />

        {/* Origin marker */}
        <AdvancedMarker position={origin} title="出發起點">
          <div className="w-4 h-4 rounded-full bg-[#1C1B18] border-2 border-white shadow-md" />
        </AdvancedMarker>

        {spots.map((spot) => {
          const idx = itinerarySpots.findIndex((s) => s.id === spot.id);
          return (
            <SpotMarkerItem
              key={spot.id}
              spot={spot}
              isSelected={selectedSpot?.id === spot.id}
              itineraryIndex={idx >= 0 ? idx + 1 : 0}
              onSelect={onSelectSpot}
            />
          );
        })}

        <GoogleRoutesController
          origin={origin}
          destination={routeTarget ? { lat: routeTarget.lat, lng: routeTarget.lng } : null}
          waypoints={routeWaypoints}
          travelMode={travelMode}
          active={routeActive}
          onRouteComputed={onRouteComputed}
        />
      </GoogleMap>
    </div>
  );
}

// Offline / Pre-Configuration Interactive Township Spatial Map (same real lat/lng projection)
function SpatialDongshanMap({
  spots,
  selectedSpot,
  onSelectSpot,
  origin,
  travelMode,
  routeActive,
  itinerarySpots,
  onRouteComputed,
  pickCoordinateMode,
  onPickCoordinate,
  onRequestUserLocation,
}: DongshanMapCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [zoom, setZoom] = useState(1);

  // Bounding box covering Dongshan Township (from Xinliao/Zhongshan hills to Wuyuan/Pearl plain)
  const bounds = {
    minLat: 24.592,
    maxLat: 24.672,
    minLng: 121.708,
    maxLng: 121.825,
  };

  const project = useCallback(
    (lat: number, lng: number) => {
      const xPct = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
      const yPct = 1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);
      return {
        x: Math.max(65, Math.min(535, xPct * 470 + 65)),
        y: Math.max(85, Math.min(675, yPct * 590 + 85)),
      };
    },
    [bounds.maxLat, bounds.maxLng, bounds.minLat, bounds.minLng]
  );

  const unproject = useCallback(
    (svgX: number, svgY: number): LatLngPoint => {
      const xPct = (svgX - 65) / 470;
      const yPct = (svgY - 85) / 590;
      const lng = bounds.minLng + xPct * (bounds.maxLng - bounds.minLng);
      const lat = bounds.maxLat - yPct * (bounds.maxLat - bounds.minLat);
      return {
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
      };
    },
    [bounds.maxLat, bounds.maxLng, bounds.minLat, bounds.minLng]
  );

  // Compute spatial estimate route when routeActive changes
  useEffect(() => {
    if (!routeActive) {
      onRouteComputed(null);
      return;
    }

    const targets = itinerarySpots.length > 0 ? itinerarySpots : selectedSpot ? [selectedSpot] : [];
    if (targets.length === 0) {
      onRouteComputed(null);
      return;
    }

    let current = origin;
    let totalKm = 0;
    let totalMins = 0;
    const steps: RouteStepInfo[] = [];

    targets.forEach((target, index) => {
      const km = haversineDistanceKm(current, { lat: target.lat, lng: target.lng });
      const roadKm = km * 1.28;
      const mins = estimateTravelMinutes(km, travelMode);
      totalKm += roadKm;
      totalMins += mins;
      steps.push({
        instruction:
          index === 0
            ? `從起點出發前往「${target.name}」（${target.village}）`
            : `接續前往第 ${index + 1} 站「${target.name}」`,
        distanceText: formatDistance(roadKm * 1000),
        durationText: formatDuration(mins),
      });
      current = { lat: target.lat, lng: target.lng };
    });

    onRouteComputed({
      distanceMeters: Math.round(totalKm * 1000),
      durationMillis: totalMins * 60000,
      steps,
      source: 'spatial-estimate',
    });
  }, [routeActive, origin, selectedSpot, itinerarySpots, travelMode, onRouteComputed]);

  const routePoints = useMemo(() => {
    if (!routeActive) return [];
    const targets = itinerarySpots.length > 0 ? itinerarySpots : selectedSpot ? [selectedSpot] : [];
    if (targets.length === 0) return [];
    return [origin, ...targets.map((t) => ({ lat: t.lat, lng: t.lng }))].map((pt) =>
      project(pt.lat, pt.lng)
    );
  }, [routeActive, itinerarySpots, selectedSpot, origin, project]);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!pickCoordinateMode || !onPickCoordinate || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 600;
    const svgY = ((e.clientY - rect.top) / rect.height) * 760;
    onPickCoordinate(unproject(svgX, svgY));
  };

  const originPos = project(origin.lat, origin.lng);

  // Geographic landmarks on the spatial canvas for Dongshan Township orientation
  const dongshanRiverPath =
    'M 190 650 Q 245 555 305 505 T 415 390 T 485 220 T 560 120';
  const railwayPath = 'M 380 690 L 410 520 L 425 395 L 440 220 L 455 55';
  const meihuaLakeCenter = project(24.6441, 121.7322);

  return (
    <div
      data-testid="dongshan-spatial-map"
      className="relative w-full h-full min-h-[440px] bg-[#EFECE2] overflow-hidden select-none"
    >
      {/* Top status bar inside map */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto bg-[#F8F7F3]/95 backdrop-blur-sm border border-[#D8D2C5] rounded-lg px-3 py-1.5 text-xs text-[#45423C] shadow-xs">
          冬山鄉流域互動圖層 · 已載入 {spots.length} 處導覽點
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          {onRequestUserLocation && (
            <button
              type="button"
              onClick={onRequestUserLocation}
              aria-label="定位目前位置"
              className="inline-flex items-center gap-1 bg-[#F8F7F3]/95 border border-[#D8D2C5] hover:border-[#1B5E43] text-[#1C1B18] rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
            >
              <LocateFixed className="w-3.5 h-3.5 text-[#1B5E43]" aria-hidden="true" />
              <span>定位</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setZoom((z) => (z >= 1.4 ? 1 : Number((z + 0.2).toFixed(1))))}
            aria-label="調整地圖縮放比例"
            className="bg-[#F8F7F3]/95 border border-[#D8D2C5] hover:border-[#1B5E43] text-[#1C1B18] rounded-lg px-2.5 py-1.5 text-xs font-mono tabular-nums"
          >
            {Math.round(zoom * 100)}%
          </button>
          {zoom !== 1 && (
            <button
              type="button"
              onClick={() => setZoom(1)}
              aria-label="重設地圖視角"
              className="bg-[#F8F7F3]/95 border border-[#D8D2C5] text-[#1C1B18] rounded-lg p-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {pickCoordinateMode && (
        <div className="absolute bottom-3 left-3 z-10 bg-[#1B5E43] text-white text-xs px-3 py-1.5 rounded-lg shadow-sm">
          點選地圖任意位置即可自動帶入經緯度座標
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox="0 0 600 760"
        preserveAspectRatio="xMidYMid slice"
        onClick={handleSvgClick}
        className={`w-full h-full transition-transform duration-200 ${
          pickCoordinateMode ? 'cursor-crosshair' : 'cursor-default'
        }`}
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        role="img"
        aria-label="冬山鄉導覽空間地圖"
      >
        <defs>
          <pattern id="paddyGrid" width="38" height="38" patternUnits="userSpaceOnUse">
            <path
              d="M 38 0 L 0 0 0 38"
              fill="none"
              stroke="#DED9CC"
              strokeWidth="0.7"
            />
          </pattern>
        </defs>

        {/* Base farmland grid */}
        <rect width="600" height="760" fill="#EFECE2" />
        <rect width="600" height="760" fill="url(#paddyGrid)" />

        {/* Southern Mountain Foothills (中山 / 新寮 / 大進) */}
        <path
          d="M 0 490 Q 125 445 235 520 T 445 595 L 600 635 L 600 760 L 0 760 Z"
          fill="#DDE5D7"
        />
        <path
          d="M 0 575 Q 150 530 270 610 T 490 690 L 0 760 Z"
          fill="#D0DBC9"
        />

        {/* Meihua Lake */}
        <ellipse
          cx={meihuaLakeCenter.x}
          cy={meihuaLakeCenter.y}
          rx="20"
          ry="14"
          fill="#B9D7D2"
          stroke="#7CA9A2"
          strokeWidth="1.5"
        />

        {/* Dongshan River */}
        <path
          d={dongshanRiverPath}
          fill="none"
          stroke="#9CC3BC"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d={dongshanRiverPath}
          fill="none"
          stroke="#76A79E"
          strokeWidth="2"
          strokeDasharray="6 4"
        />

        {/* Taiwan Railway Line */}
        <path
          d={railwayPath}
          fill="none"
          stroke="#8B8579"
          strokeWidth="2.5"
          strokeDasharray="8 6"
        />

        {/* Subtle village/area topographic labels */}
        <text x="145" y="255" fontSize="12" fill="#6B675E" fontFamily="Noto Serif TC, serif">
          梅花湖・得安村
        </text>
        <text x="175" y="475" fontSize="12" fill="#4E6655" fontFamily="Noto Serif TC, serif">
          中山茶鄉農業區
        </text>
        <text x="195" y="635" fontSize="12" fill="#4E6655" fontFamily="Noto Serif TC, serif">
          新寮溪源頭
        </text>
        <text x="435" y="405" fontSize="12" fill="#6B675E" fontFamily="Noto Serif TC, serif">
          冬山老街・車站
        </text>
        <text x="460" y="185" fontSize="12" fill="#6B675E" fontFamily="Noto Serif TC, serif">
          武淵・珍珠村
        </text>

        {/* Active Navigation / Itinerary Polyline */}
        {routePoints.length >= 2 && (
          <polyline
            points={routePoints.map((pt) => `${pt.x},${pt.y}`).join(' ')}
            fill="none"
            stroke="#1B5E43"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="7 5"
          />
        )}

        {/* Origin pin */}
        <g transform={`translate(${originPos.x}, ${originPos.y})`}>
          <circle r="9" fill="#1C1B18" fillOpacity="0.16" />
          <circle r="5.5" fill="#1C1B18" stroke="#FFFFFF" strokeWidth="2" />
        </g>

        {/* Interactive Spot Markers */}
        {spots.map((spot) => {
          const pos = project(spot.lat, spot.lng);
          const isSelected = selectedSpot?.id === spot.id;
          const itineraryIdx = itinerarySpots.findIndex((s) => s.id === spot.id);
          const fillColor = isSelected
            ? '#B45309'
            : itineraryIdx >= 0
              ? '#1B5E43'
              : spot.source === 'student'
                ? '#0F766E'
                : '#2D4F3E';

          return (
            <g
              key={spot.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onClick={(e) => {
                if (pickCoordinateMode) return;
                e.stopPropagation();
                onSelectSpot(spot);
              }}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`在地圖選擇 ${spot.name}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectSpot(spot);
                }
              }}
            >
              {isSelected && <circle r="18" fill="#B45309" fillOpacity="0.18" />}
              <circle
                r={isSelected ? 11 : 8.5}
                fill={fillColor}
                stroke="#FFFFFF"
                strokeWidth="2.2"
              />
              {itineraryIdx >= 0 && (
                <text
                  textAnchor="middle"
                  dy="3.5"
                  fontSize="10"
                  fontWeight="700"
                  fill="#FFFFFF"
                >
                  {itineraryIdx + 1}
                </text>
              )}
              {(isSelected || itineraryIdx >= 0) && (
                <g transform="translate(0, -16)">
                  <rect
                    x="-62"
                    y="-17"
                    width="124"
                    height="18"
                    rx="4"
                    fill="#1C1B18"
                    fillOpacity="0.88"
                  />
                  <text
                    textAnchor="middle"
                    y="-5"
                    fontSize="10"
                    fill="#FFFFFF"
                    fontFamily="Noto Sans TC, sans-serif"
                  >
                    {spot.name.length > 10 ? `${spot.name.slice(0, 10)}…` : spot.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Quiet legend */}
      <div className="absolute bottom-3 right-3 bg-[#F8F7F3]/95 border border-[#D8D2C5] rounded-lg px-3 py-1.5 flex items-center gap-3 text-[11px] text-[#45423C]">
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3 h-3 text-[#0F766E]" aria-hidden="true" />
          學生匯入景點
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3 h-3 text-[#1B5E43]" aria-hidden="true" />
          推薦／動線站點
        </span>
        <span className="inline-flex items-center gap-1">
          <Navigation className="w-3 h-3 text-[#B45309]" aria-hidden="true" />
          目前選取
        </span>
      </div>
    </div>
  );
}

export function DongshanMapCanvas(props: DongshanMapCanvasProps) {
  const [mapsAuthFailed, setMapsAuthFailed] = useState(false);
  const isOnline = useOnlineStatus();

  if (GOOGLE_MAPS_API_KEY && !mapsAuthFailed && isOnline) {
    return (
      <APIProvider
        apiKey={GOOGLE_MAPS_API_KEY}
        language="zh-TW"
        region="TW"
        libraries={['marker', 'places', 'routes']}
      >
        <GoogleLiveMap {...props} onAuthFailure={() => setMapsAuthFailed(true)} />
      </APIProvider>
    );
  }

  return <SpatialDongshanMap {...props} />;
}
