import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyGradeSeverity,
  formatDistanceKm,
  formatDurationSeconds,
  formatElevationMeters,
  formatInrFare,
  parseSavedRoutes,
  ROUTE_PRESETS,
  sanitizeFilenameSlug,
  validateRouteInputs,
} from './routeFormatting';

test('formatDistanceKm renders meters below 1km and km above', () => {
  assert.equal(formatDistanceKm(0.45), '450 m');
  assert.equal(formatDistanceKm(12.34), '12.3 km');
  assert.equal(formatDistanceKm(142.8), '143 km');
});

test('formatDurationSeconds renders mins and hours cleanly', () => {
  assert.equal(formatDurationSeconds(0), '0 min');
  assert.equal(formatDurationSeconds(1500), '25 min');
  assert.equal(formatDurationSeconds(4500), '1h 15m');
  assert.equal(formatDurationSeconds(7200), '2h');
});

test('formatElevationMeters rounds cleanly', () => {
  assert.equal(formatElevationMeters(142.6), '143 m');
});

test('formatInrFare formats Indian rupee estimates cleanly', () => {
  assert.equal(formatInrFare(0), '₹0');
  assert.equal(formatInrFare(-15), '₹0');
  assert.equal(formatInrFare(184.6), '₹185');
  assert.equal(formatInrFare(1250), '₹1,250');
  assert.ok(ROUTE_PRESETS.some((p) => p.origin.includes('Mumbai')));
});

test('classifyGradeSeverity distinguishes climbs, descents, and flat', () => {
  assert.equal(classifyGradeSeverity(0.4).tone, 'neutral');
  assert.equal(classifyGradeSeverity(3.2).tone, 'climb');
  assert.equal(classifyGradeSeverity(8.5).tone, 'steep');
  assert.equal(classifyGradeSeverity(-5.0).tone, 'descent');
});

test('validateRouteInputs rejects empty origin or destination', () => {
  const empty = validateRouteInputs('  ', 'Sausalito');
  assert.equal(empty.valid, false);
  assert.ok(empty.originError);
  assert.equal(empty.destinationError, null);

  const ok = validateRouteInputs('San Francisco', 'Sausalito');
  assert.equal(ok.valid, true);
});

test('sanitizeFilenameSlug produces safe export filename slugs', () => {
  assert.equal(sanitizeFilenameSlug('San Francisco -> Sausalito!'), 'san-francisco-sausalito');
  assert.equal(sanitizeFilenameSlug('   '), 'bremap-export');
});

test('parseSavedRoutes handles invalid JSON and filters malformed records', () => {
  assert.deepEqual(parseSavedRoutes('not-json'), []);
  const validJson = JSON.stringify([
    {
      id: 'r1',
      name: 'Bridge Run',
      origin: 'SF',
      destination: 'Sausalito',
      intermediates: [],
      travelMode: 'DRIVE',
      avoidTolls: false,
      avoidHighways: false,
      distanceKm: 12.4,
      durationSeconds: 1200,
      totalGainM: 180,
      savedAtIso: '2026-11-18T12:00:00Z',
    },
    {broken: true},
  ]);
  const parsed = parseSavedRoutes(validJson);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, 'Bridge Run');
});
