import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Compass,
  Landmark,
  LocateFixed,
  MapPin,
  MessageSquarePlus,
  Minus,
  Moon,
  Mountain,
  Navigation,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Sprout,
  Sun,
  User,
  Utensils,
  Wheat,
} from 'lucide-react';
import type {
  ExplorerAvatarId,
  GuideCategory,
  GuideSpot,
  LatLngPoint,
  TravelerProfile,
} from '../types/guide';
import {
  ISLAND_CONNECTIONS,
  ISLAND_HEX_LAYOUTS,
  ISLAND_THEME_META,
  ISLAND_WORLD_HEIGHT,
  ISLAND_WORLD_WIDTH,
  clampIslandPoint,
  computeSpotIslandPositions,
  findNearestIslandSpot,
  getIslandLayout,
  latLngToIslandCoords,
  moveTowardsTarget,
  stepPlayerPosition,
  type IslandPoint,
} from '../utils/island';
import {
  IsometricHexIsland,
  IsometricSailboat,
  IsometricTravelerCharacter,
} from './IsometricIslandLandmarks';
import { SpotImage } from './SpotImage';

interface LearningIslandViewProps {
  spots: GuideSpot[];
  visitedSpotIds: string[];
  onToggleVisitSpot: (spotId: string) => void;
  profile: TravelerProfile;
  onUpdateProfile: (profile: TravelerProfile) => void;
  communityCountBySpot: Record<string, number>;
  onInspectSpotOnMap: (spot: GuideSpot) => void;
  onShareSpotReflection: (spot: GuideSpot) => void;
  initialTargetSpotId?: string | null;
  onClearInitialTarget?: () => void;
  onSwitchToImport?: () => void;
}

type SidebarTab = 'spots' | 'guide' | 'passport';

const AVATAR_OPTIONS: { id: ExplorerAvatarId; label: string; badge: string }[] = [
  { id: 'cyclist', label: '單車旅人', badge: '單車' },
  { id: 'ecologist', label: '生態觀察員', badge: '生態' },
  { id: 'historian', label: '古道行者', badge: '古道' },
];

function CategoryGlyph({
  category,
  className = 'w-4 h-4',
}: {
  category: GuideCategory;
  className?: string;
}) {
  switch (category) {
    case '人文':
      return <Compass className={className} aria-hidden="true" />;
    case '風景':
      return <Mountain className={className} aria-hidden="true" />;
    case '歷史':
      return <Landmark className={className} aria-hidden="true" />;
    case '產物':
      return <Wheat className={className} aria-hidden="true" />;
    case '農業':
      return <Sprout className={className} aria-hidden="true" />;
    case '美食':
      return <Utensils className={className} aria-hidden="true" />;
  }
}

export function LearningIslandView({
  spots,
  visitedSpotIds,
  onToggleVisitSpot,
  profile,
  onUpdateProfile,
  communityCountBySpot,
  onInspectSpotOnMap,
  onShareSpotReflection,
  initialTargetSpotId,
  onClearInitialTarget,
  onSwitchToImport,
}: LearningIslandViewProps) {
  const spotNodes = useMemo(() => computeSpotIslandPositions(spots), [spots]);
  const visitedSet = useMemo(() => new Set(visitedSpotIds), [visitedSpotIds]);

  const initialNode = useMemo(() => {
    if (initialTargetSpotId) {
      return spotNodes.find((n) => n.spot.id === initialTargetSpotId) ?? spotNodes[0];
    }
    return spotNodes[0];
  }, [initialTargetSpotId, spotNodes]);

  const [playerPos, setPlayerPos] = useState<IslandPoint>(() =>
    initialNode ? { x: initialNode.x, y: initialNode.y } : { x: 480, y: 290 }
  );
  const [targetPos, setTargetPos] = useState<IslandPoint | null>(null);
  const [facingRight, setFacingRight] = useState(true);
  const [activeCategory, setActiveCategory] = useState<GuideCategory>(
    () => initialNode?.spot.category ?? '人文'
  );
  const [selectedSpotId, setSelectedSpotId] = useState<string>(
    () => initialNode?.spot.id ?? spots[0]?.id ?? ''
  );
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('spots');
  const [spotSearch, setSpotSearch] = useState('');
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [showRoutes, setShowRoutes] = useState(true);
  const [isNight, setIsNight] = useState(false);

  // Stage pan & zoom camera state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    originPanX: 0,
    originPanY: 0,
  });

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Handle jump from Community / Map view directly to a target spot
  useEffect(() => {
    if (!initialTargetSpotId) return;
    const node = spotNodes.find((n) => n.spot.id === initialTargetSpotId);
    if (node) {
      setActiveCategory(node.spot.category);
      setSelectedSpotId(node.spot.id);
      setSidebarTab('spots');
      setTargetPos({ x: node.x, y: node.y });
      setFacingRight(node.x >= playerPos.x);
    }
    onClearInitialTarget?.();
  }, [initialTargetSpotId, spotNodes, onClearInitialTarget, playerPos.x]);

  // Smooth auto-walk loop
  useEffect(() => {
    if (!targetPos) return;
    const timer = window.setInterval(() => {
      setPlayerPos((prev) => {
        const { next, arrived } = moveTowardsTarget(prev, targetPos, 12);
        if (next.x !== prev.x) {
          setFacingRight(next.x >= prev.x);
        }
        if (arrived) {
          setTargetPos(null);
        }
        return next;
      });
    }, 34);
    return () => window.clearInterval(timer);
  }, [targetPos]);

  const nearestNode = useMemo(
    () => findNearestIslandSpot(playerPos, spotNodes, 56),
    [playerPos, spotNodes]
  );

  // Sync sidebar focus when traveler arrives near a spot
  useEffect(() => {
    if (nearestNode && !targetPos) {
      setSelectedSpotId(nearestNode.spot.id);
      setActiveCategory(nearestNode.spot.category);
    }
  }, [nearestNode, targetPos]);

  const moveByDelta = useCallback((dx: number, dy: number) => {
    setTargetPos(null);
    if (dx !== 0) setFacingRight(dx > 0);
    setPlayerPos((prev) => stepPlayerPosition(prev, dx, dy));
  }, []);

  // Keyboard navigation (WASD & Arrow keys)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const step = 22;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          moveByDelta(0, -step);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          moveByDelta(0, step);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          moveByDelta(-step, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          moveByDelta(step, 0);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moveByDelta]);

  const handleSelectIsland = (category: GuideCategory) => {
    const island = getIslandLayout(category);
    setActiveCategory(category);
    setSidebarTab('spots');
    setFacingRight(island.cx >= playerPos.x);
    setTargetPos({ x: island.cx, y: island.cy + 12 });
    const firstOnIsland = spotNodes.find((n) => n.island.category === category);
    if (firstOnIsland) {
      setSelectedSpotId(firstOnIsland.spot.id);
    }
  };

  const handleWalkToSpot = (spotId: string) => {
    const node = spotNodes.find((n) => n.spot.id === spotId);
    if (!node) return;
    setActiveCategory(node.spot.category);
    setSelectedSpotId(node.spot.id);
    setSidebarTab('spots');
    setFacingRight(node.x >= playerPos.x);
    setTargetPos({ x: node.x, y: node.y });
    setGpsStatus(`人物正前往「${node.spot.name}」（${node.island.category}島）`);
  };

  const handleStartExploreCta = () => {
    if (spots.length === 0) {
      onSwitchToImport?.();
      return;
    }
    const unvisitedNode = spotNodes.find((n) => !visitedSet.has(n.spot.id));
    const targetNode = unvisitedNode ?? spotNodes[0];
    if (targetNode) {
      handleWalkToSpot(targetNode.spot.id);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current.moved) return;
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * ISLAND_WORLD_WIDTH;
    const clickY = ((e.clientY - rect.top) / rect.height) * ISLAND_WORLD_HEIGHT;
    const clamped = clampIslandPoint({ x: clickX, y: clickY });
    setFacingRight(clamped.x >= playerPos.x);
    setTargetPos(clamped);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, a')) return;
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originPanX: pan.x,
      originPanY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 6) {
      dragRef.current.moved = true;
    }
    if (dragRef.current.moved) {
      setPan({
        x: Math.max(-220, Math.min(220, dragRef.current.originPanX + dx)),
        y: Math.max(-150, Math.min(150, dragRef.current.originPanY + dy)),
      });
    }
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
    window.setTimeout(() => {
      dragRef.current.moved = false;
    }, 50);
  };

  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 4) return;
    setZoom((prev) => {
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      return Number(Math.max(0.8, Math.min(1.6, prev + delta)).toFixed(2));
    });
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleSyncRealGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('此瀏覽器不支援 GPS 定位，您可直接使用方向鍵或點擊島嶼移動角色。');
      return;
    }
    setGpsStatus('正在同步真實 GPS 位置至學習島座標…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const realPoint: LatLngPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        const mapped = latLngToIslandCoords(realPoint);
        setTargetPos(mapped);
        setGpsStatus(
          `已依您的實境定位（${realPoint.lat.toFixed(4)}, ${realPoint.lng.toFixed(
            4
          )}）同步移動虛擬旅人位置。`
        );
      },
      () => {
        const stationNode = spotNodes.find((n) => n.spot.id === 'seed-station') ?? spotNodes[0];
        if (stationNode) {
          setActiveCategory(stationNode.spot.category);
          setSelectedSpotId(stationNode.spot.id);
          setTargetPos({ x: stationNode.x, y: stationNode.y });
        }
        setGpsStatus('未取得瀏覽器定位權限，已為您導引至「冬山火車站」人文島起點。');
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const selectedNode = useMemo(
    () =>
      spotNodes.find((n) => n.spot.id === selectedSpotId) ??
      spotNodes.find((n) => n.spot.category === activeCategory) ??
      spotNodes[0] ??
      null,
    [spotNodes, selectedSpotId, activeCategory]
  );

  const islandProgress = useMemo(() => {
    return ISLAND_HEX_LAYOUTS.map((island) => {
      const islandSpots = spotNodes.filter((n) => n.island.category === island.category);
      const checkedCount = islandSpots.filter((n) => visitedSet.has(n.spot.id)).length;
      return {
        ...island,
        total: islandSpots.length,
        checked: checkedCount,
        completed: islandSpots.length > 0 && checkedCount === islandSpots.length,
      };
    });
  }, [spotNodes, visitedSet]);

  const activeIslandIndex = Math.max(
    0,
    ISLAND_HEX_LAYOUTS.findIndex((isl) => isl.category === activeCategory)
  );
  const activeIslandLayout = ISLAND_HEX_LAYOUTS[activeIslandIndex] ?? ISLAND_HEX_LAYOUTS[0];
  const activeMeta = ISLAND_THEME_META[activeCategory];

  const sidebarSpots = useMemo(() => {
    const q = spotSearch.trim().toLowerCase();
    if (q) {
      return spotNodes.filter(
        (n) =>
          n.spot.name.toLowerCase().includes(q) ||
          n.spot.village.toLowerCase().includes(q) ||
          n.spot.summary.toLowerCase().includes(q) ||
          n.spot.category.toLowerCase().includes(q)
      );
    }
    return spotNodes.filter((n) => n.island.category === activeCategory);
  }, [spotNodes, activeCategory, spotSearch]);

  const litIslandsCount = islandProgress.filter((i) => i.checked > 0).length;
  const activeAvatar =
    AVATAR_OPTIONS.find((a) => a.id === profile.avatarId) ?? AVATAR_OPTIONS[0];

  return (
    <main className="flex-1 w-full flex flex-col lg:flex-row min-h-[calc(100vh-64px)] bg-[#FFF9F0]">
      {/* Left / Center Full-Bleed Isometric Archipelago Stage */}
      <section
        aria-label="冬山共學群島互動舞台"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheelZoom}
        className={`relative flex-1 flex flex-col justify-between min-h-[540px] sm:min-h-[640px] lg:min-h-[760px] overflow-hidden select-none transition-colors duration-300 ${
          isNight
            ? 'bg-[radial-gradient(circle_at_48%_44%,#1A3B4C_0%,#102735_58%,#081721_100%)]'
            : 'bg-[radial-gradient(circle_at_48%_44%,#EAF4F0_0%,#D2E6E2_56%,#BDD6D3_100%)]'
        }`}
      >
        {/* Top-Left Editorial Hero Overlay (flows cleanly on mobile, floats top-left on desktop) */}
        <div className="relative sm:absolute sm:top-8 sm:left-8 z-20 px-5 pt-5 pb-1 sm:p-0 max-w-full sm:max-w-[330px] pointer-events-none">
          <div
            className={`text-[11px] font-semibold tracking-[0.14em] uppercase mb-2 ${
              isNight ? 'text-[#89B6C9]' : 'text-[#5A7580]'
            }`}
          >
            A LITTLE WORLD OF DONGSHAN · 冬山共學群島
          </div>
          <h1
            className={`text-2xl sm:text-[38px] font-extrabold tracking-tight leading-[1.15] ${
              isNight ? 'text-[#F3F9FA]' : 'text-[#133F52]'
            }`}
          >
            帶著玩心，
            <br />
            一起登島冬山。
          </h1>
          <p
            className={`mt-2.5 text-xs sm:text-sm leading-relaxed ${
              isNight ? 'text-[#B8D0D9]' : 'text-[#4B6874]'
            }`}
          >
            一座島，一處風土故事。讓好奇心帶路，移動角色走訪冬山六大主題群島。
          </p>
          <div className="mt-4 pointer-events-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleStartExploreCta}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0079C6] hover:bg-[#0066A8] text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <span>{spots.length === 0 ? '前往學生匯入景點' : '開始探索'}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Top-Right Compact Progress Summary */}
        <div
          className={`hidden sm:flex items-center gap-2.5 absolute top-6 right-6 z-20 px-4 py-2 rounded-full border backdrop-blur-sm text-xs font-medium tabular-nums ${
            isNight
              ? 'bg-[#102937]/85 border-[#2B4E61] text-[#E6F2F5]'
              : 'bg-[#FFF9F0]/92 border-[#E6DEC9] text-[#133F52]'
          }`}
        >
          <span>
            {spots.length === 0
              ? '等待學生匯入景點'
              : `已打卡 ${visitedSpotIds.length} / ${spots.length} 景點`}
          </span>
          <span className="opacity-35" aria-hidden="true">
            |
          </span>
          <span>已點亮 {litIslandsCount} / 6 島</span>
        </div>

        {/* Interactive Isometric SVG Diorama with Pan & Zoom */}
        <div
          className="w-full flex-1 flex items-center justify-center px-2 sm:pl-20 sm:pr-6 pt-2 sm:pt-10 pb-4 sm:pb-28 cursor-grab active:cursor-grabbing"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: dragRef.current.active ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${ISLAND_WORLD_WIDTH} ${ISLAND_WORLD_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            onClick={handleCanvasClick}
            role="img"
            aria-label="冬山六大主題共學群島立體互動地圖，點擊小島、站點或使用鍵盤移動角色"
            className="w-full max-w-[940px] h-auto max-h-[600px] overflow-visible"
          >
            {/* Subtle Night Sky Starlight Dots */}
            {isNight && (
              <g pointerEvents="none" opacity="0.65">
                <circle cx="130" cy="70" r="1.5" fill="#FDE68A" />
                <circle cx="240" cy="48" r="1.2" fill="#E0F2FE" />
                <circle cx="520" cy="54" r="1.6" fill="#FDE68A" />
                <circle cx="790" cy="64" r="1.3" fill="#E0F2FE" />
                <circle cx="880" cy="140" r="1.5" fill="#FDE68A" />
                <circle cx="110" cy="460" r="1.2" fill="#E0F2FE" />
                <circle cx="860" cy="500" r="1.4" fill="#FDE68A" />
              </g>
            )}

            {/* Concentric Isometric Ocean Ripples around the Archipelago */}
            <g pointerEvents="none" opacity={isNight ? 0.16 : 0.48}>
              <ellipse
                cx="480"
                cy="335"
                rx="380"
                ry="215"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              <ellipse
                cx="480"
                cy="335"
                rx="330"
                ry="184"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                strokeDasharray="14 10"
              />
              <ellipse cx="145" cy="340" rx="34" ry="12" fill="none" stroke="#FFFFFF" strokeWidth="1.2" />
              <ellipse cx="820" cy="270" rx="28" ry="10" fill="none" stroke="#FFFFFF" strokeWidth="1.2" />
            </g>

            {/* Wooden Plank Footbridges Spanning Adjacent Islands */}
            {showRoutes &&
              ISLAND_CONNECTIONS.map(([fromCat, toCat]) => {
                const fromIsl = getIslandLayout(fromCat);
                const toIsl = getIslandLayout(toCat);
                const fromLit =
                  (islandProgress.find((i) => i.category === fromCat)?.checked ?? 0) > 0;
                const toLit =
                  (islandProgress.find((i) => i.category === toCat)?.checked ?? 0) > 0;
                const routeLit = fromLit && toLit;

                return (
                  <g key={`${fromCat}-${toCat}`} pointerEvents="none">
                    {/* Bridge shadow */}
                    <line
                      x1={fromIsl.cx}
                      y1={fromIsl.cy + 8}
                      x2={toIsl.cx}
                      y2={toIsl.cy + 8}
                      stroke="#133F52"
                      strokeWidth="10"
                      strokeLinecap="round"
                      opacity="0.14"
                    />
                    {/* Wooden bridge deck */}
                    <line
                      x1={fromIsl.cx}
                      y1={fromIsl.cy + 2}
                      x2={toIsl.cx}
                      y2={toIsl.cy + 2}
                      stroke={routeLit ? '#F4B41A' : isNight ? '#5A4A3A' : '#C9B18A'}
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    <line
                      x1={fromIsl.cx}
                      y1={fromIsl.cy + 2}
                      x2={toIsl.cx}
                      y2={toIsl.cy + 2}
                      stroke="#FFF9F0"
                      strokeWidth="2"
                      strokeDasharray="4 6"
                      opacity="0.7"
                    />
                  </g>
                );
              })}

            {/* Floating Sailboat on the Left Sea */}
            <IsometricSailboat x={135} y={325} isNight={isNight} />

            {/* 6 Clustered 3D Isometric Hexagonal Theme Islands (render top-to-bottom for clean depth overlap) */}
            {[...islandProgress]
              .sort((a, b) => a.cy - b.cy)
              .map((island) => (
                <IsometricHexIsland
                  key={island.category}
                  cx={island.cx}
                  cy={island.cy}
                  category={island.category}
                  surfaceTint={island.surfaceTint}
                  accentColor={island.accentColor}
                  isActive={activeCategory === island.category}
                  isLit={island.checked > 0}
                  isNight={isNight}
                  onSelect={() => handleSelectIsland(island.category)}
                />
              ))}

            {/* Spot Nodes Inside Islands */}
            {spotNodes.map((node) => {
              const isVisited = visitedSet.has(node.spot.id);
              const isSelected = selectedNode?.spot.id === node.spot.id;
              const isNear = nearestNode?.spot.id === node.spot.id;

              return (
                <g
                  key={node.spot.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWalkToSpot(node.spot.id);
                  }}
                  className="cursor-pointer"
                >
                  {(isSelected || isNear) && (
                    <circle
                      r="14"
                      fill="#0079C6"
                      opacity="0.22"
                    />
                  )}
                  <circle
                    r={isSelected ? 8.5 : 7}
                    fill={isVisited ? '#F4B41A' : isSelected ? '#0079C6' : '#FFF9F0'}
                    stroke={isSelected ? '#FFF9F0' : '#133F52'}
                    strokeWidth="2"
                  />
                  {isVisited && (
                    <circle r="2.6" fill="#133F52" pointerEvents="none" />
                  )}
                </g>
              );
            })}

            {/* Path Line from Traveler to Target */}
            {targetPos && (
              <g pointerEvents="none">
                <line
                  x1={playerPos.x}
                  y1={playerPos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke={isNight ? '#38BDF8' : '#0079C6'}
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.8"
                />
                <circle
                  cx={targetPos.x}
                  cy={targetPos.y}
                  r="5.5"
                  fill="none"
                  stroke={isNight ? '#38BDF8' : '#0079C6'}
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Floating Interactive Island Labels (Learn4C clean card badges) */}
            {islandProgress.map((island) => {
              const isActive = activeCategory === island.category;
              const labelText = `${island.category}島`;
              return (
                <g
                  key={`label-${island.category}`}
                  transform={`translate(${island.cx}, ${island.cy + 42})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectIsland(island.category);
                  }}
                  className="cursor-pointer"
                >
                  <rect
                    x="-42"
                    y="-12"
                    width="84"
                    height="24"
                    rx="7"
                    fill={isActive ? '#0079C6' : '#FFF9F0'}
                    fillOpacity={isActive ? 0.98 : 0.94}
                    stroke={isActive ? '#FFFFFF' : '#DED6C1'}
                    strokeWidth="1.2"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fontSize="11.5"
                    fontWeight="700"
                    fill={isActive ? '#FFFFFF' : '#133F52'}
                  >
                    {labelText}
                  </text>
                </g>
              );
            })}

            {/* Movable Isometric Explorer Character */}
            <IsometricTravelerCharacter
              x={playerPos.x}
              y={playerPos.y}
              facingRight={facingRight}
              avatarId={profile.avatarId}
              displayName={profile.displayName}
              isMoving={Boolean(targetPos)}
              isNight={isNight}
            />
          </svg>
        </div>

        {/* Bottom-Left Archipelago Signature */}
        <div
          className={`hidden md:flex items-center gap-2.5 absolute bottom-20 left-7 z-20 pointer-events-none ${
            isNight ? 'text-[#B8D0D9]' : 'text-[#4B6874]'
          }`}
        >
          <Compass className="w-5 h-5 opacity-75" aria-hidden="true" />
          <div className="leading-tight">
            <div className="text-xs font-semibold">冬山共學群島</div>
            <div className="text-[10px] tracking-[0.14em] uppercase opacity-75">
              THE DONGSHAN ARCHIPELAGO
            </div>
          </div>
        </div>

        {/* Bottom-Center Subtle Interaction Hint */}
        <div
          className={`hidden md:block absolute bottom-[102px] left-1/2 -translate-x-1/2 z-20 text-[11px] pointer-events-none whitespace-nowrap ${
            isNight ? 'text-[#A2C1CD]' : 'text-[#5A7580]'
          }`}
        >
          拖曳平移 · 滾動縮放 · WASD 移動人物 · 點小島探索
        </div>

        {/* Bottom-Right Vertical Zoom & Day/Night Stack */}
        <div
          className={`hidden sm:flex absolute bottom-20 right-6 z-20 flex-col rounded-xl border shadow-sm overflow-hidden ${
            isNight
              ? 'bg-[#102937]/95 border-[#2B4E61] text-[#E6F2F5]'
              : 'bg-[#FFF9F0]/95 border-[#E6DEC9] text-[#133F52]'
          }`}
        >
          <button
            type="button"
            aria-label="放大群島視角"
            onClick={() => setZoom((z) => Number(Math.min(1.6, z + 0.12).toFixed(2)))}
            className="w-10 h-10 flex items-center justify-center hover:bg-black/5 transition-colors border-b border-inherit"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="縮小群島視角"
            onClick={() => setZoom((z) => Number(Math.max(0.8, z - 0.12).toFixed(2)))}
            className="w-10 h-10 flex items-center justify-center hover:bg-black/5 transition-colors border-b border-inherit"
          >
            <Minus className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="重設群島視角"
            onClick={handleResetView}
            className="w-10 h-10 flex items-center justify-center hover:bg-black/5 transition-colors border-b border-inherit"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={isNight ? '切換為日間模式' : '切換為夜間模式'}
            onClick={() => setIsNight((v) => !v)}
            className="w-10 h-10 flex items-center justify-center hover:bg-black/5 transition-colors"
          >
            {isNight ? (
              <Sun className="w-4 h-4 text-[#FBBF24]" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Bottom Floating Island Dock (Matches Learn4C Island City) */}
        <nav
          aria-label="選擇冬山主題島嶼"
          className={`relative sm:absolute sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 mx-auto mb-3 sm:mb-0 z-20 max-w-[calc(100%-24px)] rounded-2xl border shadow-lg px-2.5 py-2 flex items-center gap-1.5 sm:gap-2 overflow-x-auto ${
            isNight
              ? 'bg-[#102937]/95 border-[#2B4E61]'
              : 'bg-[#FFF9F0]/95 border-[#E6DEC9]'
          }`}
        >
          {islandProgress.map((isl) => {
            const isActive = activeCategory === isl.category;
            const meta = ISLAND_THEME_META[isl.category];
            return (
              <button
                key={isl.category}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleSelectIsland(isl.category)}
                className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? isNight
                      ? 'bg-[#1B4257] ring-2 ring-[#38BDF8]'
                      : 'bg-[#E9F3FA] ring-2 ring-[#0079C6]'
                    : 'hover:bg-black/5'
                }`}
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: meta.dockBg, color: meta.dockText }}
                >
                  <CategoryGlyph category={isl.category} className="w-4 h-4" />
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    isActive
                      ? isNight
                        ? 'text-[#38BDF8]'
                        : 'text-[#0079C6]'
                      : isNight
                      ? 'text-[#D3E5EC]'
                      : 'text-[#133F52]'
                  }`}
                >
                  {isl.category}島
                </span>
              </button>
            );
          })}
        </nav>
      </section>

      {/* Right Warm Cream Companion Sidebar (Learn4C Island City Style) */}
      <aside
        aria-label="學習島導覽資訊側欄"
        className="w-full lg:w-[396px] xl:w-[420px] shrink-0 bg-[#FFF9F0] border-t lg:border-t-0 lg:border-l border-[#E6DEC9] flex flex-col lg:max-h-[820px]"
      >
        {/* Top Counter & Discovery Header */}
        <div className="px-6 pt-5 pb-4 space-y-4 border-b border-[#EDE6D4]">
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.14em] text-[#70858B] uppercase tabular-nums">
            <span>YOUR NEXT DISCOVERY</span>
            <span>0{activeIslandIndex + 1} / 06</span>
          </div>

          {/* Active Island Identity */}
          <div className="flex items-start gap-3.5">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
              style={{ backgroundColor: activeMeta.dockBg, color: activeMeta.dockText }}
            >
              <CategoryGlyph category={activeCategory} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#70858B]">
                {activeMeta.englishLabel}
              </div>
              <h2 className="text-xl font-extrabold text-[#133F52] leading-snug">
                {activeCategory}島 · {activeIslandLayout.subtitle.split('・')[0]}
              </h2>
            </div>
          </div>

          <p className="text-xs text-[#4B6874] leading-relaxed">{activeMeta.tagline}</p>

          {/* Traveler Identity Card (like Island Host card in reference) */}
          <div className="bg-[#F5EFE2] border border-[#E6DEC9] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#0079C6]/12 text-[#0079C6] flex items-center justify-center shrink-0">
                <User className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#133F52] truncate">
                  旅人 {profile.displayName || '冬山旅人'}
                </div>
                <div className="text-[11px] text-[#5A7580] truncate">
                  {activeAvatar.label} · 已走讀 {visitedSpotIds.length} 處
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarTab('guide')}
              className="text-xs font-semibold text-[#0079C6] hover:text-[#005B96] whitespace-nowrap shrink-0"
            >
              設定角色 &gt;
            </button>
          </div>

          {/* 3 Clean Underline Sub-Tabs */}
          <div
            role="tablist"
            aria-label="學習島功能分頁"
            className="flex items-center gap-5 pt-1 border-b border-[#E6DEC9] -mb-4"
          >
            <button
              type="button"
              role="tab"
              aria-selected={sidebarTab === 'spots'}
              onClick={() => setSidebarTab('spots')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                sidebarTab === 'spots'
                  ? 'border-[#0079C6] text-[#133F52]'
                  : 'border-transparent text-[#70858B] hover:text-[#133F52]'
              }`}
            >
              <span>島上景點</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#EFE7D4] text-[#133F52] tabular-nums">
                {sidebarSpots.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={sidebarTab === 'guide'}
              onClick={() => setSidebarTab('guide')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                sidebarTab === 'guide'
                  ? 'border-[#0079C6] text-[#133F52]'
                  : 'border-transparent text-[#70858B] hover:text-[#133F52]'
              }`}
            >
              角色與導覽
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={sidebarTab === 'passport'}
              onClick={() => setSidebarTab('passport')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
                sidebarTab === 'passport'
                  ? 'border-[#0079C6] text-[#133F52]'
                  : 'border-transparent text-[#70858B] hover:text-[#133F52]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span>學習護照</span>
            </button>
          </div>
        </div>

        {/* Scrollable Sidebar Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {gpsStatus && (
            <div
              role="status"
              className="bg-[#E9F3FA] border border-[#0079C6]/25 text-[#133F52] rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-2"
            >
              <span>{gpsStatus}</span>
              <button
                type="button"
                onClick={() => setGpsStatus(null)}
                className="text-[#0079C6] font-semibold shrink-0"
              >
                關閉
              </button>
            </div>
          )}

          {sidebarTab === 'spots' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search
                  className="w-3.5 h-3.5 text-[#70858B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="搜尋這座島的景點"
                  value={spotSearch}
                  onChange={(e) => setSpotSearch(e.target.value)}
                  placeholder="搜尋這座島或冬山景點…"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#E6DEC9] bg-[#F5EFE2] text-xs text-[#133F52] placeholder:text-[#70858B] focus:outline-none focus:border-[#0079C6]"
                />
              </div>

              {/* Active Spot Featured Card or Empty Prompt */}
              {spots.length === 0 ? (
                <div className="bg-white border border-[#E6DEC9] rounded-xl p-5 text-center space-y-3">
                  <div className="text-sm font-bold text-[#133F52]">
                    等待學生匯入導覽景點
                  </div>
                  <p className="text-xs text-[#4B6874] leading-relaxed">
                    目前學習島已清空，所有六大主題群島站點與導覽內容將在學生匯入踏查資料後自動產生。
                  </p>
                  {onSwitchToImport && (
                    <button
                      type="button"
                      onClick={onSwitchToImport}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0079C6] hover:bg-[#0066A8] text-white text-xs font-semibold transition-colors"
                    >
                      <span>前往學生匯入新增</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ) : selectedNode ? (
                <article className="bg-white border border-[#E6DEC9] rounded-xl overflow-hidden shadow-xs">
                  <div className="relative h-36 sm:h-40 bg-[#EFE7D4]">
                    <SpotImage
                      src={selectedNode.spot.imageUrl}
                      alt={selectedNode.spot.name}
                      category={selectedNode.spot.category}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#5A7580]">
                      <span className="font-semibold text-[#0079C6]">
                        {selectedNode.spot.category}島 · {selectedNode.spot.village}
                      </span>
                      {nearestNode?.spot.id === selectedNode.spot.id && (
                        <span className="font-semibold text-[#C2410C]">人物在此旁</span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-[#133F52] leading-snug">
                        {selectedNode.spot.name}
                      </h3>
                      <p className="mt-1 text-[11px] text-[#5A7580] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#0079C6] shrink-0" aria-hidden="true" />
                        <span className="truncate">{selectedNode.spot.address}</span>
                      </p>
                    </div>

                    <p className="text-xs text-[#314E5B] leading-relaxed line-clamp-3">
                      {selectedNode.spot.summary}
                    </p>

                    <div className="text-[11px] text-[#5A7580] pt-2 border-t border-[#F0EAE0] flex items-center justify-between tabular-nums">
                      <span>建議停留 {selectedNode.spot.stayMinutes} 分鐘</span>
                      <span>社群心得 {communityCountBySpot[selectedNode.spot.id] ?? 0} 則</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleWalkToSpot(selectedNode.spot.id)}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#DCD4C0] bg-[#FFF9F0] hover:border-[#0079C6] text-xs font-medium text-[#133F52] transition-colors whitespace-nowrap"
                      >
                        <Compass className="w-3.5 h-3.5 text-[#0079C6]" aria-hidden="true" />
                        <span>人物走去這裡</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleVisitSpot(selectedNode.spot.id)}
                        className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                          visitedSet.has(selectedNode.spot.id)
                            ? 'bg-[#F4B41A] text-[#133F52] hover:bg-[#E0A310]'
                            : 'bg-[#0079C6] text-white hover:bg-[#0066A8]'
                        }`}
                      >
                        {visitedSet.has(selectedNode.spot.id) ? (
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>
                          {visitedSet.has(selectedNode.spot.id) ? '已打卡點亮' : '點亮景點打卡'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onInspectSpotOnMap(selectedNode.spot)}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#DCD4C0] bg-white hover:border-[#0079C6] text-xs font-medium text-[#133F52] transition-colors whitespace-nowrap"
                      >
                        <Navigation className="w-3.5 h-3.5 text-[#0079C6]" aria-hidden="true" />
                        <span>實境地圖導航</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onShareSpotReflection(selectedNode.spot)}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#DCD4C0] bg-white hover:border-[#0079C6] text-xs font-medium text-[#133F52] transition-colors whitespace-nowrap"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5 text-[#C2410C]" aria-hidden="true" />
                        <span>分享走讀心得</span>
                      </button>
                    </div>
                  </div>
                </article>
              ) : null}

              {/* Island Spot List */}
              {spots.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-[#70858B]">
                    {spotSearch.trim() ? '搜尋結果' : `${activeCategory}島上的導覽站點`}
                  </div>
                  {sidebarSpots.length === 0 ? (
                    <p className="text-xs text-[#70858B] py-4 text-center">
                      找不到符合條件的景點，請更換關鍵字或切換其他島嶼。
                    </p>
                  ) : (
                    sidebarSpots.map((node) => {
                      const active = selectedNode?.spot.id === node.spot.id;
                      const visited = visitedSet.has(node.spot.id);
                      return (
                        <button
                          key={node.spot.id}
                          type="button"
                          onClick={() => handleWalkToSpot(node.spot.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-colors flex items-start justify-between gap-2.5 ${
                            active
                              ? 'bg-[#E9F3FA] border-[#0079C6]'
                              : 'bg-white border-[#E6DEC9] hover:border-[#0079C6]/60'
                          }`}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="text-[11px] text-[#5A7580]">
                              {node.spot.village} · {node.spot.authorName}
                            </div>
                            <div className="text-xs font-bold text-[#133F52] truncate">
                              {node.spot.name}
                            </div>
                          </div>
                          <span
                            className={`text-[11px] font-semibold shrink-0 ${
                              visited ? 'text-[#B45309]' : 'text-[#0079C6]'
                            }`}
                          >
                            {visited ? '已點亮' : '前往 →'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {sidebarTab === 'guide' && (
            <div className="space-y-4">
              {/* Nickname & Avatar Switcher */}
              <div className="bg-white border border-[#E6DEC9] rounded-xl p-4 space-y-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[#133F52]">旅人暱稱</span>
                  <input
                    type="text"
                    aria-label="旅人暱稱"
                    value={profile.displayName}
                    onChange={(e) =>
                      onUpdateProfile({ ...profile, displayName: e.target.value })
                    }
                    placeholder="輸入您的暱稱"
                    className="w-full px-3 py-2 rounded-lg border border-[#DCD4C0] bg-[#FFF9F0] text-xs text-[#133F52] focus:outline-none focus:border-[#0079C6]"
                  />
                </label>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-[#133F52]">角色造型</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {AVATAR_OPTIONS.map((opt) => {
                      const active = profile.avatarId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onUpdateProfile({ ...profile, avatarId: opt.id })}
                          className={`px-2 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                            active
                              ? 'bg-[#0079C6] border-[#0079C6] text-white'
                              : 'bg-[#FFF9F0] border-[#DCD4C0] text-[#133F52] hover:border-[#0079C6]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Touch / Mouse D-Pad & Route Controls */}
              <div className="bg-white border border-[#E6DEC9] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#133F52]">人物移動控制器</span>
                  <span className="text-[11px] text-[#70858B]">支援鍵盤 WASD / 方向鍵</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="grid grid-cols-3 gap-1.5 w-28">
                    <span />
                    <button
                      type="button"
                      aria-label="向上移動人物"
                      onClick={() => moveByDelta(0, -24)}
                      className="h-8 rounded-lg bg-[#FFF9F0] border border-[#DCD4C0] hover:border-[#0079C6] flex items-center justify-center text-[#133F52]"
                    >
                      <ArrowUp className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <span />
                    <button
                      type="button"
                      aria-label="向左移動人物"
                      onClick={() => moveByDelta(-24, 0)}
                      className="h-8 rounded-lg bg-[#FFF9F0] border border-[#DCD4C0] hover:border-[#0079C6] flex items-center justify-center text-[#133F52]"
                    >
                      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="向下移動人物"
                      onClick={() => moveByDelta(0, 24)}
                      className="h-8 rounded-lg bg-[#FFF9F0] border border-[#DCD4C0] hover:border-[#0079C6] flex items-center justify-center text-[#133F52]"
                    >
                      <ArrowDown className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="向右移動人物"
                      onClick={() => moveByDelta(24, 0)}
                      className="h-8 rounded-lg bg-[#FFF9F0] border border-[#DCD4C0] hover:border-[#0079C6] flex items-center justify-center text-[#133F52]"
                    >
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowRoutes((v) => !v)}
                      className={`w-full px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                        showRoutes
                          ? 'bg-[#E9F3FA] border-[#0079C6] text-[#0079C6]'
                          : 'bg-white border-[#DCD4C0] text-[#5A7580]'
                      }`}
                    >
                      {showRoutes ? '島際木橋：顯示中' : '島際木橋：已隱藏'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncRealGps}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0079C6] hover:bg-[#0066A8] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      <LocateFixed className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>同步真實 GPS 至學習島</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {sidebarTab === 'passport' && (
            <div className="bg-white border border-[#E6DEC9] rounded-xl p-4 space-y-4">
              <div className="space-y-1">
                <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#70858B]">
                  MY LEARNING PASSPORT
                </div>
                <h3 className="text-lg font-extrabold text-[#133F52]">
                  每一次好奇，都算數。
                </h3>
                <p className="text-xs text-[#4B6874] tabular-nums">
                  你已點亮 {litIslandsCount} / 6 座冬山主題島（完成 {visitedSpotIds.length} / {spots.length} 處景點）。
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {islandProgress.map((isl) => {
                  const meta = ISLAND_THEME_META[isl.category];
                  const lit = isl.checked > 0;
                  return (
                    <button
                      key={isl.category}
                      type="button"
                      onClick={() => handleSelectIsland(isl.category)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-colors ${
                        lit
                          ? 'bg-[#FFF9F0] border-solid border-[#0079C6] text-[#133F52]'
                          : 'bg-[#FAF6EC] border-dashed border-[#D3CBB5] text-[#70858B] hover:border-[#0079C6]'
                      }`}
                    >
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: lit ? meta.dockBg : '#E9E2D0',
                          color: lit ? meta.dockText : '#70858B',
                        }}
                      >
                        <CategoryGlyph category={isl.category} className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-semibold">{isl.category}島</span>
                      <span className="text-[10px] tabular-nums">
                        {isl.checked} / {isl.total}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-[#70858B]">
                探索打卡紀錄自動保存於此瀏覽器本機空間。
              </p>
            </div>
          )}
        </div>

        {/* Bottom Sidebar Sync Footer */}
        <div className="px-6 py-3 border-t border-[#EDE6D4] bg-[#F8F3E6] flex items-center justify-between text-[11px] text-[#5A7580] tabular-nums">
          <span>學生踏查群島資料已同步</span>
          <span>共 {spots.length} 處實境景點</span>
        </div>
      </aside>
    </main>
  );
}
