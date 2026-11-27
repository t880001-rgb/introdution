import type { ExplorerAvatarId, GuideCategory } from '../types/guide';
import { ISLAND_THEME_META } from '../utils/island';

export interface ExtrudedHexProps {
  cx: number;
  cy: number;
  rx?: number;
  ry?: number;
  depth?: number;
  category: GuideCategory;
  surfaceTint: string;
  accentColor: string;
  isActive: boolean;
  isLit: boolean;
  isNight: boolean;
  onSelect: () => void;
}

export function IsometricHexIsland({
  cx,
  cy,
  rx = 104,
  ry = 72,
  depth = 20,
  category,
  surfaceTint,
  accentColor,
  isActive,
  isLit,
  isNight,
  onSelect,
}: ExtrudedHexProps) {
  const meta = ISLAND_THEME_META[category];
  const h = ry * 0.866;

  // Top vertices clockwise starting from right-most tip
  const v0 = [cx + rx, cy] as const;
  const v1 = [cx + 0.5 * rx, cy + h] as const;
  const v2 = [cx - 0.5 * rx, cy + h] as const;
  const v3 = [cx - rx, cy] as const;
  const v4 = [cx - 0.5 * rx, cy - h] as const;
  const v5 = [cx + 0.5 * rx, cy - h] as const;

  const topPoints = [v0, v1, v2, v3, v4, v5].map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  // Water shadow ring shifted below the extruded cliff
  const shadowPts = [v0, v1, v2, v3, v4, v5]
    .map((p) => `${(cx + (p[0] - cx) * 1.06).toFixed(1)},${(cy + depth + 5 + (p[1] - cy) * 1.05).toFixed(1)}`)
    .join(' ');

  // Visible front cliff quads
  const leftFace = `${v3[0]},${v3[1]} ${v2[0]},${v2[1]} ${v2[0]},${v2[1] + depth} ${v3[0]},${v3[1] + depth}`;
  const frontFace = `${v2[0]},${v2[1]} ${v1[0]},${v1[1]} ${v1[0]},${v1[1] + depth} ${v2[0]},${v2[1] + depth}`;
  const rightFace = `${v1[0]},${v1[1]} ${v0[0]},${v0[1]} ${v0[0]},${v0[1] + depth} ${v1[0]},${v1[1] + depth}`;

  const topFill = isNight ? '#243C4A' : surfaceTint;
  const cliffLeft = isNight ? '#192B36' : meta.cliffLight;
  const cliffFront = isNight ? '#15242E' : meta.cliffDark;
  const cliffRight = isNight ? '#111E27' : '#B9AE92';

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className="cursor-pointer group"
    >
      {/* Soft water shadow & foam */}
      <polygon
        points={shadowPts}
        fill={isNight ? '#06131C' : '#7AA8A5'}
        opacity={isNight ? 0.55 : 0.28}
      />

      {/* Active halo ring */}
      {isActive && (
        <polygon
          points={[v0, v1, v2, v3, v4, v5]
            .map((p) => `${(cx + (p[0] - cx) * 1.08).toFixed(1)},${(cy + depth * 0.4 + (p[1] - cy) * 1.08).toFixed(1)}`)
            .join(' ')}
          fill="none"
          stroke={isNight ? '#38BDF8' : '#0079C6'}
          strokeWidth="2.5"
          strokeDasharray="6 4"
          opacity="0.75"
        />
      )}

      {/* Extruded 3D side cliffs */}
      <polygon points={leftFace} fill={cliffLeft} />
      <polygon points={frontFace} fill={cliffFront} />
      <polygon points={rightFace} fill={cliffRight} />

      {/* Main Isometric Hex Deck */}
      <polygon
        points={topPoints}
        fill={topFill}
        stroke={isActive ? '#0079C6' : isLit ? accentColor : isNight ? '#36586B' : '#FFFFFF'}
        strokeWidth={isActive ? 2.8 : 1.6}
      />

      {/* Subtle inner courtyard bevel */}
      <polygon
        points={[v0, v1, v2, v3, v4, v5]
          .map((p) => `${(cx + (p[0] - cx) * 0.87).toFixed(1)},${(cy + (p[1] - cy) * 0.87).toFixed(1)}`)
          .join(' ')}
        fill="none"
        stroke={isNight ? '#3B5C6E' : '#FFFFFF'}
        strokeWidth="1"
        opacity={isNight ? 0.35 : 0.65}
      />

      {/* Bespoke Dongshan Isometric Landmark */}
      <IslandLandmark category={category} cx={cx} cy={cy - 12} isNight={isNight} />
    </g>
  );
}

function StylizedTree({
  x,
  y,
  scale = 1,
  variant = 'round',
  isNight,
}: {
  x: number;
  y: number;
  scale?: number;
  variant?: 'round' | 'pine';
  isNight: boolean;
}) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} pointerEvents="none">
      <ellipse cx="0" cy="4" rx="7" ry="3.2" fill="#133F52" opacity="0.16" />
      <rect x="-1.6" y="-6" width="3.2" height="10" rx="1" fill="#8C6D53" />
      {variant === 'pine' ? (
        <>
          <polygon
            points="0,-24 -9,-8 9,-8"
            fill={isNight ? '#2B5B53' : '#74A98E'}
          />
          <polygon
            points="0,-31 -7,-16 7,-16"
            fill={isNight ? '#346E64' : '#8EC0A6'}
          />
        </>
      ) : (
        <>
          <circle cx="0" cy="-14" r="9.5" fill={isNight ? '#2C5C56' : '#85B79D'} />
          <circle cx="-3" cy="-16" r="5" fill={isNight ? '#3A746C' : '#9FD0B6'} opacity="0.65" />
        </>
      )}
    </g>
  );
}

function IslandLandmark({
  category,
  cx,
  cy,
  isNight,
}: {
  category: GuideCategory;
  cx: number;
  cy: number;
  isNight: boolean;
}) {
  const windowFill = isNight ? '#FCD34D' : '#6495AB';

  switch (category) {
    case '人文':
      // Dongshan Station Melon-Trellis Arch Roof + Plaza Flag & Trees
      return (
        <g transform={`translate(${cx}, ${cy})`} pointerEvents="none">
          <StylizedTree x={-52} y={14} scale={0.95} variant="round" isNight={isNight} />
          <StylizedTree x={54} y={12} scale={0.9} variant="pine" isNight={isNight} />
          {/* Warm stone station plaza circle */}
          <ellipse cx="0" cy="14" rx="34" ry="16" fill={isNight ? '#2F4D5D' : '#EDE2C4'} />
          {/* Station base */}
          <polygon points="-28,6 0,18 28,6 0,-6" fill={isNight ? '#446373' : '#FFFDF8'} />
          {/* White arched melon-trellis canopy */}
          <path
            d="M -26 4 Q -14 -20 0 -10 Q 14 -20 26 4"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M -22 7 Q -10 -14 4 -6 Q 16 -14 24 7"
            fill={isNight ? '#3E6B7E' : '#D4E9E6'}
            fillOpacity="0.82"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          {/* Tiny station mast/flag */}
          <line x1="20" y1="-2" x2="20" y2="-24" stroke="#133F52" strokeWidth="1.8" />
          <polygon points="20,-24 31,-20 20,-16" fill="#F4B41A" />
        </g>
      );

    case '風景':
      // Meihua Lake Blue-Roof Observatory + Red Lighthouse/Suspension Tower + Pines
      return (
        <g transform={`translate(${cx}, ${cy})`} pointerEvents="none">
          <StylizedTree x={-50} y={8} scale={1} variant="pine" isNight={isNight} />
          <StylizedTree x={48} y={14} scale={0.92} variant="pine" isNight={isNight} />
          {/* Lake pool tint */}
          <ellipse cx="14" cy="14" rx="22" ry="11" fill={isNight ? '#1E5266' : '#85C4C9'} opacity="0.7" />
          {/* Red-and-white Scenic Lighthouse */}
          <g transform="translate(-22, -4)">
            <polygon points="-7,12 7,12 5,-14 -5,-14" fill="#FFFDF8" />
            <polygon points="-6,-2 6,-2 5.4,-9 -5.4,-9" fill="#E05A47" />
            <rect x="-5.5" y="-19" width="11" height="5" fill={isNight ? '#FDE047' : '#BAE6FD'} />
            <polygon points="-8,-19 8,-19 0,-26" fill="#E05A47" />
          </g>
          {/* Blue Observatory Roof Cottage */}
          <g transform="translate(8, 2)">
            <polygon points="-16,6 0,13 16,6 16,-8 0,-1 -16,-8" fill={isNight ? '#355162' : '#FFFDF8'} />
            <polygon points="-18,-8 0,-18 18,-8 0,-1" fill="#0079C6" />
            <rect x="-8" y="-3" width="5" height="5" fill={windowFill} />
            <rect x="4" y="-3" width="5" height="5" fill={windowFill} />
          </g>
        </g>
      );

    case '歷史':
      // Historic Red-Roof Temple & Old Street Shophouse
      return (
        <g transform={`translate(${cx}, ${cy})`} pointerEvents="none">
          <StylizedTree x={-48} y={12} scale={0.9} variant="round" isNight={isNight} />
          <StylizedTree x={50} y={10} scale={0.95} variant="round" isNight={isNight} />
          <g transform="translate(0, 4)">
            {/* Heritage brick body */}
            <polygon points="-24,6 0,17 0,-3 -24,-12" fill={isNight ? '#4A4E5A' : '#EFE7D4'} />
            <polygon points="0,17 24,6 24,-12 0,-3" fill={isNight ? '#373B47' : '#DED3B8'} />
            {/* Curved terracotta gable roof */}
            <polygon points="-28,-11 0,-26 28,-11 0,-1" fill="#D95338" />
            <polygon points="-14,-16 0,-24 14,-16 0,-10" fill="#B83B24" />
            {/* Lantern accents */}
            <circle cx="-11" cy="2" r="2.6" fill={isNight ? '#FBBF24' : '#E05A47'} />
            <circle cx="11" cy="2" r="2.6" fill={isNight ? '#FBBF24' : '#E05A47'} />
            <rect x="-3" y="4" width="6" height="9" rx="1" fill="#8C5332" />
          </g>
        </g>
      );

    case '產物':
      // Rice Granary Workshop + Golden Haystacks
      return (
        <g transform={`translate(${cx}, ${cy})`} pointerEvents="none">
          <StylizedTree x={-48} y={12} scale={0.88} variant="round" isNight={isNight} />
          {/* Granary building */}
          <g transform="translate(8, 2)">
            <polygon points="-20,7 0,16 0,-4 -20,-12" fill={isNight ? '#415563' : '#FFF8EC'} />
            <polygon points="0,16 20,7 20,-12 0,-4" fill={isNight ? '#324450' : '#E9DEC4'} />
            <polygon points="-22,-11 0,-22 22,-11 0,-2" fill="#E06D3B" />
            <rect x="-12" y="-3" width="5" height="6" fill={windowFill} />
          </g>
          {/* Golden straw craft bales */}
          <g transform="translate(-26, 12)">
            <ellipse cx="0" cy="4" rx="9" ry="5" fill="#D99B26" />
            <ellipse cx="10" cy="7" rx="8" ry="4.5" fill="#EAB308" />
          </g>
        </g>
      );

    case '農業':
      // Zhongshan Tea Terraces + Warm Barn Pavilion
      return (
        <g transform={`translate(${cx}, ${cy})`} pointerEvents="none">
          {/* Layered emerald tea terraces */}
          <ellipse cx="-18" cy="12" rx="28" ry="13" fill={isNight ? '#1E4C3E' : '#96C99E'} />
          <ellipse cx="-16" cy="5" rx="20" ry="9" fill={isNight ? '#276150' : '#79B684'} />
          <ellipse cx="-14" cy="-1" rx="12" ry="5.5" fill={isNight ? '#337965' : '#63A36F'} />
          {/* Yellow-amber Tea House */}
          <g transform="translate(22, 6)">
            <polygon points="-15,6 0,12 0,-4 -15,-10" fill={isNight ? '#3E5563' : '#FFFDF8'} />
            <polygon points="0,12 15,6 15,-10 0,-4" fill={isNight ? '#2E424E' : '#E7DEC8'} />
            <polygon points="-17,-9 0,-18 17,-9 0,-2" fill="#F4B41A" />
            <rect x="4" y="-2" width="5" height="5" fill={windowFill} />
          </g>
          <StylizedTree x={48} y={10} scale={0.92} variant="pine" isNight={isNight} />
        </g>
      );

    case '美食':
      // Dongshan Market Pavilion with Striped Canopy & Warm Steam
      return (
        <g transform={`translate(${cx}, ${cy})`} pointerEvents="none">
          <StylizedTree x={-48} y={12} scale={0.9} variant="round" isNight={isNight} />
          <StylizedTree x={48} y={10} scale={0.85} variant="round" isNight={isNight} />
          <g transform="translate(0, 4)">
            <polygon points="-22,6 0,16 0,-2 -22,-11" fill={isNight ? '#3C5261' : '#FFFDF9'} />
            <polygon points="0,16 22,6 22,-11 0,-2" fill={isNight ? '#2F414E' : '#EBE1C8'} />
            {/* Purple-violet / blue market roof like Visual Studio in ref */}
            <polygon points="-25,-10 0,-22 25,-10 0,-1" fill="#7E6AA8" />
            {/* Striped market awning */}
            <polygon points="-20,-1 -4,6 -4,11 -20,4" fill="#F4B41A" />
            <rect x="6" y="0" width="8" height="6" rx="1" fill={windowFill} />
          </g>
        </g>
      );
  }
}

export function IsometricSailboat({
  x,
  y,
  isNight,
}: {
  x: number;
  y: number;
  isNight: boolean;
}) {
  return (
    <g transform={`translate(${x}, ${y})`} pointerEvents="none">
      <g className="motion-safe:animate-[floatSlow_6s_ease-in-out_infinite]">
        {/* Water ripple */}
        <ellipse cx="0" cy="10" rx="24" ry="8" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.5" />
        {/* Hull */}
        <path d="M -16 3 Q 0 11 16 3 L 12 -2 L -12 -2 Z" fill="#D95D39" stroke="#FFF9F0" strokeWidth="1.2" />
        {/* Mast */}
        <line x1="0" y1="-2" x2="0" y2="-32" stroke={isNight ? '#E2E8F0' : '#133F52'} strokeWidth="1.8" />
        {/* Main white sail */}
        <polygon points="1,-30 16,-6 1,-6" fill="#FFFDF8" opacity="0.96" />
        <polygon points="-1,-26 -11,-6 -1,-6" fill="#F4EBD7" opacity="0.9" />
      </g>
    </g>
  );
}

export function IsometricTravelerCharacter({
  x,
  y,
  facingRight,
  avatarId,
  displayName,
  isMoving,
  isNight,
}: {
  x: number;
  y: number;
  facingRight: boolean;
  avatarId: ExplorerAvatarId;
  displayName: string;
  isMoving: boolean;
  isNight: boolean;
}) {
  const coatColor =
    avatarId === 'cyclist' ? '#0079C6' : avatarId === 'ecologist' ? '#0F766E' : '#C2410C';
  const hatColor =
    avatarId === 'cyclist' ? '#F4B41A' : avatarId === 'ecologist' ? '#85B79D' : '#D97706';
  const roleShort =
    avatarId === 'cyclist' ? '單車旅人' : avatarId === 'ecologist' ? '生態觀察' : '古道行者';

  return (
    <g transform={`translate(${x}, ${y})`} pointerEvents="none">
      {/* Ground shadow */}
      <ellipse cx="0" cy="12" rx="13" ry="5.5" fill="#133F52" opacity="0.24" />

      {/* Warm lantern aura at night */}
      {isNight && (
        <circle cx="0" cy="-6" r="24" fill="#FDE047" opacity="0.16" />
      )}

      {/* Character body */}
      <g
        transform={`scale(${facingRight ? 1 : -1}, 1) translate(0, ${isMoving ? -2 : 0})`}
      >
        {/* Explorer boots / scooter disc */}
        <ellipse cx="0" cy="7" rx="10" ry="4" fill="#133F52" stroke="#FFF9F0" strokeWidth="1.3" />
        {/* Backpack */}
        <rect x="-10" y="-11" width="6" height="12" rx="2.5" fill="#8C5332" stroke="#FFF9F0" strokeWidth="1" />
        {/* Torso */}
        <rect
          x="-6.5"
          y="-13"
          width="13"
          height="16"
          rx="5.5"
          fill={coatColor}
          stroke="#FFF9F0"
          strokeWidth="1.5"
        />
        {/* Head */}
        <circle cx="0" cy="-21" r="8" fill="#FDE6C4" stroke="#133F52" strokeWidth="1.4" />
        {/* Hat / Cap */}
        <path
          d="M -8.5 -24 Q 0 -33 8.5 -24 L 11 -21.5 L -8.5 -21.5 Z"
          fill={hatColor}
          stroke="#133F52"
          strokeWidth="1.2"
        />
        {/* Eye */}
        <circle cx="3.2" cy="-20.5" r="1.3" fill="#133F52" />
      </g>

      {/* Traveler Floating Tag */}
      <g transform="translate(0, -40)">
        <rect
          x="-46"
          y="-11"
          width="92"
          height="19"
          rx="9.5"
          fill="#133F52"
          fillOpacity="0.92"
          stroke="#FFF9F0"
          strokeWidth="1"
        />
        <text
          x="0"
          y="2"
          textAnchor="middle"
          fontSize="9.5"
          fontWeight="600"
          fill="#FFF9F0"
        >
          {displayName || '冬山旅人'} · {roleShort}
        </text>
      </g>
    </g>
  );
}
