import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Compass,
  HardDriveDownload,
  MapPinPlus,
  Search,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react';
import { CommunityView } from './components/CommunityView';
import { CultureChaptersView } from './components/CultureChaptersView';
import { DongshanMapCanvas } from './components/DongshanMapCanvas';
import { Header } from './components/Header';
import { LearningIslandView } from './components/LearningIslandView';
import { OfflineMapModal } from './components/OfflineMapModal';
import { RecommendationView } from './components/RecommendationView';
import { SpotDetailPanel } from './components/SpotDetailPanel';
import { SpotImage } from './components/SpotImage';
import { StudentImportView } from './components/StudentImportView';
import { SEED_COMMUNITY_POSTS } from './data/communitySeed';
import { DONGSHAN_HERO_IMAGE, SEED_DONGSHAN_SPOTS } from './data/dongshanSeed';
import { useOnlineStatus } from './hooks/usePWA';
import {
  GUIDE_CATEGORIES,
  type AppSection,
  type CommunityPost,
  type ComputedRouteInfo,
  type ExploreWorkbenchMode,
  type GuideCategory,
  type GuideSpot,
  type LatLngPoint,
  type RecommendationPreferences,
  type TravelMode,
  type TravelerProfile,
} from './types/guide';
import { appendPostComment, togglePostLike } from './utils/community';
import { DONGSHAN_STATION_ORIGIN, haversineDistanceKm } from './utils/geo';
import type { OfflineCacheMetadata } from './utils/offlinePack';
import {
  SEED_SPOT_RATINGS,
  getSpotRatingSummary,
  submitSpotRating,
  type SpotRatingsMap,
} from './utils/ratings';
import { buildRecommendedItinerary } from './utils/recommendations';

const STORAGE_KEY = 'dongshan_guide_spots_v2';
const VISITED_STORAGE_KEY = 'dongshan_visited_spots_v2';
const COMMUNITY_STORAGE_KEY = 'dongshan_community_posts_v1';
const PROFILE_STORAGE_KEY = 'dongshan_traveler_profile_v1';
const OFFLINE_META_STORAGE_KEY = 'dongshan_offline_cache_meta_v1';
const RATINGS_STORAGE_KEY = 'dongshan_spot_ratings_v1';

const DEFAULT_PROFILE: TravelerProfile = {
  displayName: '冬山旅人',
  groupLabel: '自由走讀',
  avatarId: 'cyclist',
};

function normalizeAsStudentSpot(spot: GuideSpot): GuideSpot {
  return {
    ...spot,
    source: 'student',
    authorName:
      spot.authorName && spot.authorName !== '教學示例小組'
        ? spot.authorName
        : '冬山學生踏查組',
    authorClass:
      spot.authorClass && spot.authorClass !== '示例踏查資料'
        ? spot.authorClass
        : '冬山國中（學生踏查匯入）',
  };
}

function loadInitialSpots(): GuideSpot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((s) => normalizeAsStudentSpot(s as GuideSpot));
    }
  } catch {
    // Ignore corrupt localStorage and start empty waiting for student imports
  }
  return [];
}

function loadJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [spots, setSpots] = useState<GuideSpot[]>(loadInitialSpots);
  const [activeSection, setActiveSection] = useState<AppSection>('explore');
  const [exploreMode, setExploreMode] = useState<ExploreWorkbenchMode>('map');

  // Learning Island & Community state (100% free local persistence)
  const [visitedSpotIds, setVisitedSpotIds] = useState<string[]>(() =>
    loadJsonStorage<string[]>(VISITED_STORAGE_KEY, [])
  );
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(() => {
    const loaded = loadJsonStorage<CommunityPost[]>(COMMUNITY_STORAGE_KEY, SEED_COMMUNITY_POSTS);
    return Array.isArray(loaded) && loaded.length > 0 ? loaded : SEED_COMMUNITY_POSTS;
  });
  const [travelerProfile, setTravelerProfile] = useState<TravelerProfile>(() =>
    loadJsonStorage<TravelerProfile>(PROFILE_STORAGE_KEY, DEFAULT_PROFILE)
  );
  const [islandTargetSpotId, setIslandTargetSpotId] = useState<string | null>(null);
  const [communityPreselectedSpotId, setCommunityPreselectedSpotId] = useState<string | null>(null);

  // Offline Map & Data Pack state
  const isOnline = useOnlineStatus();
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [offlineCacheMeta, setOfflineCacheMeta] = useState<OfflineCacheMetadata | null>(() =>
    loadJsonStorage<OfflineCacheMetadata | null>(OFFLINE_META_STORAGE_KEY, null)
  );
  const [spotRatings, setSpotRatings] = useState<SpotRatingsMap>(() => {
    const loaded = loadJsonStorage<SpotRatingsMap>(RATINGS_STORAGE_KEY, SEED_SPOT_RATINGS);
    return loaded && typeof loaded === 'object' && !Array.isArray(loaded)
      ? loaded
      : SEED_SPOT_RATINGS;
  });

  // Explorer filters
  const [selectedCategory, setSelectedCategory] = useState<GuideCategory | '全部'>('全部');
  const [searchQuery, setSearchQuery] = useState('');

  // Map & Navigation state
  const [selectedSpotId, setSelectedSpotId] = useState<string>(() => spots[0]?.id ?? '');
  const [origin, setOrigin] = useState<LatLngPoint>(DONGSHAN_STATION_ORIGIN);
  const [originLabel, setOriginLabel] = useState('冬山火車站（預設起點）');
  const [usingLiveGps, setUsingLiveGps] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>('DRIVING');
  const [routeActive, setRouteActive] = useState(false);
  const [routeInfo, setRouteInfo] = useState<ComputedRouteInfo | null>(null);

  // Custom / Recommended Itinerary multi-stop route
  const [itinerarySpotIds, setItinerarySpotIds] = useState<string[]>([]);

  // Coordinate picker bridge from StudentImportView -> Map
  const [pickCoordinateMode, setPickCoordinateMode] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<LatLngPoint | null>(null);

  // Recommendation preferences
  const [recPrefs, setRecPrefs] = useState<RecommendationPreferences>({
    theme: 'tea-eco',
    customCategories: ['風景', '農業', '產物'],
    timeOfDay: '下午',
    budgetMinutes: 240,
    travelMode: 'BICYCLING',
    preferStudentContent: true,
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(spots));
    } catch {
      // Ignore quota errors
    }
  }, [spots]);

  useEffect(() => {
    try {
      localStorage.setItem(VISITED_STORAGE_KEY, JSON.stringify(visitedSpotIds));
    } catch {
      // Ignore quota errors
    }
  }, [visitedSpotIds]);

  useEffect(() => {
    try {
      localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(communityPosts));
    } catch {
      // Ignore quota errors
    }
  }, [communityPosts]);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(travelerProfile));
    } catch {
      // Ignore quota errors
    }
  }, [travelerProfile]);

  useEffect(() => {
    try {
      if (offlineCacheMeta) {
        localStorage.setItem(OFFLINE_META_STORAGE_KEY, JSON.stringify(offlineCacheMeta));
      } else {
        localStorage.removeItem(OFFLINE_META_STORAGE_KEY);
      }
    } catch {
      // Ignore quota errors
    }
  }, [offlineCacheMeta]);

  useEffect(() => {
    try {
      localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(spotRatings));
    } catch {
      // Ignore quota errors
    }
  }, [spotRatings]);

  const filteredSpots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return spots.filter((spot) => {
      if (selectedCategory !== '全部' && spot.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        spot.name.toLowerCase().includes(q) ||
        spot.village.toLowerCase().includes(q) ||
        spot.summary.toLowerCase().includes(q) ||
        spot.authorName.toLowerCase().includes(q) ||
        spot.highlights.some((h) => h.toLowerCase().includes(q))
      );
    });
  }, [spots, selectedCategory, searchQuery]);

  const selectedSpot = useMemo(() => {
    return (
      filteredSpots.find((s) => s.id === selectedSpotId) ??
      spots.find((s) => s.id === selectedSpotId) ??
      filteredSpots[0] ??
      spots[0] ??
      null
    );
  }, [filteredSpots, spots, selectedSpotId]);

  const itinerarySpots = useMemo(() => {
    return itinerarySpotIds
      .map((id) => spots.find((s) => s.id === id))
      .filter((s): s is GuideSpot => Boolean(s));
  }, [itinerarySpotIds, spots]);

  const handleUseGpsOrigin = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('您的瀏覽器不支援 GPS 定位，維持使用預設起點。');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setOriginLabel('我的目前 GPS 位置');
        setUsingLiveGps(true);
        setGpsLoading(false);
        setRouteActive(true);
      },
      () => {
        setGpsLoading(false);
        setGpsError('無法取得裝置定位（請確認位置權限），目前已改用冬山火車站為起點。');
        setOrigin(DONGSHAN_STATION_ORIGIN);
        setOriginLabel('冬山火車站（預設起點）');
        setUsingLiveGps(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, []);

  const handleUseStationOrigin = useCallback(() => {
    setOrigin(DONGSHAN_STATION_ORIGIN);
    setOriginLabel('冬山火車站（預設起點）');
    setUsingLiveGps(false);
    setGpsError(null);
  }, []);

  const handleSetSpotAsOrigin = useCallback((spot: GuideSpot) => {
    setOrigin({ lat: spot.lat, lng: spot.lng });
    setOriginLabel(`${spot.name}`);
    setUsingLiveGps(false);
    setGpsError(null);
    setRouteActive(true);
  }, []);

  const handleToggleCustomRoute = useCallback((spot: GuideSpot) => {
    setItinerarySpotIds((prev) => {
      if (prev.includes(spot.id)) {
        return prev.filter((id) => id !== spot.id);
      }
      setRouteActive(true);
      return [...prev, spot.id];
    });
  }, []);

  const handleImportSpots = useCallback(
    (newSpots: GuideSpot[], mode: 'append' | 'replace-all') => {
      const normalized = newSpots.map(normalizeAsStudentSpot);
      setSpots((prev) => {
        if (mode === 'replace-all') {
          return normalized;
        }
        return [...normalized, ...prev];
      });
      if (normalized[0]) {
        setSelectedSpotId(normalized[0].id);
      }
    },
    []
  );

  const handleSaveSingleSpot = useCallback((spot: GuideSpot, isEdit: boolean) => {
    const normalized = normalizeAsStudentSpot(spot);
    setSpots((prev) => {
      if (isEdit) {
        return prev.map((item) => (item.id === normalized.id ? normalized : item));
      }
      return [normalized, ...prev];
    });
    setSelectedSpotId(normalized.id);
  }, []);

  const handleDeleteSpot = useCallback((id: string) => {
    setSpots((prev) => prev.filter((item) => item.id !== id));
    setItinerarySpotIds((prev) => prev.filter((item) => item !== id));
  }, []);

  const handleClearAllSpots = useCallback(() => {
    setSpots([]);
    setItinerarySpotIds([]);
    setVisitedSpotIds([]);
    setSelectedSpotId('');
  }, []);

  const handleResetToSeed = useCallback(() => {
    setSpots(SEED_DONGSHAN_SPOTS);
    setItinerarySpotIds([]);
    setSelectedSpotId(SEED_DONGSHAN_SPOTS[0]?.id ?? '');
  }, []);

  const handlePickCoordinate = useCallback((coords: LatLngPoint) => {
    setPickedCoords(coords);
    setPickCoordinateMode(false);
    setActiveSection('explore');
    setExploreMode('import');
  }, []);

  const handleApplyItineraryToMap = useCallback((stops: GuideSpot[], mode: TravelMode) => {
    setItinerarySpotIds(stops.map((s) => s.id));
    setTravelMode(mode);
    setRouteActive(true);
    if (stops[0]) {
      setSelectedSpotId(stops[0].id);
    }
    setActiveSection('explore');
    setExploreMode('map');
  }, []);

  const handleInspectSpotOnMap = useCallback((spot: GuideSpot) => {
    setSelectedCategory('全部');
    setSearchQuery('');
    setSelectedSpotId(spot.id);
    setRouteActive(true);
    setActiveSection('explore');
    setExploreMode('map');
  }, []);

  const handleExploreCategory = useCallback((category: GuideCategory) => {
    setSelectedCategory(category);
    setSearchQuery('');
    setActiveSection('explore');
    setExploreMode('map');
  }, []);

  const handleNavigateHeader = useCallback(
    (section: AppSection, mode?: ExploreWorkbenchMode) => {
      setActiveSection(section);
      if (section === 'explore' && mode) {
        setExploreMode(mode);
        if (mode !== 'import') {
          setPickCoordinateMode(false);
        }
      }
    },
    []
  );

  const handleToggleVisitSpot = useCallback((spotId: string) => {
    setVisitedSpotIds((prev) =>
      prev.includes(spotId) ? prev.filter((id) => id !== spotId) : [...prev, spotId]
    );
  }, []);

  const handleWalkToSpotOnIsland = useCallback((spot: GuideSpot) => {
    setIslandTargetSpotId(spot.id);
    setActiveSection('island');
  }, []);

  const handleShareSpotReflection = useCallback((spot: GuideSpot) => {
    setCommunityPreselectedSpotId(spot.id);
    setActiveSection('community');
  }, []);

  const handleAddCommunityPost = useCallback((post: CommunityPost) => {
    setCommunityPosts((prev) => [post, ...prev]);
    setTravelerProfile((prev) => ({
      ...prev,
      displayName: post.authorName,
      groupLabel: post.authorGroup,
    }));
  }, []);

  const handleToggleCommunityLike = useCallback((postId: string) => {
    setCommunityPosts((prev) => togglePostLike(prev, postId));
  }, []);

  const handleAddCommunityComment = useCallback(
    (postId: string, authorName: string, content: string) => {
      setCommunityPosts((prev) => appendPostComment(prev, postId, authorName, content));
    },
    []
  );

  const handleDeleteCommunityPost = useCallback((postId: string) => {
    setCommunityPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const handleRateSpot = useCallback((spotId: string, stars: number) => {
    setSpotRatings((prev) => submitSpotRating(prev, spotId, stars));
  }, []);

  const communityCountBySpot = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const post of communityPosts) {
      counts[post.spotId] = (counts[post.spotId] ?? 0) + 1;
    }
    return counts;
  }, [communityPosts]);

  const recommendedPreviewStops = useMemo(
    () => buildRecommendedItinerary(spots, recPrefs, origin).stops.map((s) => s.spot),
    [spots, recPrefs, origin]
  );

  const activeMapItinerary =
    exploreMode === 'recommend' ? recommendedPreviewStops : itinerarySpots;
  const activeMapTravelMode =
    exploreMode === 'recommend' ? recPrefs.travelMode : travelMode;
  const activeMapRouteVisible =
    exploreMode === 'recommend' ? recommendedPreviewStops.length > 0 : routeActive;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F3] text-[#1C1B18]">
      <Header
        activeSection={activeSection}
        exploreMode={exploreMode}
        onNavigate={handleNavigateHeader}
      />

      {!isOnline && (
        <div
          role="status"
          className="bg-[#FDF5E6] border-b border-[#F3D5A5] px-4 py-2 text-xs text-[#78350F] flex items-center justify-center gap-2"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>
            目前處於離線狀態，系統已自動切換至本機已快取景點與冬山離線地圖。
          </span>
          <button
            type="button"
            onClick={() => setOfflineModalOpen(true)}
            className="underline font-semibold whitespace-nowrap"
          >
            開啟離線資料包
          </button>
        </div>
      )}

      {activeSection === 'explore' && (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          {/* Compact Editorial Masthead Strip */}
          <section className="bg-white border border-[#E2DDD2] rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="text-xs font-medium text-[#1B5E43]">
                  地圖導覽 × 智慧推薦 × 學生匯入 · 宜蘭縣冬山鄉六大主題
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#1C1B18] leading-tight">
                  山海川流之間，由學生踏查共創的冬山導覽
                </h1>
                <p className="text-xs sm:text-sm text-[#57544D] leading-relaxed max-w-2xl">
                  本導覽誌結合地圖即時導航、智慧行程推薦與學生田野踏查匯入；所有導覽景點皆由學生匯入建置，點選地圖即可檢視評分、路線並隨時編修新增。
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#57544D] pt-2 border-t border-[#ECE8DE] tabular-nums">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span>學生匯入景點 {spots.length} 處</span>
                  <span aria-hidden="true">·</span>
                  <span>社群走讀 {communityPosts.length} 則</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOfflineModalOpen(true)}
                    className="font-medium text-[#1B5E43] hover:underline whitespace-nowrap shrink-0"
                  >
                    {offlineCacheMeta ? '已就緒：離線地圖管理 →' : '下載離線地圖快照 →'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('island')}
                    className="font-medium text-[#9A3412] hover:underline whitespace-nowrap shrink-0"
                  >
                    進入冬山學習島 →
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative min-h-[175px] lg:min-h-[205px] bg-[#EFECE4]">
              <img
                src={DONGSHAN_HERO_IMAGE}
                alt="冬山河生態綠舟與蘭陽群山風景"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent"
              />
              <div className="absolute bottom-3 left-4 right-4 text-white text-xs">
                冬山河流域與生態綠舟 · 學生田野踏查共創地圖
              </div>
            </div>
          </section>

          {/* Unified Feature Mode Switcher + Offline Action */}
          <section
            aria-label="導覽整合功能切換"
            className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-white border border-[#E2DDD2] rounded-xl p-2.5 sm:px-4"
          >
            <div
              role="tablist"
              aria-label="地圖導覽與推薦匯入功能"
              className="flex flex-wrap items-center gap-1.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={exploreMode === 'map'}
                onClick={() => {
                  setExploreMode('map');
                  setPickCoordinateMode(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  exploreMode === 'map'
                    ? 'bg-[#1B5E43] text-white font-semibold'
                    : 'bg-[#F8F7F3] text-[#57544D] hover:text-[#1C1B18]'
                }`}
              >
                <Compass className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>地圖導覽與評分</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={exploreMode === 'recommend'}
                onClick={() => {
                  setExploreMode('recommend');
                  setPickCoordinateMode(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  exploreMode === 'recommend'
                    ? 'bg-[#1B5E43] text-white font-semibold'
                    : 'bg-[#F8F7F3] text-[#57544D] hover:text-[#1C1B18]'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>智慧景點推薦</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={exploreMode === 'import'}
                onClick={() => setExploreMode('import')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  exploreMode === 'import'
                    ? 'bg-[#1B5E43] text-white font-semibold'
                    : 'bg-[#F8F7F3] text-[#57544D] hover:text-[#1C1B18]'
                }`}
              >
                <MapPinPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>學生匯入內容（{spots.length}）</span>
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setOfflineModalOpen(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  offlineCacheMeta
                    ? 'bg-[#EAF4EF] border-[#1B5E43] text-[#1B5E43]'
                    : 'bg-[#F8F7F3] border-[#D8D2C5] text-[#1C1B18] hover:border-[#1B5E43]'
                }`}
              >
                <HardDriveDownload className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{offlineCacheMeta ? '離線地圖（已快取）' : '離線地圖'}</span>
              </button>
            </div>
          </section>

          {/* Category Filter & Search Toolbar (for Map & Recommendation modes) */}
          {exploreMode !== 'import' && (
            <section
              aria-label="導覽分類篩選與搜尋"
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"
            >
              <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EFECE4] rounded-lg">
                {(['全部', ...GUIDE_CATEGORIES] as const).map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-white text-[#1B5E43] shadow-xs font-semibold'
                          : 'text-[#57544D] hover:text-[#1C1B18]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-72">
                <Search
                  className="w-4 h-4 text-[#57544D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="搜尋學生匯入景點名稱、村落或作者"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋學生匯入景點、村落或作者…"
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#D8D2C5] bg-white text-xs sm:text-sm text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
                />
              </div>
            </section>
          )}

          {/* Coordinate picker banner if active inside unified explore */}
          {pickCoordinateMode && (
            <div className="bg-[#1B5E43] text-white rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
              <span>目前處於「選取景點座標模式」，請直接點擊右側地圖任意位置填入經緯度。</span>
              <button
                type="button"
                onClick={() => setPickCoordinateMode(false)}
                className="px-3 py-1 rounded-md bg-white/15 hover:bg-white/25 text-xs font-medium whitespace-nowrap shrink-0"
              >
                結束點選座標
              </button>
            </div>
          )}

          {/* Active Multi-Stop Itinerary Strip (Map Mode) */}
          {exploreMode === 'map' && itinerarySpots.length > 0 && (
            <div className="bg-white border border-[#E2DDD2] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-[#1B5E43]">目前動線（{itinerarySpots.length} 站）：</span>
                {itinerarySpots.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSpotId(s.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#F8F7F3] border border-[#E2DDD2] text-[#1C1B18] hover:border-[#1B5E43]"
                  >
                    <span className="font-mono text-[#1B5E43] font-semibold">{idx + 1}.</span>
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setItinerarySpotIds([])}
                className="inline-flex items-center gap-1 text-xs text-[#57544D] hover:text-[#9A3412] whitespace-nowrap shrink-0"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                <span>清除動線</span>
              </button>
            </div>
          )}

          {/* WORKBENCH MODE 1: Map Explorer + Spot Detail + Rating */}
          {exploreMode === 'map' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Spot List (Left) */}
              <aside
                aria-label="景點清單"
                className="lg:col-span-3 space-y-2.5 lg:max-h-[760px] lg:overflow-y-auto pr-0.5"
              >
                {spots.length === 0 ? (
                  <div className="bg-white border border-[#E2DDD2] rounded-xl p-6 text-center space-y-3">
                    <p className="text-sm text-[#57544D]">目前尚未匯入任何學生導覽景點</p>
                    <button
                      type="button"
                      onClick={() => setExploreMode('import')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1B5E43] text-white text-xs font-medium hover:bg-[#154A34]"
                    >
                      <MapPinPlus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>前往學生匯入新增</span>
                    </button>
                  </div>
                ) : filteredSpots.length === 0 ? (
                  <div className="bg-white border border-[#E2DDD2] rounded-xl p-6 text-center space-y-2">
                    <p className="text-sm text-[#57544D]">沒有符合條件的導覽景點</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('全部');
                        setSearchQuery('');
                      }}
                      className="text-xs font-medium text-[#1B5E43] hover:underline"
                    >
                      重設篩選條件
                    </button>
                  </div>
                ) : (
                  filteredSpots.map((spot) => {
                    const isSelected = selectedSpot?.id === spot.id;
                    const distKm = haversineDistanceKm(origin, { lat: spot.lat, lng: spot.lng });
                    return (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => setSelectedSpotId(spot.id)}
                        className={`w-full text-left rounded-xl border p-3.5 transition-colors flex gap-3 ${
                          isSelected
                            ? 'bg-white border-[#1B5E43] ring-1 ring-[#1B5E43]'
                            : 'bg-white border-[#E2DDD2] hover:border-[#1B5E43]/60'
                        }`}
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-[#EFECE4]">
                          <SpotImage
                            src={spot.imageUrl}
                            alt={spot.name}
                            category={spot.category}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2 text-[11px] text-[#57544D] tabular-nums">
                            <span className="font-semibold text-[#1B5E43]">{spot.category}</span>
                            <span>{distKm.toFixed(1)} km</span>
                          </div>
                          <div className="text-sm font-semibold text-[#1C1B18] truncate">
                            {spot.name}
                          </div>
                          <div className="text-xs text-[#57544D] truncate">
                            {spot.village} · {spot.authorName}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </aside>

              {/* Interactive Map (Center) */}
              <section
                aria-label="冬山鄉互動地圖"
                className="lg:col-span-5 bg-white border border-[#E2DDD2] rounded-xl overflow-hidden h-[460px] lg:h-[760px] flex flex-col"
              >
                <DongshanMapCanvas
                  spots={filteredSpots}
                  selectedSpot={selectedSpot}
                  onSelectSpot={(spot) => {
                    setSelectedSpotId(spot.id);
                  }}
                  origin={origin}
                  travelMode={activeMapTravelMode}
                  routeActive={activeMapRouteVisible}
                  itinerarySpots={activeMapItinerary}
                  onRouteComputed={setRouteInfo}
                  pickCoordinateMode={pickCoordinateMode}
                  onPickCoordinate={handlePickCoordinate}
                  onRequestUserLocation={handleUseGpsOrigin}
                />
              </section>

              {/* Spot Detail, Rating & Live Navigation (Right) */}
              <section aria-label="景點詳情與即時導航" className="lg:col-span-4">
                {selectedSpot ? (
                  <SpotDetailPanel
                    spot={selectedSpot}
                    origin={origin}
                    originLabel={originLabel}
                    usingLiveGps={usingLiveGps}
                    gpsLoading={gpsLoading}
                    gpsError={gpsError}
                    onUseGpsOrigin={handleUseGpsOrigin}
                    onUseStationOrigin={handleUseStationOrigin}
                    travelMode={travelMode}
                    onChangeTravelMode={(mode) => {
                      setTravelMode(mode);
                      setRouteActive(true);
                    }}
                    routeActive={routeActive}
                    onToggleRoute={() => setRouteActive(true)}
                    routeInfo={routeInfo}
                    onSetAsOrigin={handleSetSpotAsOrigin}
                    inCustomRoute={itinerarySpotIds.includes(selectedSpot.id)}
                    onToggleCustomRoute={handleToggleCustomRoute}
                    communityPostCount={communityCountBySpot[selectedSpot.id] ?? 0}
                    ratingSummary={getSpotRatingSummary(spotRatings, selectedSpot.id)}
                    onRateSpot={handleRateSpot}
                    onWalkOnIsland={handleWalkToSpotOnIsland}
                    onShareReflection={handleShareSpotReflection}
                  />
                ) : (
                  <div className="bg-white border border-[#E2DDD2] rounded-xl p-8 text-center text-sm text-[#57544D] space-y-3">
                    <p>
                      {spots.length === 0
                        ? '目前地圖導覽與景點詳情尚未載入內容，等待學生匯入景點資料後將立即產生。'
                        : '請點選左側清單或地圖標記以檢視景點評分與導航規劃。'}
                    </p>
                    {spots.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setExploreMode('import')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1B5E43] text-white text-xs font-medium hover:bg-[#154A34] transition-colors"
                      >
                        <MapPinPlus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>前往學生匯入新增</span>
                      </button>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* WORKBENCH MODE 2: Smart Recommendation + Live Synced Map */}
          {exploreMode === 'recommend' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7">
                <RecommendationView
                  spots={filteredSpots}
                  origin={origin}
                  originLabel={originLabel}
                  prefs={recPrefs}
                  onChangePrefs={setRecPrefs}
                  onApplyItineraryToMap={handleApplyItineraryToMap}
                  onInspectSpotOnMap={handleInspectSpotOnMap}
                  onSwitchToImport={() => setExploreMode('import')}
                />
              </div>

              <aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
                <section
                  aria-label="推薦路線即時地圖預覽"
                  className="bg-white border border-[#E2DDD2] rounded-xl overflow-hidden h-[420px] lg:h-[520px] flex flex-col"
                >
                  <DongshanMapCanvas
                    spots={filteredSpots}
                    selectedSpot={selectedSpot}
                    onSelectSpot={(spot) => {
                      setSelectedSpotId(spot.id);
                    }}
                    origin={origin}
                    travelMode={activeMapTravelMode}
                    routeActive={activeMapRouteVisible}
                    itinerarySpots={activeMapItinerary}
                    onRouteComputed={setRouteInfo}
                    pickCoordinateMode={false}
                    onPickCoordinate={handlePickCoordinate}
                    onRequestUserLocation={handleUseGpsOrigin}
                  />
                </section>

                {selectedSpot && (
                  <div className="bg-white border border-[#E2DDD2] rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] text-[#1B5E43] font-semibold">
                        目前預覽站點 · {selectedSpot.category} · {selectedSpot.authorName}
                      </div>
                      <div className="text-sm font-semibold text-[#1C1B18] truncate">
                        {selectedSpot.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInspectSpotOnMap(selectedSpot)}
                      className="px-3 py-1.5 rounded-lg bg-[#1B5E43] text-white text-xs font-medium hover:bg-[#154A34] whitespace-nowrap shrink-0"
                    >
                      開啟評分與導航
                    </button>
                  </div>
                )}
              </aside>
            </div>
          )}

          {/* WORKBENCH MODE 3: Student Content Import + Optional In-Place Coordinate Picker Map */}
          {exploreMode === 'import' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className={pickCoordinateMode ? 'lg:col-span-7' : 'lg:col-span-12'}>
                <StudentImportView
                  spots={spots}
                  onImportSpots={handleImportSpots}
                  onSaveSingleSpot={handleSaveSingleSpot}
                  onDeleteSpot={handleDeleteSpot}
                  onClearAllSpots={handleClearAllSpots}
                  onResetToSeed={handleResetToSeed}
                  pickCoordinateMode={pickCoordinateMode}
                  onRequestMapPick={() => setPickCoordinateMode((prev) => !prev)}
                  pickedCoords={pickedCoords}
                  onClearPickedCoords={() => setPickedCoords(null)}
                  onViewOnMap={() => {
                    setPickCoordinateMode(false);
                    setExploreMode('map');
                  }}
                />
              </div>

              {pickCoordinateMode && (
                <section
                  aria-label="學生匯入地圖座標點選區"
                  className="lg:col-span-5 bg-white border-2 border-[#1B5E43] rounded-xl overflow-hidden h-[440px] lg:h-[640px] flex flex-col lg:sticky lg:top-20"
                >
                  <DongshanMapCanvas
                    spots={spots}
                    selectedSpot={selectedSpot}
                    onSelectSpot={(spot) => setSelectedSpotId(spot.id)}
                    origin={origin}
                    travelMode={travelMode}
                    routeActive={false}
                    itinerarySpots={[]}
                    onRouteComputed={setRouteInfo}
                    pickCoordinateMode={true}
                    onPickCoordinate={handlePickCoordinate}
                    onRequestUserLocation={handleUseGpsOrigin}
                  />
                </section>
              )}
            </div>
          )}
        </main>
      )}

      {activeSection === 'island' && (
        <LearningIslandView
          spots={spots}
          visitedSpotIds={visitedSpotIds}
          onToggleVisitSpot={handleToggleVisitSpot}
          profile={travelerProfile}
          onUpdateProfile={setTravelerProfile}
          communityCountBySpot={communityCountBySpot}
          onInspectSpotOnMap={handleInspectSpotOnMap}
          onShareSpotReflection={handleShareSpotReflection}
          initialTargetSpotId={islandTargetSpotId}
          onClearInitialTarget={() => setIslandTargetSpotId(null)}
          onSwitchToImport={() => {
            setActiveSection('explore');
            setExploreMode('import');
          }}
        />
      )}

      {activeSection === 'community' && (
        <CommunityView
          spots={spots}
          posts={communityPosts}
          profile={travelerProfile}
          onAddPost={handleAddCommunityPost}
          onToggleLike={handleToggleCommunityLike}
          onAddComment={handleAddCommunityComment}
          onDeletePost={handleDeleteCommunityPost}
          onInspectSpotOnMap={handleInspectSpotOnMap}
          onWalkToSpotOnIsland={handleWalkToSpotOnIsland}
          preselectedSpotId={communityPreselectedSpotId}
          onClearPreselectedSpot={() => setCommunityPreselectedSpotId(null)}
        />
      )}

      {activeSection === 'culture' && (
        <CultureChaptersView spots={spots} onExploreCategory={handleExploreCategory} />
      )}

      <footer className="mt-auto border-t border-[#E2DDD2] bg-[#F8F7F3] py-6">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#57544D]">
          <span>冬山鄉導覽誌 · 學生踏查共創地圖、智慧推薦、學習島探索與即時導航</span>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => handleNavigateHeader('explore', 'map')}
              className="hover:text-[#1C1B18]"
            >
              地圖導覽與推薦
            </button>
            <button
              type="button"
              onClick={() => handleNavigateHeader('explore', 'import')}
              className="hover:text-[#1C1B18]"
            >
              學生匯入
            </button>
            <button
              type="button"
              onClick={() => handleNavigateHeader('island')}
              className="hover:text-[#1C1B18]"
            >
              學習島
            </button>
            <button
              type="button"
              onClick={() => handleNavigateHeader('community')}
              className="hover:text-[#1C1B18]"
            >
              社群互動
            </button>
            <button
              type="button"
              onClick={() => handleNavigateHeader('culture')}
              className="hover:text-[#1C1B18]"
            >
              文化故事
            </button>
            <button
              type="button"
              onClick={() => setOfflineModalOpen(true)}
              className="hover:text-[#1C1B18]"
            >
              離線地圖
            </button>
          </div>
        </div>
      </footer>

      <OfflineMapModal
        isOpen={offlineModalOpen}
        onClose={() => setOfflineModalOpen(false)}
        spots={spots}
        origin={origin}
        cacheMeta={offlineCacheMeta}
        onUpdateCacheMeta={setOfflineCacheMeta}
      />
    </div>
  );
}
