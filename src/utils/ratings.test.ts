import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SEED_SPOT_RATINGS,
  getSpotRatingSummary,
  submitSpotRating,
} from './ratings.ts';

test('getSpotRatingSummary computes formatted average for seeded and unrated spots', () => {
  const station = getSpotRatingSummary(SEED_SPOT_RATINGS, 'seed-station');
  assert.equal(station.count, 18);
  assert.equal(station.formattedAverage, '4.8');
  assert.equal(station.userRating, 0);

  const unrated = getSpotRatingSummary(SEED_SPOT_RATINGS, 'student-spot-new');
  assert.equal(unrated.count, 0);
  assert.equal(unrated.formattedAverage, '0.0');
  assert.equal(unrated.userRating, 0);
});

test('submitSpotRating adds initial rating and updates existing user rating without double counting', () => {
  const first = submitSpotRating(SEED_SPOT_RATINGS, 'student-spot-1', 5);
  const summary1 = getSpotRatingSummary(first, 'student-spot-1');
  assert.equal(summary1.count, 1);
  assert.equal(summary1.average, 5);
  assert.equal(summary1.userRating, 5);

  const updated = submitSpotRating(first, 'student-spot-1', 3);
  const summary2 = getSpotRatingSummary(updated, 'student-spot-1');
  assert.equal(summary2.count, 1);
  assert.equal(summary2.average, 3);
  assert.equal(summary2.userRating, 3);

  const seededNext = submitSpotRating(updated, 'seed-station', 5);
  const stationSummary = getSpotRatingSummary(seededNext, 'seed-station');
  assert.equal(stationSummary.count, 19);
  assert.equal(stationSummary.userRating, 5);
});

test('submitSpotRating ignores out-of-range star values', () => {
  const unchanged = submitSpotRating(SEED_SPOT_RATINGS, 'seed-station', 6);
  assert.equal(unchanged, SEED_SPOT_RATINGS);
  const unchangedZero = submitSpotRating(SEED_SPOT_RATINGS, 'seed-station', 0);
  assert.equal(unchangedZero, SEED_SPOT_RATINGS);
});
