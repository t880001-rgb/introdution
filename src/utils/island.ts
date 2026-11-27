import type { GuideCategory, GuideSpot, IslandHexLayout, LatLngPoint } from '../types/guide';

export const ISLAND_WORLD_WIDTH = 960;
export const ISLAND_WORLD_HEIGHT = 620;
export const ISLAND_HEX_RADIUS = 104;

export interface IslandThemeMeta {
  englishLabel: string;
  tagline: string;
  dockBg: string;
  dockText: string;
  cliffLight: string;
  cliffDark: string;
  waterChannelColor: string;
}

export const ISLAND_THEME_META: Record<GuideCategory, IslandThemeMeta> = {
  人文: {
    englishLabel: 'THE HUMANITIES HUB',
    tagline: '瓜棚車站展開的冬山生活序曲。',
    dockBg: '#F4B41A',
    dockText: '#133F52',
    cliffLight: '#E8DFC8',
    cliffDark: '#CEC3A6',
    waterChannelColor: '#98C7C2',
  },
  風景: {
    englishLabel: 'SCENIC WATERSHED',
    tagline: '山嵐倒映梅花湖與生態綠舟水岸。',
    dockBg: '#0F766E',
    dockText: '#FFFFFF',
    cliffLight: '#DCE8DF',
    cliffDark: '#BACFC0',
    waterChannelColor: '#8BC0BE',
  },
  歷史: {
    englishLabel: 'HERITAGE QUARTER',
    tagline: '走進舊河道碼頭與茅埔城百年聚落。',
    dockBg: '#B45309',
    dockText: '#FFFFFF',
    cliffLight: '#ECE0CA',
    cliffDark: '#D2C0A0',
    waterChannelColor: '#98C7C2',
  },
  產物: {
    englishLabel: 'CRAFT & GRANARY',
    tagline: '稻草工藝與良食糧倉的土地手作。',
    dockBg: '#C2410C',
    dockText: '#FFFFFF',
    cliffLight: '#EFE2C9',
    cliffDark: '#D5C29E',
    waterChannelColor: '#98C7C2',
  },
  農業: {
    englishLabel: 'TEA & FARMLAND',
    tagline: '循著素馨茶香登上中山梯田茶園。',
    dockBg: '#2F855A',
    dockText: '#FFFFFF',
    cliffLight: '#DFEAD6',
    cliffDark: '#BDD1B0',
    waterChannelColor: '#8BC0BE',
  },
  美食: {
    englishLabel: 'OLD STREET FLAVORS',
    tagline: '冬山市場粉圓冰與老街的溫暖灶腳。',
    dockBg: '#0079C6',
    dockText: '#FFFFFF',
    cliffLight: '#EFE3CF',
    cliffDark: '#D5C3A5',
    waterChannelColor: '#98C7C2',
  },
};

/**
 * Six theme islands arranged as a cohesive clustered isometric honeycomb archipelago,
 * centered on Dongshan Station & River Hub.
 */
export const ISLAND_HEX_LAYOUTS: IslandHexLayout[] = [
  {
    category: '人文',
    cx: 480,
    cy: 290,
    subtitle: '瓜棚車站・社區共融',
    accentColor: '#0079C6',
    surfaceTint: '#F7F1DF',
  },
  {
    category: '風景',
    cx: 286,
    cy: 200,
    subtitle: '梅花湖・生態綠舟',
    accentColor: '#0F766E',
    surfaceTint: '#E9F4EF',
  },
  {
    category: '歷史',
    cx: 674,
    cy: 200,
    subtitle: '舊河道・茅埔城古道',
    accentColor: '#B45309',
    surfaceTint: '#FBF2E1',
  },
  {
    category: '產物',
    cx: 674,
    cy: 382,
    subtitle: '良食糧倉・稻草工藝',
    accentColor: '#C2410C',
    surfaceTint: '#FDF1E3',
  },
  {
    category: '農業',
    cx: 286,
    cy: 382,
    subtitle: '中山茶鄉・友善農園',
    accentColor: '#2F855A',
    surfaceTint: '#EDF5E7',
  },
  {
    category: '美食',
    cx: 480,
    cy: 472,
    subtitle: '冬山市場・老街風味',
    accentColor: '#D97706',
    surfaceTint: '#FCF3DF',
  },
];

export const ISLAND_CONNECTIONS: [GuideCategory, GuideCategory][] = [
  ['人文', '風景'],
  ['人文', '歷史'],
  ['人文', '產物'],
  ['人文', '農業'],
  ['人文', '美食'],
  ['風景', '農業'],
  ['歷史', '產物'],
  ['農業', '美食'],
  ['產物', '美食'],
];

export interface IslandPoint {
  x: number;
  y: number;
}

export interface IslandSpotNode {
  spot: GuideSpot;
  island: IslandHexLayout;
  x: number;
  y: number;
}

export function getIslandLayout(category: GuideCategory): IslandHexLayout {
  return (
    ISLAND_HEX_LAYOUTS.find((item) => item.category === category) ?? ISLAND_HEX_LAYOUTS[0]
  );
}

/**
 * Generates SVG polygon points for a flat-topped regular hexagon.
 */
export function buildHexagonPoints(cx: number, cy: number, radius: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

/**
 * Deterministically positions every spot inside its theme hexagon island,
 * including newly imported student spots.
 */
export function computeSpotIslandPositions(spots: GuideSpot[]): IslandSpotNode[] {
  const grouped = new Map<GuideCategory, GuideSpot[]>();
  for (const spot of spots) {
    const list = grouped.get(spot.category) ?? [];
    list.push(spot);
    grouped.set(spot.category, list);
  }

  const nodes: IslandSpotNode[] = [];
  for (const [category, group] of grouped.entries()) {
    const island = getIslandLayout(category);
    const count = group.length;
    group.forEach((spot, index) => {
      if (count === 1) {
        nodes.push({ spot, island, x: island.cx, y: island.cy + 4 });
        return;
      }
      const ringRadius = count <= 4 ? 46 : 56;
      const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
      nodes.push({
        spot,
        island,
        x: Math.round(island.cx + Math.cos(angle) * ringRadius),
        y: Math.round(island.cy + Math.sin(angle) * (ringRadius * 0.82)),
      });
    });
  }
  return nodes;
}

/**
 * Maps real Dongshan Township lat/lng coordinates to virtual Learning Island canvas space
 * so live GPS positioning can place the traveler on the island.
 */
export function latLngToIslandCoords(point: LatLngPoint): IslandPoint {
  const minLng = 121.71;
  const maxLng = 121.83;
  const minLat = 24.595;
  const maxLat = 24.675;

  const normX = Math.max(0.08, Math.min(0.92, (point.lng - minLng) / (maxLng - minLng)));
  const normY = Math.max(0.1, Math.min(0.9, 1 - (point.lat - minLat) / (maxLat - minLat)));

  return {
    x: Math.round(normX * ISLAND_WORLD_WIDTH),
    y: Math.round(normY * ISLAND_WORLD_HEIGHT),
  };
}

export function clampIslandPoint(point: IslandPoint): IslandPoint {
  return {
    x: Math.max(42, Math.min(ISLAND_WORLD_WIDTH - 42, Math.round(point.x))),
    y: Math.max(42, Math.min(ISLAND_WORLD_HEIGHT - 42, Math.round(point.y))),
  };
}

export function stepPlayerPosition(
  current: IslandPoint,
  dx: number,
  dy: number
): IslandPoint {
  return clampIslandPoint({
    x: current.x + dx,
    y: current.y + dy,
  });
}

export function moveTowardsTarget(
  current: IslandPoint,
  target: IslandPoint,
  maxStep: number
): { next: IslandPoint; arrived: boolean } {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= maxStep) {
    return { next: clampIslandPoint(target), arrived: true };
  }
  const ratio = maxStep / dist;
  return {
    next: clampIslandPoint({
      x: current.x + dx * ratio,
      y: current.y + dy * ratio,
    }),
    arrived: false,
  };
}

export function findNearestIslandSpot(
  playerPos: IslandPoint,
  nodes: IslandSpotNode[],
  maxDistance = 58
): IslandSpotNode | null {
  let nearest: IslandSpotNode | null = null;
  let bestDist = Infinity;

  for (const node of nodes) {
    const dist = Math.hypot(node.x - playerPos.x, node.y - playerPos.y);
    if (dist <= maxDistance && dist < bestDist) {
      bestDist = dist;
      nearest = node;
    }
  }
  return nearest;
}
