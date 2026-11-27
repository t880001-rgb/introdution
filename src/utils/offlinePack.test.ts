import assert from 'node:assert/strict';
import test from 'node:test';
import { SEED_DONGSHAN_SPOTS } from '../data/dongshanSeed.ts';
import {
  buildOfflinePackPayload,
  generateOfflineHtmlHandbook,
  generateOfflineMapSnapshotSvg,
} from './offlinePack.ts';

test('buildOfflinePackPayload enriches all spots with offline distance and travel estimates', () => {
  const payload = buildOfflinePackPayload(SEED_DONGSHAN_SPOTS);
  assert.equal(payload.spotCount, SEED_DONGSHAN_SPOTS.length);
  assert.equal(payload.spots.length, SEED_DONGSHAN_SPOTS.length);
  const lake = payload.spots.find((s) => s.id === 'seed-meihua-lake');
  assert.ok(lake);
  assert.ok(lake.distanceFromOriginKm > 5);
  assert.ok(lake.estimatedBicyclingMinutes > 10);
});

test('generateOfflineMapSnapshotSvg produces valid SVG containing all spots and coordinates', () => {
  const svg = generateOfflineMapSnapshotSvg(SEED_DONGSHAN_SPOTS);
  assert.ok(svg.startsWith('<?xml'));
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('冬山鄉導覽誌｜離線導覽地圖快照'));
  assert.ok(svg.includes('梅花湖風景區'));
  assert.ok(svg.includes('24.6441, 121.7322'));
});

test('generateOfflineHtmlHandbook builds self-contained offline HTML with escaped content and embedded map', () => {
  const customSpots = [
    {
      ...SEED_DONGSHAN_SPOTS[0],
      name: '冬山<測試>站',
    },
    ...SEED_DONGSHAN_SPOTS.slice(1, 3),
  ];
  const html = generateOfflineHtmlHandbook(customSpots);
  assert.ok(html.includes('<!doctype html>'));
  assert.ok(html.includes('<svg'));
  assert.ok(html.includes('冬山&lt;測試&gt;站'));
  assert.ok(!html.includes('冬山<測試>站'));
});
