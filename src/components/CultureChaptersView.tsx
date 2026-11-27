import { ArrowRight } from 'lucide-react';
import { DONGSHAN_HERITAGE_CHAPTERS } from '../data/dongshanSeed';
import type { GuideCategory, GuideSpot } from '../types/guide';
import { SpotImage } from './SpotImage';

interface CultureChaptersViewProps {
  spots: GuideSpot[];
  onExploreCategory: (category: GuideCategory) => void;
}

export function CultureChaptersView({ spots, onExploreCategory }: CultureChaptersViewProps) {
  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      <header className="max-w-3xl space-y-3 border-b border-[#E2DDD2] pb-8">
        <div className="text-xs font-medium text-[#1B5E43] tracking-wide">
          冬山地方誌 · 六大主題脈絡
        </div>
        <h1 className="text-3xl sm:text-5xl font-semibold text-[#1C1B18] leading-tight">
          從水運舊街到茶香山林：讀懂冬山的六種風景
        </h1>
        <p className="text-sm sm:text-base text-[#57544D] leading-relaxed">
          冬山鄉位居蘭陽平原南側，兼具山麓丘陵、湧泉湖泊與平原水田。透過人文、風景、歷史、產物、農業與美食六個切面，建立在地走讀與學生田野踏查的共同語言。
        </p>
      </header>

      <div className="space-y-14">
        {DONGSHAN_HERITAGE_CHAPTERS.map((chapter, idx) => {
          const categorySpots = spots.filter((s) => s.category === chapter.category);
          const isReversed = idx % 2 === 1;

          return (
            <article
              key={chapter.category}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pb-12 border-b border-[#E2DDD2] last:border-b-0"
            >
              <div className={`lg:col-span-5 ${isReversed ? 'lg:order-2' : ''}`}>
                <div className="h-full min-h-[260px] rounded-xl overflow-hidden border border-[#E2DDD2] bg-[#EFECE4]">
                  <SpotImage
                    src={chapter.imageUrl}
                    alt={`${chapter.category}：${chapter.title}`}
                    category={chapter.category}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div
                className={`lg:col-span-7 flex flex-col justify-between space-y-5 ${
                  isReversed ? 'lg:order-1' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="text-xs font-medium text-[#1B5E43] tracking-wide">
                    {chapter.kicker} · 收錄 {categorySpots.length} 處導覽點
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-semibold text-[#1C1B18] leading-snug">
                    {chapter.title}
                  </h2>
                  <p className="text-base text-[#312F2A] font-medium leading-relaxed">
                    {chapter.lead}
                  </p>
                  <p className="text-sm text-[#57544D] leading-relaxed max-w-2xl">
                    {chapter.body}
                  </p>
                </div>

                <div className="space-y-4">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#ECE8DE]">
                    {chapter.keyFacts.map((fact) => (
                      <div key={fact.label}>
                        <dt className="text-xs text-[#57544D]">{fact.label}</dt>
                        <dd className="text-sm font-medium text-[#1C1B18] mt-0.5">{fact.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => onExploreCategory(chapter.category)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B5E43] text-white text-xs sm:text-sm font-medium hover:bg-[#154A34] transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>在地圖瀏覽「{chapter.category}」景點</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
