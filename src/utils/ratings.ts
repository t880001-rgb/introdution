import type { SpotRatingRecord } from '../types/guide';

export type SpotRatingsMap = Record<string, SpotRatingRecord>;

export const SEED_SPOT_RATINGS: SpotRatingsMap = {
  'seed-station': { spotId: 'seed-station', totalScore: 86, count: 18, userRating: 0 },
  'seed-eco-ark': { spotId: 'seed-eco-ark', totalScore: 72, count: 15, userRating: 0 },
  'seed-meihua-lake': { spotId: 'seed-meihua-lake', totalScore: 95, count: 20, userRating: 0 },
  'seed-zhongshan-tea': { spotId: 'seed-zhongshan-tea', totalScore: 58, count: 12, userRating: 0 },
  'seed-old-pier': { spotId: 'seed-old-pier', totalScore: 41, count: 9, userRating: 0 },
  'seed-shunan-heritage': { spotId: 'seed-shunan-heritage', totalScore: 37, count: 8, userRating: 0 },
  'seed-liangshi': { spotId: 'seed-liangshi', totalScore: 46, count: 10, userRating: 0 },
  'seed-pearl-straw': { spotId: 'seed-pearl-straw', totalScore: 43, count: 9, userRating: 0 },
  'seed-xinliao': { spotId: 'seed-xinliao', totalScore: 67, count: 14, userRating: 0 },
  'seed-sanfu-farm': { spotId: 'seed-sanfu-farm', totalScore: 51, count: 11, userRating: 0 },
  'seed-old-street-food': { spotId: 'seed-old-street-food', totalScore: 78, count: 16, userRating: 0 },
  'seed-wuyuan-park': { spotId: 'seed-wuyuan-park', totalScore: 55, count: 12, userRating: 0 },
};

export interface SpotRatingSummary {
  average: number;
  formattedAverage: string;
  count: number;
  userRating: number;
}

export function getSpotRatingSummary(
  ratings: SpotRatingsMap,
  spotId: string
): SpotRatingSummary {
  const record = ratings[spotId];
  if (!record || record.count <= 0) {
    return {
      average: 0,
      formattedAverage: '0.0',
      count: 0,
      userRating: record?.userRating ?? 0,
    };
  }
  const avg = record.totalScore / record.count;
  return {
    average: Number(avg.toFixed(1)),
    formattedAverage: avg.toFixed(1),
    count: record.count,
    userRating: record.userRating,
  };
}

export function submitSpotRating(
  ratings: SpotRatingsMap,
  spotId: string,
  stars: number
): SpotRatingsMap {
  const cleanStars = Math.round(stars);
  if (cleanStars < 1 || cleanStars > 5 || !spotId.trim()) {
    return ratings;
  }

  const existing = ratings[spotId] ?? {
    spotId,
    totalScore: 0,
    count: 0,
    userRating: 0,
  };

  const hasRatedBefore = existing.userRating >= 1 && existing.userRating <= 5;
  const nextTotalScore = hasRatedBefore
    ? existing.totalScore - existing.userRating + cleanStars
    : existing.totalScore + cleanStars;
  const nextCount = hasRatedBefore ? existing.count : existing.count + 1;

  return {
    ...ratings,
    [spotId]: {
      spotId,
      totalScore: Math.max(0, nextTotalScore),
      count: Math.max(1, nextCount),
      userRating: cleanStars,
    },
  };
}
