import type {
  GuideCategory,
  GuideSpot,
  ItineraryStop,
  LatLngPoint,
  RecommendationPreferences,
  RecommendationThemeId,
  RecommendedItinerary,
  ScoredSpot,
} from '../types/guide';
import { estimateTravelMinutes, haversineDistanceKm } from './geo';

export interface RecommendationThemeMeta {
  id: RecommendationThemeId;
  label: string;
  subtitle: string;
  categories: GuideCategory[];
}

export const RECOMMENDATION_THEMES: RecommendationThemeMeta[] = [
  {
    id: 'tea-eco',
    label: '茶香生態慢旅',
    subtitle: '串聯冬山河濕地、茶園梯田與在地製茶產物',
    categories: ['風景', '農業', '產物'],
  },
  {
    id: 'heritage-walk',
    label: '舊城人文歷史巡禮',
    subtitle: '走讀鐵道瓜棚車站、冬山老街與百年拓墾史蹟',
    categories: ['人文', '歷史'],
  },
  {
    id: 'food-market',
    label: '冬山老街尋味食旅',
    subtitle: '從早市粉圓冰、米粉羹到地方手作糕點',
    categories: ['美食', '人文', '產物'],
  },
  {
    id: 'family-farm',
    label: '親子農遊手作體驗',
    subtitle: '休閒農場、稻草工藝與山林步道輕鬆同遊',
    categories: ['農業', '風景', '產物'],
  },
  {
    id: 'custom',
    label: '自選主題探索',
    subtitle: '依自己偏好的冬山面向自由組合推薦景點',
    categories: ['人文', '風景', '歷史', '產物', '農業', '美食'],
  },
];

export function scoreSpotForRecommendation(
  spot: GuideSpot,
  prefs: RecommendationPreferences,
  referencePoint: LatLngPoint
): ScoredSpot {
  const themeMeta = RECOMMENDATION_THEMES.find((t) => t.id === prefs.theme);
  const targetCategories =
    prefs.theme === 'custom' && prefs.customCategories.length > 0
      ? prefs.customCategories
      : themeMeta?.categories ?? ['人文', '風景'];

  let score = 40;
  const reasons: string[] = [];

  if (targetCategories.includes(spot.category)) {
    score += 32;
    reasons.push(`符合「${spot.category}」主題`);
  }

  if (prefs.timeOfDay === '全日' || spot.bestTime === '全日') {
    score += 10;
  } else if (spot.bestTime === prefs.timeOfDay) {
    score += 18;
    reasons.push(`適合${prefs.timeOfDay}造訪`);
  }

  const distanceKm = haversineDistanceKm(referencePoint, { lat: spot.lat, lng: spot.lng });
  const travelMinutes = estimateTravelMinutes(distanceKm, prefs.travelMode);

  if (distanceKm <= 2.5) {
    score += 14;
    reasons.push(`距離起點僅 ${distanceKm.toFixed(1)} 公里`);
  } else if (distanceKm <= 6) {
    score += 8;
  } else {
    score -= Math.min(12, Math.floor((distanceKm - 6) * 1.5));
  }

  if (prefs.preferStudentContent && spot.source === 'student') {
    score += 15;
    reasons.push(`學生踏查新作（${spot.authorName}）`);
  }

  if (reasons.length === 0) {
    reasons.push(`${spot.village}代表性站點`);
  }

  return {
    spot,
    score,
    distanceKm,
    travelMinutes,
    reasons,
  };
}

export function rankSpotsForRecommendation(
  spots: GuideSpot[],
  prefs: RecommendationPreferences,
  referencePoint: LatLngPoint
): ScoredSpot[] {
  return spots
    .map((spot) => scoreSpotForRecommendation(spot, prefs, referencePoint))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.distanceKm - b.distanceKm;
    });
}

export function buildRecommendedItinerary(
  spots: GuideSpot[],
  prefs: RecommendationPreferences,
  origin: LatLngPoint
): RecommendedItinerary {
  if (spots.length === 0) {
    return {
      stops: [],
      totalDistanceKm: 0,
      totalTravelMinutes: 0,
      totalStayMinutes: 0,
      totalMinutes: 0,
    };
  }

  const ranked = rankSpotsForRecommendation(spots, prefs, origin);
  // Pick top candidates first (up to 8), then order via nearest-neighbor within time budget
  const candidatePool = ranked.slice(0, Math.min(8, ranked.length));
  const remaining = [...candidatePool];
  const stops: ItineraryStop[] = [];

  let currentPoint: LatLngPoint = origin;
  let cumulativeMinutes = 0;
  let totalDistanceKm = 0;
  let totalTravelMinutes = 0;
  let totalStayMinutes = 0;

  while (remaining.length > 0 && stops.length < 5) {
    // Choose the candidate balancing high theme score and short hop distance
    let bestIdx = 0;
    let bestCombined = -Infinity;

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      const hopDist = haversineDistanceKm(currentPoint, {
        lat: candidate.spot.lat,
        lng: candidate.spot.lng,
      });
      const combined = candidate.score - hopDist * 3.5;
      if (combined > bestCombined) {
        bestCombined = combined;
        bestIdx = i;
      }
    }

    const chosen = remaining.splice(bestIdx, 1)[0];
    const legDistanceKm = haversineDistanceKm(currentPoint, {
      lat: chosen.spot.lat,
      lng: chosen.spot.lng,
    });
    const legTravelMinutes = estimateTravelMinutes(legDistanceKm, prefs.travelMode);
    const projectedTotal = cumulativeMinutes + legTravelMinutes + chosen.spot.stayMinutes;

    if (stops.length > 0 && projectedTotal > prefs.budgetMinutes) {
      continue;
    }

    cumulativeMinutes = projectedTotal;
    totalDistanceKm += legDistanceKm;
    totalTravelMinutes += legTravelMinutes;
    totalStayMinutes += chosen.spot.stayMinutes;

    stops.push({
      order: stops.length + 1,
      spot: chosen.spot,
      legDistanceKm,
      legTravelMinutes,
      stayMinutes: chosen.spot.stayMinutes,
      cumulativeMinutes,
      reasons: chosen.reasons,
    });

    currentPoint = { lat: chosen.spot.lat, lng: chosen.spot.lng };
  }

  return {
    stops,
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
    totalTravelMinutes,
    totalStayMinutes,
    totalMinutes: cumulativeMinutes,
  };
}
