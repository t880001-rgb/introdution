import {
  GUIDE_CATEGORIES,
  type GuideCategory,
  type GuideSpot,
  type ImportRowValidation,
  type ParsedImportResult,
  type SpotDraft,
  type TimeOfDay,
} from '../types/guide';
import { isWithinTaiwanBounds, isWithinYilanBounds } from './geo';

const VALID_TIMES: TimeOfDay[] = ['上午', '下午', '傍晚', '全日'];

const HEADER_ALIASES: Record<string, keyof SpotDraft> = {
  名稱: 'name',
  景點名稱: 'name',
  name: 'name',
  title: 'name',
  分類: 'category',
  類別: 'category',
  主題: 'category',
  category: 'category',
  村落: 'village',
  '村落/地段': 'village',
  地段: 'village',
  village: 'village',
  area: 'village',
  地址: 'address',
  address: 'address',
  緯度: 'lat',
  lat: 'lat',
  latitude: 'lat',
  經度: 'lng',
  lng: 'lng',
  lon: 'lng',
  longitude: 'lng',
  簡介: 'summary',
  導覽簡介: 'summary',
  摘要: 'summary',
  summary: 'summary',
  導覽介紹: 'story',
  故事: 'story',
  詳細介紹: 'story',
  story: 'story',
  description: 'story',
  亮點: 'highlights',
  特色亮點: 'highlights',
  歷史或產物亮點: 'highlights',
  highlights: 'highlights',
  建議停留時間: 'stayMinutes',
  '建議停留時間(分鐘)': 'stayMinutes',
  停留時間: 'stayMinutes',
  stayminutes: 'stayMinutes',
  推薦時段: 'bestTime',
  時段: 'bestTime',
  besttime: 'bestTime',
  學生作者: 'authorName',
  作者: 'authorName',
  '學生作者/班級': 'authorName',
  authorname: 'authorName',
  author: 'authorName',
  班級: 'authorClass',
  班級組別: 'authorClass',
  authorclass: 'authorClass',
  圖片網址: 'imageUrl',
  '圖片網址(選填)': 'imageUrl',
  imageurl: 'imageUrl',
  image: 'imageUrl',
  googleplaceid: 'googlePlaceId',
  placeid: 'googlePlaceId',
};

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function parseDelimitedLine(line: string, delimiter: ',' | '\t'): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeCategory(raw: string): GuideCategory | null {
  const trimmed = raw.trim();
  if ((GUIDE_CATEGORIES as string[]).includes(trimmed)) {
    return trimmed as GuideCategory;
  }
  const map: Record<string, GuideCategory> = {
    文化: '人文',
    聚落: '人文',
    自然: '風景',
    生態: '風景',
    步道: '風景',
    古蹟: '歷史',
    史蹟: '歷史',
    特產: '產物',
    工藝: '產物',
    農遊: '農業',
    茶園: '農業',
    農產: '農業',
    小吃: '美食',
    餐飲: '美食',
  };
  return map[trimmed] ?? null;
}

function normalizeTimeOfDay(raw: string): TimeOfDay {
  const trimmed = raw.trim();
  if ((VALID_TIMES as string[]).includes(trimmed)) {
    return trimmed as TimeOfDay;
  }
  if (trimmed.includes('早') || trimmed.includes('晨')) return '上午';
  if (trimmed.includes('午')) return '下午';
  if (trimmed.includes('晚') || trimmed.includes('夕')) return '傍晚';
  return '全日';
}

function parseHighlights(input: string | string[] | undefined): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }
  return input
    .split(/[;；|、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function validateSpotDraft(
  draft: Partial<SpotDraft>,
  rowIndex = 1,
  existingId?: string
): ImportRowValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const name = String(draft.name ?? '').trim();
  if (!name) {
    errors.push('缺少景點名稱');
  }

  const rawCategory = String(draft.category ?? '').trim();
  const category = normalizeCategory(rawCategory);
  if (!category) {
    errors.push(`分類「${rawCategory || '空白'}」無效，須為：人文、風景、歷史、產物、農業、美食`);
  }

  const latNum = typeof draft.lat === 'number' ? draft.lat : Number(String(draft.lat ?? '').trim());
  const lngNum = typeof draft.lng === 'number' ? draft.lng : Number(String(draft.lng ?? '').trim());

  if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90 || String(draft.lat ?? '').trim() === '') {
    errors.push('緯度格式錯誤（需為有效數字，例如 24.6361）');
  }
  if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180 || String(draft.lng ?? '').trim() === '') {
    errors.push('經度格式錯誤（需為有效數字，例如 121.7921）');
  }

  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    if (!isWithinTaiwanBounds(latNum, lngNum)) {
      errors.push('座標不在臺灣範圍內，請確認經緯度是否對調（冬山約 24.63, 121.79）');
    } else if (!isWithinYilanBounds(latNum, lngNum)) {
      warnings.push('座標位於宜蘭縣範圍外，請確認是否為冬山鄉周邊景點');
    }
  }

  const summary = String(draft.summary ?? '').trim();
  const story = String(draft.story ?? '').trim();
  if (!summary && !story) {
    errors.push('請至少填寫導覽簡介或詳細介紹');
  }

  const rawStay = Number(String(draft.stayMinutes ?? '45').trim());
  const stayMinutes = Number.isFinite(rawStay) && rawStay > 0 ? Math.min(480, Math.round(rawStay)) : 45;
  if (!Number.isFinite(rawStay) || rawStay <= 0) {
    warnings.push('建議停留時間無效，已預設為 45 分鐘');
  }

  const authorName = String(draft.authorName ?? '').trim();
  if (!authorName) {
    warnings.push('未填寫學生作者，已標記為「學生踏查小組」');
  }

  const imageUrlRaw = String(draft.imageUrl ?? '').trim();
  let safeImageUrl: string | undefined;
  if (imageUrlRaw) {
    if (
      imageUrlRaw.startsWith('https://') ||
      imageUrlRaw.startsWith('http://') ||
      imageUrlRaw.startsWith('data:image/') ||
      imageUrlRaw.startsWith('/src/assets/')
    ) {
      safeImageUrl = imageUrlRaw;
    } else {
      warnings.push('圖片網址格式不支援，已略過圖片設定');
    }
  }

  if (errors.length > 0 || !category) {
    return {
      rowIndex,
      rawName: name || `第 ${rowIndex} 筆`,
      spot: null,
      errors,
      warnings,
    };
  }

  const resolvedSummary =
    summary || (story.length > 56 ? `${story.slice(0, 56)}…` : story);
  const resolvedStory = story || summary;
  const highlights = parseHighlights(draft.highlights);

  const spot: GuideSpot = {
    id: existingId ?? `student-${Date.now()}-${rowIndex}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    category,
    village: String(draft.village ?? '').trim() || '冬山鄉',
    address: String(draft.address ?? '').trim() || `宜蘭縣冬山鄉${String(draft.village ?? '').trim()}`,
    lat: Number(latNum.toFixed(6)),
    lng: Number(lngNum.toFixed(6)),
    summary: resolvedSummary,
    story: resolvedStory,
    highlights: highlights.length > 0 ? highlights : [`${category}主題踏查`],
    stayMinutes,
    bestTime: normalizeTimeOfDay(String(draft.bestTime ?? '全日')),
    authorName: authorName || '學生踏查小組',
    authorClass: String(draft.authorClass ?? '').trim() || '鄉土踏查課程',
    imageUrl: safeImageUrl,
    source: 'student',
    createdAt: new Date().toISOString(),
    googlePlaceId: String(draft.googlePlaceId ?? '').trim() || undefined,
  };

  return {
    rowIndex,
    rawName: name,
    spot,
    errors,
    warnings,
  };
}

function mapHeaderName(header: string): keyof SpotDraft | null {
  const normalized = header
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[（）()]/g, (m) => (m === '（' ? '(' : m === '）' ? ')' : m));
  // Try exact match first, then stripped parentheses
  if (HEADER_ALIASES[header.trim()]) return HEADER_ALIASES[header.trim()];
  if (HEADER_ALIASES[normalized]) return HEADER_ALIASES[normalized];
  const noParens = normalized.replace(/\(.*?\)/g, '');
  return HEADER_ALIASES[noParens] ?? null;
}

export function parseStudentImportText(rawInput: string): ParsedImportResult {
  const cleaned = stripBom(rawInput).trim();
  if (!cleaned) {
    return {
      format: 'csv',
      rows: [],
      validSpots: [],
      errorCount: 0,
      warningCount: 0,
    };
  }

  // Try JSON array or object with spots array
  if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
    try {
      const parsed = JSON.parse(cleaned);
      const items: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.spots)
          ? parsed.spots
          : [parsed];
      const rows = items.map((item, idx) =>
        validateSpotDraft((item ?? {}) as Partial<SpotDraft>, idx + 1)
      );
      return {
        format: 'json',
        rows,
        validSpots: rows.map((r) => r.spot).filter((s): s is GuideSpot => s !== null),
        errorCount: rows.filter((r) => r.errors.length > 0).length,
        warningCount: rows.filter((r) => r.warnings.length > 0).length,
      };
    } catch {
      // Fall through to CSV/TSV parser if not valid JSON
    }
  }

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { format: 'csv', rows: [], validSpots: [], errorCount: 0, warningCount: 0 };
  }

  const firstLineTabCount = (lines[0].match(/\t/g) ?? []).length;
  const firstLineCommaCount = (lines[0].match(/,/g) ?? []).length;
  const delimiter: ',' | '\t' = firstLineTabCount >= firstLineCommaCount && firstLineTabCount > 0 ? '\t' : ',';
  const format = delimiter === '\t' ? 'tsv' : 'csv';

  const firstCells = parseDelimitedLine(lines[0], delimiter);
  const mappedHeaders = firstCells.map(mapHeaderName);
  const hasRecognizedHeader = mappedHeaders.filter(Boolean).length >= 2;

  const defaultOrder: (keyof SpotDraft)[] = [
    'name',
    'category',
    'village',
    'lat',
    'lng',
    'summary',
    'story',
    'highlights',
    'stayMinutes',
    'bestTime',
    'authorName',
    'authorClass',
    'imageUrl',
  ];

  const columnKeys = hasRecognizedHeader ? mappedHeaders : defaultOrder;
  const dataLines = hasRecognizedHeader ? lines.slice(1) : lines;

  const rows: ImportRowValidation[] = dataLines.map((line, index) => {
    const cells = parseDelimitedLine(line, delimiter);
    const draft: Partial<SpotDraft> = {};
    cells.forEach((cell, colIdx) => {
      const key = columnKeys[colIdx];
      if (key) {
        (draft as Record<string, string>)[key] = cell;
      }
    });
    return validateSpotDraft(draft, index + 1);
  });

  return {
    format,
    rows,
    validSpots: rows.map((r) => r.spot).filter((s): s is GuideSpot => s !== null),
    errorCount: rows.filter((r) => r.errors.length > 0).length,
    warningCount: rows.filter((r) => r.warnings.length > 0).length,
  };
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateSampleCsv(): string {
  const headers = [
    '名稱',
    '分類',
    '村落',
    '地址',
    '緯度',
    '經度',
    '簡介',
    '導覽介紹',
    '亮點',
    '建議停留時間',
    '推薦時段',
    '學生作者',
    '班級',
  ];
  const sampleRows = [
    [
      '珍珠社區稻草工藝館',
      '產物',
      '珍珠村',
      '宜蘭縣冬山鄉珍珠村幸福二路73號',
      '24.6512',
      '121.8058',
      '將收割後的廢棄稻草轉化為稻草面具、草編偶與風箏的社區工藝基地。',
      '珍珠社區早年為冬山重要稻米產區，社區居民與工藝師傅將二期稻作收割後的稻草重新洗淨、乾燥與編織，發展出聞名全臺的稻草文化節與手作體驗課程。',
      '稻草編織DIY;農村循環再生;冬山米食文化',
      '60',
      '下午',
      '林書宇',
      '冬山國中 802',
    ],
    [
      '冬山老街百年中藥鋪與木造街屋',
      '歷史',
      '冬山村',
      '宜蘭縣冬山鄉冬山路一段',
      '24.6345',
      '121.7916',
      '沿著舊冬山河碼頭展開的街屋聚落，保留昭和時期洗石子立面與老藥櫃。',
      '早期冬山農產與茶葉經由冬山河水運集散，老街一帶形成熱鬧的米店、中藥鋪與雜貨行。漫步騎樓下仍可觀察到傳統木格窗與洗石子山牆。',
      '洗石子建築立面;冬山河水運記憶;老街騎樓走讀',
      '45',
      '上午',
      '陳品蓁',
      '冬山國中 803',
    ],
  ];

  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...sampleRows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  return `\uFEFF${lines.join('\n')}`;
}

export function exportSpotsToCsv(spots: GuideSpot[]): string {
  const headers = [
    '名稱',
    '分類',
    '村落',
    '地址',
    '緯度',
    '經度',
    '簡介',
    '導覽介紹',
    '亮點',
    '建議停留時間',
    '推薦時段',
    '學生作者',
    '班級',
    '圖片網址',
  ];
  const rows = spots.map((s) =>
    [
      s.name,
      s.category,
      s.village,
      s.address,
      s.lat,
      s.lng,
      s.summary,
      s.story,
      s.highlights.join(';'),
      s.stayMinutes,
      s.bestTime,
      s.authorName,
      s.authorClass,
      s.imageUrl ?? '',
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  return `\uFEFF${[headers.map(escapeCsvCell).join(','), ...rows].join('\n')}`;
}

export function exportSpotsToJson(spots: GuideSpot[]): string {
  return JSON.stringify(spots, null, 2);
}

