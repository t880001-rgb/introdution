import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_DONGSHAN_SPOTS } from '../data/dongshanSeed';
import { DONGSHAN_STATION_ORIGIN } from './geo';
import { buildRecommendedItinerary, rankSpotsForRecommendation } from './recommendations';

test('rankSpotsForRecommendation prioritizes matching theme categories and student preference', () => {
  const studentSpot = {
    ...SEED_DONGSHAN_SPOTS[0],
    id: 'student-food-1',
    name: '學生新增冬山麻糬攤',
    category: '美食' as const,
    bestTime: '下午' as const,
    source: 'student' as const,
  };

  const ranked = rankSpotsForRecommendation(
    [...SEED_DONGSHAN_SPOTS, studentSpot],
    {
      theme: 'food-market',
      customCategories: [],
      timeOfDay: '下午',
      budgetMinutes: 240,
      travelMode: 'DRIVING',
      preferStudentContent: true,
    },
    DONGSHAN_STATION_ORIGIN
  );

  assert.equal(ranked[0].spot.id, 'student-food-1');
  assert.ok(ranked[0].reasons.some((r) => r.includes('學生踏查')));
});

test('buildRecommendedItinerary respects time budget and orders multiple stops', () => {
  const itinerary = buildRecommendedItinerary(
    SEED_DONGSHAN_SPOTS,
    {
      theme: 'tea-eco',
      customCategories: [],
      timeOfDay: '全日',
      budgetMinutes: 240,
      travelMode: 'DRIVING',
      preferStudentContent: false,
    },
    DONGSHAN_STATION_ORIGIN
  );

  assert.ok(itinerary.stops.length >= 2);
  assert.ok(itinerary.totalMinutes <= 240);
  assert.equal(itinerary.stops[0].order, 1);
  assert.equal(itinerary.stops[1].order, 2);
});
