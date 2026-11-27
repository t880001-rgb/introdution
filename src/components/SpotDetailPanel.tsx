import { useState } from 'react';
import {
  MapPin,
  PlusCircle,
  CheckCircle2,
  Compass,
  MessageSquarePlus,
  Star,
} from 'lucide-react';
import type { ComputedRouteInfo, GuideSpot, LatLngPoint, TravelMode } from '../types/guide';
import type { SpotRatingSummary } from '../utils/ratings';
import { NavigationDrawer } from './NavigationDrawer';
import { SpotImage } from './SpotImage';

interface SpotDetailPanelProps {
  spot: GuideSpot;
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
  onSetAsOrigin: (spot: GuideSpot) => void;
  inCustomRoute: boolean;
  onToggleCustomRoute: (spot: GuideSpot) => void;
  communityPostCount?: number;
  ratingSummary: SpotRatingSummary;
  onRateSpot: (spotId: string, stars: number) => void;
  onWalkOnIsland?: (spot: GuideSpot) => void;
  onShareReflection?: (spot: GuideSpot) => void;
}

export function SpotDetailPanel({
  spot,
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
  onSetAsOrigin,
  inCustomRoute,
  onToggleCustomRoute,
  communityPostCount = 0,
  ratingSummary,
  onRateSpot,
  onWalkOnIsland,
  onShareReflection,
}: SpotDetailPanelProps) {
  const [hoverStar, setHoverStar] = useState<number | null>(null);
  const activeStarValue = hoverStar ?? ratingSummary.userRating;

  return (
    <article className="bg-white border border-[#E2DDD2] rounded-xl overflow-hidden flex flex-col">
      <div className="relative aspect-[2/1] w-full bg-[#EFECE4]">
        <SpotImage
          src={spot.imageUrl}
          alt={spot.name}
          category={spot.category}
          className="w-full h-full"
        />
      </div>

      <div className="p-5 space-y-4">
        {/* Zero-pill metadata line */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#57544D]">
          <span className="font-semibold text-[#1B5E43]">{spot.category}</span>
          <span aria-hidden="true">·</span>
          <span>{spot.village}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">建議停留 {spot.stayMinutes} 分鐘</span>
          <span aria-hidden="true">·</span>
          <span>適合{spot.bestTime}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 font-medium text-[#1C1B18] tabular-nums">
            <Star
              className="w-3.5 h-3.5 text-[#D97706] fill-[#D97706]"
              aria-hidden="true"
            />
            <span>{ratingSummary.count > 0 ? ratingSummary.formattedAverage : '尚無評分'}</span>
          </span>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold text-[#1C1B18] leading-snug">{spot.name}</h2>
          <p className="text-xs text-[#57544D] flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#1B5E43]" aria-hidden="true" />
            <span>{spot.address}</span>
          </p>
        </div>

        <p className="text-sm text-[#312F2A] leading-relaxed">{spot.story}</p>

        {/* Highlights as clean typographic list */}
        {spot.highlights.length > 0 && (
          <div className="pt-2 border-t border-[#ECE8DE]">
            <div className="text-xs font-medium text-[#57544D] mb-1.5">導覽亮點</div>
            <div className="text-xs text-[#1C1B18] leading-relaxed">
              {spot.highlights.join(' · ')}
            </div>
          </div>
        )}

        {/* Spot Rating Section */}
        <section
          aria-label="景點評分"
          className="pt-3 border-t border-[#ECE8DE] space-y-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-[#57544D]">景點評分</span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#1C1B18] tabular-nums">
                <Star
                  className={`w-4 h-4 ${
                    ratingSummary.count > 0
                      ? 'text-[#D97706] fill-[#D97706]'
                      : 'text-[#D8D2C5]'
                  }`}
                  aria-hidden="true"
                />
                <span>
                  {ratingSummary.count > 0 ? ratingSummary.formattedAverage : '尚無評分'}
                </span>
              </span>
              <span className="text-xs text-[#57544D] tabular-nums">
                （共 {ratingSummary.count} 則評分）
              </span>
            </div>
            <span className="text-xs text-[#57544D] tabular-nums">
              {ratingSummary.userRating > 0
                ? `您的評分：${ratingSummary.userRating} 顆星`
                : '點擊星號評分'}
            </span>
          </div>

          <div
            className="flex items-center gap-1"
            onMouseLeave={() => setHoverStar(null)}
            role="group"
            aria-label={`為「${spot.name}」評分`}
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = star <= activeStarValue;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => onRateSpot(spot.id, star)}
                  onMouseEnter={() => setHoverStar(star)}
                  onFocus={() => setHoverStar(star)}
                  onBlur={() => setHoverStar(null)}
                  aria-label={`給予 ${star} 顆星`}
                  aria-pressed={ratingSummary.userRating === star}
                  className="p-1.5 rounded-md border border-transparent hover:border-[#E2DDD2] hover:bg-[#F8F7F3] focus:outline-none focus:ring-2 focus:ring-[#1B5E43]/40 transition-colors"
                >
                  <Star
                    className={`w-5 h-5 transition-colors ${
                      filled
                        ? 'text-[#D97706] fill-[#D97706]'
                        : 'text-[#D8D2C5] fill-transparent'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </section>

        {/* Author attribution */}
        <div className="text-xs text-[#57544D] pt-1 flex flex-wrap items-center justify-between gap-2">
          <span>
            導覽撰寫：{spot.authorName}（{spot.authorClass}）
          </span>
          <span className="text-[#1B5E43] font-medium tabular-nums">
            社群走讀 {communityPostCount} 則
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => onToggleCustomRoute(spot)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              inCustomRoute
                ? 'bg-[#EFECE4] border-[#1B5E43] text-[#1B5E43]'
                : 'bg-white border-[#D8D2C5] text-[#1C1B18] hover:border-[#1B5E43]'
            }`}
          >
            {inCustomRoute ? (
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{inCustomRoute ? '已加入行程動線' : '加入行程動線'}</span>
          </button>

          <button
            type="button"
            onClick={() => onSetAsOrigin(spot)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#D8D2C5] bg-white text-[#57544D] hover:text-[#1C1B18] hover:border-[#1B5E43] transition-colors whitespace-nowrap shrink-0"
          >
            設為出發起點
          </button>

          {onWalkOnIsland && (
            <button
              type="button"
              onClick={() => onWalkOnIsland(spot)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#D8D2C5] bg-[#F8F7F3] text-[#1C1B18] hover:border-[#1B5E43] transition-colors whitespace-nowrap shrink-0"
            >
              <Compass className="w-3.5 h-3.5 text-[#1B5E43]" aria-hidden="true" />
              <span>在學習島前往</span>
            </button>
          )}

          {onShareReflection && (
            <button
              type="button"
              onClick={() => onShareReflection(spot)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#D8D2C5] bg-[#F8F7F3] text-[#1C1B18] hover:border-[#9A3412] transition-colors whitespace-nowrap shrink-0"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-[#9A3412]" aria-hidden="true" />
              <span>分享走讀心得</span>
            </button>
          )}
        </div>

        <NavigationDrawer
          destination={spot}
          origin={origin}
          originLabel={originLabel}
          usingLiveGps={usingLiveGps}
          gpsLoading={gpsLoading}
          gpsError={gpsError}
          onUseGpsOrigin={onUseGpsOrigin}
          onUseStationOrigin={onUseStationOrigin}
          travelMode={travelMode}
          onChangeTravelMode={onChangeTravelMode}
          routeActive={routeActive}
          onToggleRoute={onToggleRoute}
          routeInfo={routeInfo}
        />
      </div>
    </article>
  );
}
