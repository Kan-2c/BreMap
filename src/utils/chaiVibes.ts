export interface ChaiVibeTrack {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  initialElapsedSec: number;
  chordHz: number[];
}

export interface HeroCategoryOption {
  id: string;
  label: string;
  query: string;
}

export const HERO_CATEGORIES: HeroCategoryOption[] = [
  {id: 'chai-tapri', label: 'Chai Tapri', query: 'chai tea stall'},
  {id: 'coffee-stalls', label: 'Coffee Stalls', query: 'filter coffee stall'},
  {id: 'cafes', label: 'Cafés', query: 'cafe coffee house'},
  {id: 'trending-spots', label: 'Trending Spots', query: 'popular hangout cafe'},
  {id: 'hidden-gems', label: 'Hidden Gems', query: 'irani cafe bakery chai'},
];

export const CHAI_VIBES_PLAYLIST: ChaiVibeTrack[] = [
  {
    id: 'raataan-lambiyan',
    title: 'Raataan Lambiyan',
    artist: 'Jubin Nautiyal',
    durationSec: 212,
    initialElapsedSec: 45,
    chordHz: [261.63, 329.63, 392.0, 493.88],
  },
  {
    id: 'monsoon-tapri',
    title: 'Monsoon Tapri Lo-Fi',
    artist: 'Bombay Rain Sessions',
    durationSec: 184,
    initialElapsedSec: 18,
    chordHz: [220.0, 261.63, 329.63, 440.0],
  },
  {
    id: 'marine-drive-dusk',
    title: 'Marine Drive Sunset',
    artist: 'Kulhad Acoustic',
    durationSec: 196,
    initialElapsedSec: 32,
    chordHz: [293.66, 369.99, 440.0, 523.25],
  },
];

export function formatAudioTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const clamped = Math.floor(totalSeconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getNextTrackIndex(
  currentIndex: number,
  total: number,
  shuffle: boolean
): number {
  if (total <= 1) return 0;
  if (!shuffle) {
    return (currentIndex + 1) % total;
  }
  return (currentIndex + 2) % total === currentIndex
    ? (currentIndex + 1) % total
    : (currentIndex + 2) % total;
}

export function getPrevTrackIndex(currentIndex: number, total: number): number {
  if (total <= 1) return 0;
  return (currentIndex - 1 + total) % total;
}
