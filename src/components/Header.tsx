import { Compass, MapPinPlus } from 'lucide-react';
import type { AppSection, ExploreWorkbenchMode } from '../types/guide';

interface HeaderProps {
  activeSection: AppSection;
  exploreMode: ExploreWorkbenchMode;
  onNavigate: (section: AppSection, mode?: ExploreWorkbenchMode) => void;
}

const NAV_ITEMS: { id: AppSection; label: string }[] = [
  { id: 'explore', label: '地圖導覽與推薦' },
  { id: 'island', label: '學習島' },
  { id: 'community', label: '社群互動' },
  { id: 'culture', label: '文化故事' },
];

export function Header({ activeSection, exploreMode, onNavigate }: HeaderProps) {
  const isImportActive = activeSection === 'explore' && exploreMode === 'import';

  return (
    <header className="sticky top-0 z-40 bg-[#F8F7F3]/95 backdrop-blur-sm border-b border-[#E2DDD2]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Single-line Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('explore', 'map')}
          className="flex items-center gap-2 text-lg sm:text-xl font-semibold tracking-tight text-[#1C1B18] font-editorial whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5E43]"
        >
          <Compass className="w-5 h-5 text-[#1B5E43] shrink-0" aria-hidden="true" />
          <span>冬山鄉導覽誌</span>
        </button>

        {/* Zone 2: 4 concise single-line text nav links */}
        <nav
          aria-label="主導覽選單"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#57544D]"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.id === 'explore'
                ? activeSection === 'explore' && exploreMode !== 'import'
                : activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  onNavigate(item.id, item.id === 'explore' && exploreMode === 'import' ? 'map' : undefined)
                }
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-2 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5E43] ${
                  isActive
                    ? 'text-[#1B5E43] font-semibold'
                    : 'text-[#57544D] hover:text-[#1C1B18]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-[#1B5E43]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary CTA opening Student Import inside unified explore workbench */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('explore', 'import')}
            aria-current={isImportActive ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5E43] ${
              isImportActive
                ? 'bg-[#154A34] text-white ring-2 ring-[#1B5E43]/30'
                : 'bg-[#1B5E43] text-white hover:bg-[#154A34]'
            }`}
          >
            <MapPinPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>學生匯入</span>
          </button>
        </div>
      </div>

      {/* Mobile compact scrollable navigation row */}
      <nav
        aria-label="行動版主選單"
        className="md:hidden border-t border-[#E2DDD2]/80 px-2 flex items-center justify-around gap-1 overflow-x-auto bg-[#F8F7F3]"
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.id === 'explore'
              ? activeSection === 'explore' && exploreMode !== 'import'
              : activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                onNavigate(item.id, item.id === 'explore' && exploreMode === 'import' ? 'map' : undefined)
              }
              aria-current={isActive ? 'page' : undefined}
              className={`py-2 px-2.5 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                isActive
                  ? 'border-[#1B5E43] text-[#1B5E43] font-semibold'
                  : 'border-transparent text-[#57544D]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
