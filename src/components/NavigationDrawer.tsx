import { Bike, Bus, Car, ExternalLink, Footprints, LocateFixed, Navigation } from 'lucide-react';
import type { ComputedRouteInfo, GuideSpot, LatLngPoint, TravelMode } from '../types/guide';
import {
  buildGoogleMapsDirectionsUrl,
  formatDistance,
  formatDuration,
} from '../utils/geo';

interface NavigationDrawerProps {
  destination: GuideSpot;
  origin: LatLngPoint;
  originLabel: string;
  usingLiveGps: boolean;
  gpsLoading: boolean;
  gpsError: string | null;
  onUseGpsOrigin: () => void;
  onUseStationOrigin: () => void;
  travelMode: TravelMode;
  onChangeTravelMode: (mode: TravelMode) => void;
  routeActive: boolean;
  onToggleRoute: () => void;
  routeInfo: ComputedRouteInfo | null;
}

const TRAVEL_MODES: { id: TravelMode; label: string; icon: typeof Car }[] = [
  { id: 'DRIVING', label: '開車', icon: Car },
  { id: 'BICYCLING', label: '單車', icon: Bike },
  { id: 'WALKING', label: '步行', icon: Footprints },
  { id: 'TRANSIT', label: '大眾', icon: Bus },
];

export function NavigationDrawer({
  destination,
  origin,
  originLabel,
  usingLiveGps,
  gpsLoading,
  gpsError,
  onUseGpsOrigin,
  onUseStationOrigin,
  travelMode,
  onChangeTravelMode,
  routeActive,
  onToggleRoute,
  routeInfo,
}: NavigationDrawerProps) {
  const googleMapsUrl = buildGoogleMapsDirectionsUrl(
    origin,
    { lat: destination.lat, lng: destination.lng },
    travelMode
  );

  return (
    <section
      aria-label="即時導航規劃"
      className="border border-[#E2DDD2] rounded-xl bg-[#F8F7F3] p-4 space-y-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#1C1B18]">即時導航與路線規劃</h3>
        <span className="text-xs text-[#57544D] tabular-nums">
          {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
        </span>
      </div>

      {/* Origin Controls */}
      <div className="space-y-1.5">
        <div className="text-xs text-[#57544D]">出發起點：{originLabel}</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onUseGpsOrigin}
            disabled={gpsLoading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              usingLiveGps
                ? 'bg-[#1B5E43] text-white border-[#1B5E43]'
                : 'bg-white text-[#1C1B18] border-[#D8D2C5] hover:border-[#1B5E43]'
            }`}
          >
            <LocateFixed className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{gpsLoading ? '定位中…' : '使用 GPS 即時定位'}</span>
          </button>

          <button
            type="button"
            onClick={onUseStationOrigin}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              !usingLiveGps
                ? 'bg-[#EFECE4] text-[#1C1B18] border-[#C9C2B3]'
                : 'bg-white text-[#57544D] border-[#D8D2C5] hover:border-[#1B5E43]'
            }`}
          >
            冬山火車站出發
          </button>
        </div>
        {gpsError && <p className="text-xs text-[#9A3412]">{gpsError}</p>}
      </div>

      {/* Travel Mode Segmented Control */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-[#EFECE4] rounded-lg" role="group" aria-label="交通方式">
        {TRAVEL_MODES.map((mode) => {
          const Icon = mode.icon;
          const active = travelMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onChangeTravelMode(mode.id)}
              className={`inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-white text-[#1B5E43] shadow-xs font-semibold'
                  : 'text-[#57544D] hover:text-[#1C1B18]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleRoute}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#1B5E43] text-white text-xs sm:text-sm font-medium hover:bg-[#154A34] transition-colors whitespace-nowrap shrink-0"
        >
          <Navigation className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{routeActive ? '更新地圖路線' : '規劃並顯示路線'}</span>
        </button>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D8D2C5] bg-white text-[#1C1B18] text-xs sm:text-sm font-medium hover:border-[#1B5E43] hover:text-[#1B5E43] transition-colors whitespace-nowrap shrink-0"
        >
          <span>Google Maps 導航</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </a>
      </div>

      {/* Route Result */}
      {routeActive && routeInfo && (
        <div className="pt-2 border-t border-[#E2DDD2] space-y-2">
          <div className="flex items-baseline justify-between text-xs sm:text-sm">
            <span className="font-semibold text-[#1B5E43] tabular-nums">
              預估 {formatDuration(routeInfo.durationMillis / 60000)}
            </span>
            <span className="text-[#57544D] tabular-nums">
              距離 {formatDistance(routeInfo.distanceMeters)}
            </span>
          </div>

          {routeInfo.steps.length > 0 && (
            <ol className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs text-[#45423C]">
              {routeInfo.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="font-mono text-[11px] text-[#1B5E43] font-semibold tabular-nums mt-0.5">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 leading-relaxed">{step.instruction}</span>
                  {step.distanceText && (
                    <span className="text-[11px] text-[#57544D] tabular-nums shrink-0">
                      {step.distanceText}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
