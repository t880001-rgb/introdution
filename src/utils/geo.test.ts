import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoogleMapsDirectionsUrl,
  DONGSHAN_STATION_ORIGIN,
  estimateTravelMinutes,
  formatDistance,
  formatDuration,
  haversineDistanceKm,
  isWithinYilanBounds,
} from './geo';

test('haversineDistanceKm computes realistic Dongshan Station to Meihua Lake distance', () => {
  const meihuaLake = { lat: 24.6441, lng: 121.7322 };
  const km = haversineDistanceKm(DONGSHAN_STATION_ORIGIN, meihuaLake);
  assert.ok(km > 5.5 && km < 7.0, `Expected 5.5-7.0 km, got ${km}`);
});

test('estimateTravelMinutes scales appropriately by travel mode', () => {
  const driving = estimateTravelMinutes(6, 'DRIVING');
  const biking = estimateTravelMinutes(6, 'BICYCLING');
  const walking = estimateTravelMinutes(6, 'WALKING');
  assert.ok(driving < biking && biking < walking);
});

test('formatDistance and formatDuration produce Traditional Chinese readable units', () => {
  assert.equal(formatDistance(450), '450 公尺');
  assert.equal(formatDistance(2400), '2.4 公里');
  assert.equal(formatDuration(45), '45 分鐘');
  assert.equal(formatDuration(95), '1 小時 35 分');
});

test('isWithinYilanBounds validates Dongshan coordinates and rejects outside coords', () => {
  assert.equal(isWithinYilanBounds(24.6361, 121.7921), true);
  assert.equal(isWithinYilanBounds(22.6273, 120.3014), false); // Kaohsiung
});

test('buildGoogleMapsDirectionsUrl constructs valid URL with origin, destination, mode, waypoints', () => {
  const url = buildGoogleMapsDirectionsUrl(
    { lat: 24.6361, lng: 121.7921 },
    { lat: 24.6441, lng: 121.7322 },
    'BICYCLING',
    [{ lat: 24.6407, lng: 121.7905 }]
  );
  assert.ok(url.startsWith('https://www.google.com/maps/dir/?'));
  assert.ok(url.includes('travelmode=bicycling'));
  assert.ok(url.includes('waypoints=24.640700%2C121.790500'));
});
