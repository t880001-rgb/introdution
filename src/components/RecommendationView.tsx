import { ExternalLink, MapPin, MapPinPlus, Navigation } from 'lucide-react';
import {
  GUIDE_CATEGORIES,
  type GuideCategory,
  type GuideSpot,
  type LatLngPoint,
  type RecommendationPreferences,
  type TimeOfDay,
  type TravelMode,
} from '../types/guide';
import {
  buildGoogleMapsDirectionsUrl,
  formatDuration,
} from '../utils/geo';
import {
  RECOMMENDATION_THEMES,
  buildRecommendedItinerary,
  rankSpotsForRecommendation,
} from '../utils/recommendations';
import { SpotImage } from './SpotImage';

interface RecommendationViewProps {
  spots: GuideSpot[];
  origin: LatLngPoint;
  originLabel: string;
  prefs: RecommendationPreferences;
  onChangePrefs: (next: RecommendationPreferences) => void;
  onApplyItineraryToMap: (stops: GuideSpot[], mode: TravelMode) => void;
  onInspectSpotOnMap: (spot: GuideSpot) => void;
  onSwitchToImport?: () => void;
}

const TIME_OPTIONS: TimeOfDay[] = ['上午', '下午', '傍晚', '全日'];
const BUDGET_OPTIONS = [
  { minutes: 120, label: '2 小時輕旅' },
  { minutes: 240, label: '4 小時半日遊' },
  { minutes: 420, label: '7 小時深度遊' },
];
const MODE_OPTIONS: { id: TravelMode; label: string }[] = [
  { id: 'DRIVING', label: '開車' },
  { id: 'BICYCLING', label: '單車' },
  { id: 'WALKING', label: '步行' },
  { id: 'TRANSIT', label: '大眾運輸' },
];

export function RecommendationView({
  spots,
  origin,
  originLabel,
  prefs,
  onChangePrefs,
  onApplyItineraryToMap,
  onInspectSpotOnMap,
  onSwitchToImport,
}: RecommendationViewProps) {
  const itinerary = buildRecommendedItinerary(spots, prefs, origin);
  const ranked = rankSpotsForRecommendation(spots, prefs, origin);

  const toggleCustomCategory = (cat: GuideCategory) => {
    const exists = prefs.customCategories.includes(cat);
    const nextCats = exists
      ? prefs.customCategories.filter((c) => c !== cat)
      : [...prefs.customCategories, cat];
    onChangePrefs({ ...prefs, theme: 'custom', customCategories: nextCats });
  };

  const multiStopMapsUrl =
    itinerary.stops.length > 0
      ? buildGoogleMapsDirectionsUrl(
          origin,
          {
            lat: itinerary.stops[itinerary.stops.length - 1].spot.lat,
            lng: itinerary.stops[itinerary.stops.length - 1].spot.lng,
          },
          prefs.travelMode,
          itinerary.stops
            .slice(0, -1)
            .map((stop) => ({ lat: stop.spot.lat, lng: stop.spot.lng }))
        )
      : null;

  if (spots.length === 0) {
    return (
      <section
        aria-label="智慧景點推薦空白提示"
        className="bg-white border border-[#E2DDD2] rounded-xl p-8 text-center space-y-3"
      >
        <h2 className="text-lg font-semibold text-[#1C1B18]">目前尚未匯入學生導覽景點</h2>
        <p className="text-sm text-[#57544D] max-w-md mx-auto">
          本導覽誌所有推薦內容皆來自學生田野踏查匯入資料，請先透過學生匯入建置或載入景點資料。
        </p>
        {onSwitchToImport && (
          <button
            type="button"
            onClick={onSwitchToImport}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1B5E43] text-white text-xs sm:text-sm font-medium hover:bg-[#154A34] transition-colors"
          >
            <MapPinPlus className="w-4 h-4" aria-hidden="true" />
            <span>前往學生匯入新增景點</span>
          </button>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preference Controls */}
      <section
        aria-label="推薦條件設定"
        className="bg-white border border-[#E2DDD2] rounded-xl p-5 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECE8DE] pb-3">
          <div>
            <h2 className="text-lg font-semibold text-[#1C1B18]">
              智慧行程推薦與動線計算
            </h2>
            <p className="text-xs text-[#57544D] mt-0.5 tabular-nums">
              出發點：{originLabel} · 依據學生踏查匯入的 {spots.length} 處景點即時演算
            </p>
          </div>
          <span className="text-xs font-medium text-[#1B5E43] tabular-nums">
            右側地圖同步預覽動線
          </span>
        </div>

        {/* Themes */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-[#1C1B18]">1. 選擇探索主題</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
            {RECOMMENDATION_THEMES.map((theme) => {
              const active = prefs.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onChangePrefs({ ...prefs, theme: theme.id })}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    active
                      ? 'bg-[#1B5E43] text-white border-[#1B5E43]'
                      : 'bg-[#F8F7F3] text-[#1C1B18] border-[#E2DDD2] hover:border-[#1B5E43]'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-semibold whitespace-nowrap">{theme.label}</div>
                  <div
                    className={`text-[11px] mt-1 leading-snug ${
                      active ? 'text-white/85' : 'text-[#57544D]'
                    }`}
                  >
                    {theme.subtitle}
                  </div>
                </button>
              );
            })}
          </div>

          {prefs.theme === 'custom' && (
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#57544D] mr-1">自選分類：</span>
              {GUIDE_CATEGORIES.map((cat) => {
                const selected = prefs.customCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCustomCategory(cat)}
                    className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      selected
                        ? 'bg-[#1B5E43] text-white border-[#1B5E43]'
                        : 'bg-white text-[#57544D] border-[#D8D2C5] hover:border-[#1B5E43]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Time, Budget, Mode */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#ECE8DE]">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#57544D]">2. 預計造訪時段</div>
            <div className="flex flex-wrap gap-1.5">
              {TIME_OPTIONS.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => onChangePrefs({ ...prefs, timeOfDay: time })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                    prefs.timeOfDay === time
                      ? 'bg-[#1B5E43] text-white border-[#1B5E43]'
                      : 'bg-[#F8F7F3] text-[#1C1B18] border-[#E2DDD2] hover:border-[#1B5E43]'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#57544D]">3. 可用時間預算</div>
            <div className="flex flex-wrap gap-1.5">
              {BUDGET_OPTIONS.map((b) => (
                <button
                  key={b.minutes}
                  type="button"
                  onClick={() => onChangePrefs({ ...prefs, budgetMinutes: b.minutes })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                    prefs.budgetMinutes === b.minutes
                      ? 'bg-[#1B5E43] text-white border-[#1B5E43]'
                      : 'bg-[#F8F7F3] text-[#1C1B18] border-[#E2DDD2] hover:border-[#1B5E43]'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#57544D]">4. 交通移動方式</div>
            <div className="flex flex-wrap gap-1.5">
              {MODE_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChangePrefs({ ...prefs, travelMode: m.id })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                    prefs.travelMode === m.id
                      ? 'bg-[#1B5E43] text-white border-[#1B5E43]'
                      : 'bg-[#F8F7F3] text-[#1C1B18] border-[#E2DDD2] hover:border-[#1B5E43]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recommended Sequenced Itinerary */}
      <section aria-label="推薦建議動線" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#E2DDD2] pb-3">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-[#1C1B18]">推薦順遊路線</h3>
            <p className="text-xs text-[#57544D] tabular-nums">
              共 {itinerary.stops.length} 站 · 總路程約 {itinerary.totalDistanceKm} 公里 ·
              移動 {formatDuration(itinerary.totalTravelMinutes)} · 停留{' '}
              {formatDuration(itinerary.totalStayMinutes)}（合計{' '}
              {formatDuration(itinerary.totalMinutes)}）
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={itinerary.stops.length === 0}
              onClick={() =>
                onApplyItineraryToMap(
                  itinerary.stops.map((s) => s.spot),
                  prefs.travelMode
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1B5E43] text-white text-xs font-medium hover:bg-[#154A34] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
              <span>在地圖模式開啟導航</span>
            </button>

            {multiStopMapsUrl && (
              <a
                href={multiStopMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D8D2C5] bg-white text-[#1C1B18] text-xs font-medium hover:border-[#1B5E43] transition-colors whitespace-nowrap shrink-0"
              >
                <span>開啟 Google Maps 多點路線</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        {itinerary.stops.length === 0 ? (
          <div className="bg-white border border-[#E2DDD2] rounded-xl p-6 text-center text-sm text-[#57544D]">
            目前沒有符合條件的景點，請放寬時間預算或切換探索主題。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {itinerary.stops.map((stop) => (
              <article
                key={stop.spot.id}
                className="bg-white border border-[#E2DDD2] rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/9] bg-[#EFECE4]">
                    <SpotImage
                      src={stop.spot.imageUrl}
                      alt={stop.spot.name}
                      category={stop.spot.category}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#57544D] tabular-nums">
                      <span className="font-semibold text-[#1B5E43]">
                        第 {stop.order} 站 · {stop.spot.category}
                      </span>
                      <span>
                        路程 {stop.legDistanceKm.toFixed(1)} km（{stop.legTravelMinutes} 分）
                      </span>
                    </div>
                    <h4 className="text-base font-semibold text-[#1C1B18] leading-snug">
                      {stop.spot.name}
                    </h4>
                    <p className="text-xs text-[#45423C] leading-relaxed line-clamp-2">
                      {stop.spot.summary}
                    </p>
                    <div className="text-[11px] text-[#57544D]">
                      作者：{stop.spot.authorName} · 理由：{stop.reasons.join(' · ')}
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 border-t border-[#ECE8DE] flex items-center justify-between text-xs">
                  <span className="text-[#57544D] tabular-nums">
                    建議停留 {stop.stayMinutes} 分鐘
                  </span>
                  <button
                    type="button"
                    onClick={() => onInspectSpotOnMap(stop.spot)}
                    className="font-medium text-[#1B5E43] hover:underline whitespace-nowrap shrink-0"
                  >
                    查看導覽與評分 →
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Full Ranked Recommendations List */}
      <section aria-label="所有符合推薦景點" className="space-y-3">
        <h3 className="text-lg font-semibold text-[#1C1B18]">完整推薦排序（依契合度與距離）</h3>
        <div className="bg-white border border-[#E2DDD2] rounded-xl divide-y divide-[#ECE8DE]">
          {ranked.slice(0, 8).map((item, idx) => (
            <div
              key={item.spot.id}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            >
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#57544D] tabular-nums">
                  <span className="font-mono font-semibold text-[#1B5E43]">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span>{item.spot.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.spot.village}</span>
                  <span aria-hidden="true">·</span>
                  <span>距起點 {item.distanceKm.toFixed(1)} 公里</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#0F766E] font-medium">
                    學生匯入：{item.spot.authorName}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#1C1B18]">{item.spot.name}</div>
                <div className="text-xs text-[#57544D]">{item.reasons.join(' · ')}</div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onInspectSpotOnMap(item.spot)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#D8D2C5] text-xs font-medium text-[#1C1B18] hover:border-[#1B5E43] hover:text-[#1B5E43] transition-colors whitespace-nowrap shrink-0"
                >
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>地圖定位</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
