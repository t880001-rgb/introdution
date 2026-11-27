import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exportSpotsToCsv,
  exportSpotsToJson,
  generateSampleCsv,
  parseStudentImportText,
  validateSpotDraft,
} from './importer';

test('generateSampleCsv round-trips cleanly through parseStudentImportText', () => {
  const csv = generateSampleCsv();
  const parsed = parseStudentImportText(csv);
  assert.equal(parsed.format, 'csv');
  assert.equal(parsed.errorCount, 0);
  assert.equal(parsed.validSpots.length, 2);
  assert.equal(parsed.validSpots[0].name, '珍珠社區稻草工藝館');
  assert.equal(parsed.validSpots[0].category, '產物');
  assert.equal(parsed.validSpots[0].authorName, '林書宇');
  assert.equal(parsed.validSpots[0].source, 'student');
});

test('parseStudentImportText parses Google Sheets TSV clipboard paste', () => {
  const tsv = [
    '名稱\t分類\t村落\t緯度\t經度\t簡介\t學生作者',
    '大進蜜餞與百年茄苳\t歷史\t大進村\t24.6311\t121.7165\t大進社區傳統農產與百年老樹故事。\t陳同學',
  ].join('\n');

  const parsed = parseStudentImportText(tsv);
  assert.equal(parsed.format, 'tsv');
  assert.equal(parsed.validSpots.length, 1);
  assert.equal(parsed.validSpots[0].village, '大進村');
  assert.equal(parsed.validSpots[0].category, '歷史');
});

test('parseStudentImportText parses JSON array and flags invalid rows cleanly', () => {
  const json = JSON.stringify([
    {
      name: '冬山茶席體驗',
      category: '農業',
      lat: 24.625,
      lng: 121.737,
      summary: '體驗有機採茶與品茗。',
      authorName: '王小明',
    },
    {
      name: '',
      category: '不存在分類',
      lat: 'abc',
      lng: 121.73,
      summary: '',
    },
  ]);

  const parsed = parseStudentImportText(json);
  assert.equal(parsed.format, 'json');
  assert.equal(parsed.validSpots.length, 1);
  assert.equal(parsed.errorCount, 1);
  assert.ok(parsed.rows[1].errors.length >= 3);
});

test('validateSpotDraft rejects out-of-Taiwan coordinates and accepts valid draft', () => {
  const invalid = validateSpotDraft({
    name: '測試景點',
    category: '美食',
    lat: 121.79, // swapped lat/lng
    lng: 24.63,
    summary: '測試',
  });
  assert.equal(invalid.spot, null);
  assert.ok(invalid.errors.some((e) => e.includes('臺灣範圍')));

  const valid = validateSpotDraft({
    name: '冬山春捲伯',
    category: '美食',
    village: '冬山村',
    lat: '24.6347',
    lng: '121.7917',
    summary: '現包現炸高麗菜韭菜春捲。',
    authorName: '林同學',
    authorClass: '801',
  });
  assert.ok(valid.spot);
  assert.equal(valid.errors.length, 0);
});

test('exportSpotsToCsv exports BOM-prefixed CSV parseable back into spots', () => {
  const sample = parseStudentImportText(generateSampleCsv()).validSpots;
  const exported = exportSpotsToCsv(sample);
  assert.ok(exported.startsWith('\uFEFF'));
  const reimported = parseStudentImportText(exported);
  assert.equal(reimported.validSpots.length, sample.length);
  assert.equal(reimported.validSpots[1].name, sample[1].name);
});

test('exportSpotsToJson exports formatted JSON parseable back into spots', () => {
  const sample = parseStudentImportText(generateSampleCsv()).validSpots;
  const exported = exportSpotsToJson(sample);
  const parsedJson = JSON.parse(exported);
  assert.ok(Array.isArray(parsedJson));
  assert.equal(parsedJson.length, sample.length);
  assert.equal(parsedJson[0].name, sample[0].name);
  assert.equal(parsedJson[0].authorName, sample[0].authorName);
  assert.equal(parsedJson[0].authorClass, sample[0].authorClass);
  assert.deepEqual(parsedJson[0].highlights, sample[0].highlights);

  const reimported = parseStudentImportText(exported);
  assert.equal(reimported.format, 'json');
  assert.equal(reimported.errorCount, 0);
  assert.equal(reimported.validSpots.length, sample.length);
  assert.equal(reimported.validSpots[0].name, sample[0].name);
  assert.equal(reimported.validSpots[1].lat, sample[1].lat);
  assert.equal(reimported.validSpots[1].lng, sample[1].lng);
});

