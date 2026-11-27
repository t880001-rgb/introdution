import type { GuideSpot, LatLngPoint } from '../types/guide';
import {
  DONGSHAN_STATION_ORIGIN,
  estimateTravelMinutes,
  haversineDistanceKm,
} from './geo';

export interface OfflineSpotEntry extends GuideSpot {
  distanceFromOriginKm: number;
  estimatedDrivingMinutes: number;
  estimatedBicyclingMinutes: number;
  estimatedWalkingMinutes: number;
}

export interface OfflinePackPayload {
  title: string;
  generatedAt: string;
  origin: LatLngPoint;
  spotCount: number;
  studentSpotCount: number;
  spots: OfflineSpotEntry[];
}

export interface OfflineCacheMetadata {
  cachedAt: string;
  spotCount: number;
  cachedAssetsCount: number;
  approxKilobytes: number;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildOfflinePackPayload(
  spots: GuideSpot[],
  origin: LatLngPoint = DONGSHAN_STATION_ORIGIN
): OfflinePackPayload {
  const enriched: OfflineSpotEntry[] = spots.map((spot) => {
    const dist = Number(
      haversineDistanceKm(origin, { lat: spot.lat, lng: spot.lng }).toFixed(2)
    );
    return {
      ...spot,
      distanceFromOriginKm: dist,
      estimatedDrivingMinutes: estimateTravelMinutes(dist, 'DRIVING'),
      estimatedBicyclingMinutes: estimateTravelMinutes(dist, 'BICYCLING'),
      estimatedWalkingMinutes: estimateTravelMinutes(dist, 'WALKING'),
    };
  });

  return {
    title: '冬山鄉導覽誌離線核心資料包',
    generatedAt: new Date().toISOString(),
    origin,
    spotCount: enriched.length,
    studentSpotCount: enriched.filter((s) => s.source === 'student').length,
    spots: enriched,
  };
}

function projectToSnapshotMap(lat: number, lng: number): { x: number; y: number } {
  const minLng = 121.71;
  const maxLng = 121.83;
  const minLat = 24.59;
  const maxLat = 24.675;

  const normX = Math.max(0.06, Math.min(0.94, (lng - minLng) / (maxLng - minLng)));
  const normY = Math.max(0.08, Math.min(0.92, 1 - (lat - minLat) / (maxLat - minLat)));

  return {
    x: Number((40 + normX * 700).toFixed(1)),
    y: Number((70 + normY * 720).toFixed(1)),
  };
}

/**
 * Generates a standalone 1200x860 SVG map snapshot of Dongshan Township
 * with numbered spot pins and an offline coordinate legend.
 */
export function generateOfflineMapSnapshotSvg(
  spots: GuideSpot[],
  origin: LatLngPoint = DONGSHAN_STATION_ORIGIN
): string {
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const originPt = projectToSnapshotMap(origin.lat, origin.lng);

  const markerElements = spots
    .map((spot, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      const pt = projectToSnapshotMap(spot.lat, spot.lng);
      const fill = spot.source === 'student' ? '#9A3412' : '#1B5E43';
      const shortName =
        spot.name.length > 10 ? `${spot.name.slice(0, 10)}…` : spot.name;

      return `
        <g transform="translate(${pt.x}, ${pt.y})">
          <circle r="13" fill="${fill}" stroke="#FFFFFF" stroke-width="2.5" />
          <text x="0" y="4" text-anchor="middle" font-size="10" font-weight="700" fill="#FFFFFF" font-family="sans-serif">${num}</text>
          <rect x="16" y="-10" width="114" height="20" rx="4" fill="#FFFFFF" fill-opacity="0.92" stroke="#D8D2C5" stroke-width="1" />
          <text x="22" y="3.5" font-size="10.5" font-weight="600" fill="#1C1B18" font-family="sans-serif">${escapeXml(shortName)}</text>
        </g>`;
    })
    .join('\n');

  const legendItems = spots
    .slice(0, 16)
    .map((spot, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      const yPos = 132 + idx * 42;
      const fill = spot.source === 'student' ? '#9A3412' : '#1B5E43';
      const label = spot.name.length > 16 ? `${spot.name.slice(0, 16)}…` : spot.name;
      return `
        <g transform="translate(805, ${yPos})">
          <circle cx="10" cy="10" r="10" fill="${fill}" />
          <text x="10" y="13.5" text-anchor="middle" font-size="9.5" font-weight="700" fill="#FFFFFF" font-family="sans-serif">${num}</text>
          <text x="28" y="9" font-size="12" font-weight="600" fill="#1C1B18" font-family="sans-serif">${escapeXml(label)}</text>
          <text x="28" y="24" font-size="10" fill="#57544D" font-family="monospace">${escapeXml(spot.category)} · ${escapeXml(spot.village)} · ${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)}</text>
        </g>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 860" width="1200" height="860">
  <rect width="1200" height="860" fill="#F8F7F3" />

  <!-- Map Canvas Region -->
  <rect x="24" y="24" width="746" height="812" rx="14" fill="#EFECE4" stroke="#D8D2C5" stroke-width="1.5" />

  <!-- Topographic Foothills & Mountains -->
  <path d="M 24 620 Q 190 540 310 660 T 520 836 L 24 836 Z" fill="#DDE6D8" />
  <path d="M 24 440 Q 130 390 220 500 T 330 660 L 24 660 Z" fill="#E4ECE0" />

  <!-- Grid Lines -->
  <g stroke="#E0DBD0" stroke-width="1" stroke-dasharray="4 4">
    <line x1="24" y1="210" x2="770" y2="210" />
    <line x1="24" y1="420" x2="770" y2="420" />
    <line x1="24" y1="630" x2="770" y2="630" />
    <line x1="210" y1="24" x2="210" y2="836" />
    <line x1="410" y1="24" x2="410" y2="836" />
    <line x1="600" y1="24" x2="600" y2="836" />
  </g>

  <!-- Dongshan River & Meihua Lake -->
  <path d="M 190 790 C 260 660, 410 580, 515 470 C 600 385, 650 280, 740 160" fill="none" stroke="#9AC8BC" stroke-width="26" stroke-linecap="round" opacity="0.7" />
  <path d="M 190 790 C 260 660, 410 580, 515 470 C 600 385, 650 280, 740 160" fill="none" stroke="#CFE6DF" stroke-width="7" stroke-linecap="round" opacity="0.85" />
  <ellipse cx="195" cy="340" rx="34" ry="21" fill="#A9D2C8" stroke="#6FA89B" stroke-width="1.5" />

  <!-- Roads & Railway -->
  <path d="M 550 836 L 560 470 L 585 24" fill="none" stroke="#8C877E" stroke-width="2.5" stroke-dasharray="8 6" />
  <path d="M 75 340 Q 340 430 570 460 T 760 450" fill="none" stroke="#FFFFFF" stroke-width="7" />

  <!-- Region Labels -->
  <g fill="#57544D" font-size="12" font-weight="600" font-family="sans-serif">
    <text x="145" y="305">梅花湖・得安村</text>
    <text x="150" y="555">中山茶鄉農業區</text>
    <text x="210" y="755">新寮溪源頭</text>
    <text x="485" y="510">冬山老街・車站</text>
    <text x="580" y="210">武淵・珍珠村</text>
  </g>

  <!-- Title Banner inside Map -->
  <rect x="42" y="42" width="380" height="58" rx="10" fill="#FFFFFF" fill-opacity="0.94" stroke="#D8D2C5" />
  <text x="58" y="67" font-size="16" font-weight="700" fill="#1C1B18" font-family="sans-serif">冬山鄉導覽誌｜離線導覽地圖快照</text>
  <text x="58" y="87" font-size="11" fill="#57544D" font-family="sans-serif">共收錄 ${spots.length} 處景點 · 產生時間 ${escapeXml(timestamp)} UTC</text>

  <!-- Origin Pin -->
  <g transform="translate(${originPt.x}, ${originPt.y})">
    <circle r="17" fill="#D97706" fill-opacity="0.22" />
    <circle r="7" fill="#D97706" stroke="#FFFFFF" stroke-width="2" />
  </g>

  <!-- Spot Markers -->
  ${markerElements}

  <!-- Right Legend Panel -->
  <rect x="786" y="24" width="390" height="812" rx="14" fill="#FFFFFF" stroke="#D8D2C5" stroke-width="1.5" />
  <text x="808" y="60" font-size="17" font-weight="700" fill="#1C1B18" font-family="sans-serif">離線景點座標索引</text>
  <text x="808" y="82" font-size="11.5" fill="#57544D" font-family="sans-serif">綠點：核心導覽景點 · 赭紅：學生匯入 · 橘圈：目前起點</text>
  <line x1="808" y1="98" x2="1154" y2="98" stroke="#E2DDD2" />

  ${legendItems}

  ${spots.length > 16 ? `<text x="808" y="814" font-size="11" fill="#57544D" font-family="sans-serif">另有 ${spots.length - 16} 筆景點請見 JSON / HTML 離線手冊</text>` : ''}
</svg>`;
}

/**
 * Generates a self-contained single-file HTML handbook with embedded SVG snapshot
 * and complete spot details for zero-signal field use.
 */
export function generateOfflineHtmlHandbook(
  spots: GuideSpot[],
  origin: LatLngPoint = DONGSHAN_STATION_ORIGIN
): string {
  const payload = buildOfflinePackPayload(spots, origin);
  const svgSnapshot = generateOfflineMapSnapshotSvg(spots, origin);

  const cardsHtml = payload.spots
    .map((spot, index) => {
      const highlightsHtml = spot.highlights
        .map((h) => `<span class="tag">${escapeXml(h)}</span>`)
        .join(' ');
      return `
      <article class="card">
        <div class="meta">
          <span class="num">${String(index + 1).padStart(2, '0')}</span>
          <span class="cat">${escapeXml(spot.category)}</span>
          <span>${escapeXml(spot.village)}</span>
          <span>建議停留 ${spot.stayMinutes} 分鐘</span>
          <span>距起點 ${spot.distanceFromOriginKm} 公里（單車約 ${spot.estimatedBicyclingMinutes} 分）</span>
        </div>
        <h2>${escapeXml(spot.name)}</h2>
        <p class="addr">地址：${escapeXml(spot.address)} ｜ 座標：${spot.lat.toFixed(5)}, ${spot.lng.toFixed(5)}</p>
        <p class="story">${escapeXml(spot.story || spot.summary)}</p>
        <div class="tags">${highlightsHtml}</div>
        <p class="author">導覽撰寫：${escapeXml(spot.authorName)}（${escapeXml(spot.authorClass)}）</p>
      </article>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>冬山鄉導覽誌｜離線走讀手冊</title>
  <style>
    body { font-family: system-ui, -apple-system, "Noto Sans TC", sans-serif; background: #F8F7F3; color: #1C1B18; margin: 0; padding: 24px; line-height: 1.65; }
    .container { max-width: 1080px; margin: 0 auto; }
    header { border-bottom: 2px solid #1B5E43; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { margin: 0 0 8px; font-size: 28px; color: #1B5E43; }
    .sub { font-size: 14px; color: #57544D; margin: 0; }
    .map-wrap { background: #fff; border: 1px solid #D8D2C5; border-radius: 12px; padding: 12px; margin-bottom: 24px; }
    .map-wrap svg { width: 100%; height: auto; display: block; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 16px; }
    .card { background: #fff; border: 1px solid #E2DDD2; border-radius: 12px; padding: 16px; }
    .meta { font-size: 12px; color: #57544D; display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .num { font-weight: 700; color: #1B5E43; }
    .cat { font-weight: 700; color: #9A3412; }
    h2 { margin: 0 0 6px; font-size: 18px; }
    .addr { font-size: 12px; color: #57544D; margin: 0 0 10px; }
    .story { font-size: 14px; margin: 0 0 10px; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .tag { font-size: 11px; background: #EFECE4; padding: 2px 8px; border-radius: 4px; }
    .author { font-size: 12px; color: #57544D; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>冬山鄉導覽誌｜離線走讀手冊</h1>
      <p class="sub">共收錄 ${payload.spotCount} 處景點（含學生踏查匯入 ${payload.studentSpotCount} 處）· 產生於 ${escapeXml(payload.generatedAt.slice(0, 16).replace('T', ' '))} UTC · 本手冊可於無網路狀態開啟瀏覽</p>
    </header>
    <section class="map-wrap">
      ${svgSnapshot}
    </section>
    <section class="grid">
      ${cardsHtml}
    </section>
  </div>
</body>
</html>`;
}
