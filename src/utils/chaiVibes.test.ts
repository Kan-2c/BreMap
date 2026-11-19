import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAI_VIBES_PLAYLIST,
  formatAudioTime,
  getNextTrackIndex,
  getPrevTrackIndex,
  HERO_CATEGORIES,
} from './chaiVibes';

test('formatAudioTime renders m:ss cleanly', () => {
  assert.equal(formatAudioTime(0), '0:00');
  assert.equal(formatAudioTime(45), '0:45');
  assert.equal(formatAudioTime(212), '3:32');
  assert.equal(formatAudioTime(-5), '0:00');
});

test('track cycling advances and wraps cleanly', () => {
  assert.equal(getNextTrackIndex(0, 3, false), 1);
  assert.equal(getNextTrackIndex(2, 3, false), 0);
  assert.equal(getPrevTrackIndex(0, 3), 2);
  assert.notEqual(getNextTrackIndex(0, 3, true), 0);
});

test('hero categories and playlist match Indian Chai Tapri theme', () => {
  assert.equal(HERO_CATEGORIES.length, 5);
  assert.equal(HERO_CATEGORIES[0].label, 'Chai Tapri');
  assert.equal(CHAI_VIBES_PLAYLIST[0].title, 'Raataan Lambiyan');
});
