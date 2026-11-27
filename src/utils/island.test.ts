import assert from 'node:assert/strict';
import test from 'node:test';
import { SEED_DONGSHAN_SPOTS } from '../data/dongshanSeed.ts';
import {
  ISLAND_HEX_LAYOUTS,
  ISLAND_WORLD_HEIGHT,
  ISLAND_WORLD_WIDTH,
  computeSpotIslandPositions,
  findNearestIslandSpot,
  latLngToIslandCoords,
  moveTowardsTarget,
  stepPlayerPosition,
} from './island.ts';

test('computeSpotIslandPositions assigns every seed spot onto its matching theme island', () => {
  const nodes = computeSpotIslandPositions(SEED_DONGSHAN_SPOTS);
  assert.equal(nodes.length, SEED_DONGSHAN_SPOTS.length);
  for (const node of nodes) {
    assert.equal(node.island.category, node.spot.category);
    assert.ok(node.x > 0 && node.x < ISLAND_WORLD_WIDTH);
    assert.ok(node.y > 0 && node.y < ISLAND_WORLD_HEIGHT);
  }
  assert.equal(ISLAND_HEX_LAYOUTS.length, 6);
});

test('latLngToIslandCoords maps Dongshan Township coords into bounded island space', () => {
  const station = latLngToIslandCoords({ lat: 24.6361, lng: 121.7921 });
  const meihua = latLngToIslandCoords({ lat: 24.6441, lng: 121.7322 });
  assert.ok(station.x > meihua.x, 'Station should be east of Meihua Lake on the island');
  assert.ok(station.y > meihua.y, 'Station is slightly south of Meihua Lake');
});

test('stepPlayerPosition and moveTowardsTarget move character cleanly within bounds', () => {
  const stepped = stepPlayerPosition({ x: 50, y: 50 }, -100, 20);
  assert.equal(stepped.x, 42, 'Should clamp to left boundary');
  assert.equal(stepped.y, 70);

  const step1 = moveTowardsTarget({ x: 100, y: 100 }, { x: 200, y: 100 }, 25);
  assert.equal(step1.arrived, false);
  assert.equal(step1.next.x, 125);

  const stepFinal = moveTowardsTarget({ x: 190, y: 100 }, { x: 200, y: 100 }, 25);
  assert.equal(stepFinal.arrived, true);
  assert.deepEqual(stepFinal.next, { x: 200, y: 100 });
});

test('findNearestIslandSpot detects when traveler walks near a spot', () => {
  const nodes = computeSpotIslandPositions(SEED_DONGSHAN_SPOTS);
  const target = nodes[0];
  const near = findNearestIslandSpot({ x: target.x + 12, y: target.y - 8 }, nodes, 55);
  assert.equal(near?.spot.id, target.spot.id);

  const far = findNearestIslandSpot({ x: 42, y: 42 }, nodes, 20);
  assert.equal(far, null);
});
