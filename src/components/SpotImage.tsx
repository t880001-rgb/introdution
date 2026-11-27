import { useState } from 'react';
import { Compass, Landmark, Mountain, Sprout, Store, Utensils } from 'lucide-react';
import type { GuideCategory } from '../types/guide';

interface SpotImageProps {
  src?: string;
  alt: string;
  category: GuideCategory;
  className?: string;
}

function CategoryGlyph({ category }: { category: GuideCategory }) {
  switch (category) {
    case '人文':
      return <Compass className="w-7 h-7 text-[#1B5E43]/70" aria-hidden="true" />;
    case '風景':
      return <Mountain className="w-7 h-7 text-[#1B5E43]/70" aria-hidden="true" />;
    case '歷史':
      return <Landmark className="w-7 h-7 text-[#1B5E43]/70" aria-hidden="true" />;
    case '產物':
      return <Store className="w-7 h-7 text-[#1B5E43]/70" aria-hidden="true" />;
    case '農業':
      return <Sprout className="w-7 h-7 text-[#1B5E43]/70" aria-hidden="true" />;
    case '美食':
      return <Utensils className="w-7 h-7 text-[#1B5E43]/70" aria-hidden="true" />;
  }
}

export function SpotImage({ src, alt, category, className = '' }: SpotImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#EFECE4] via-[#E7E3D7] to-[#DCE4DC] text-[#57544D] ${className}`}
        role="img"
        aria-label={alt}
      >
        <CategoryGlyph category={category} />
        <span className="text-xs font-medium tracking-wide text-[#45423C]">
          冬山・{category}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
