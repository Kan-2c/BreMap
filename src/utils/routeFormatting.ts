import type {SavedRouteRecord, TravelMode} from '../types/bremap';

export interface RoutePreset {
  id: string;
  title: string;
  subtitle: string;
  origin: string;
  destination: string;
  intermediates: string[];
  travelMode: TravelMode;
}

export const ROUTE_PRESETS: RoutePreset[] = [
  {
    id: 'mumbai-sea-link',
    title: 'Mumbai Marine Drive to Bandra',
    subtitle: 'Arabian Sea promenade & Sea Link auto run',
    origin: 'Nariman Point, Mumbai, Maharashtra',
    destination: 'Carter Road, Bandra West, Mumbai, Maharashtra',
    intermediates: ['Bandra-Worli Sea Link Viewpoint, Mumbai, Maharashtra'],
    travelMode: 'TWO_WHEELER',
  },
  {
    id: 'bengaluru-cubbon-indiranagar',
    title: 'Bengaluru Cubbon & Indiranagar',
    subtitle: 'Canopy avenue & metro chai circuit',
    origin: 'MG Road Metro Station, Bengaluru, Karnataka',
    destination: '100 Feet Road, Indiranagar, Bengaluru, Karnataka',
    intermediates: ['Cubbon Park, Bengaluru, Karnataka'],
    travelMode: 'BICYCLE',
  },
  {
    id: 'jaipur-nahargarh-climb',
    title: 'Jaipur Hawa Mahal to Nahargarh',
    subtitle: 'Pink City bazaar to Aravalli ridge climb',
    origin: 'Hawa Mahal, Jaipur, Rajasthan',
    destination: 'Nahargarh Fort, Jaipur, Rajasthan',
    intermediates: ['Jal Mahal, Jaipur, Rajasthan'],
    travelMode: 'DRIVE',
  },
];

export function formatDistanceKm(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return '0.0 km';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(distanceKm >= 100 ? 0 : 1)} km`;
}

export function formatDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min';
  const totalMins = Math.round(seconds / 60);
  if (totalMins < 60) {
    return `${totalMins} min`;
  }
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatElevationMeters(meters: number): string {
  if (!Number.isFinite(meters)) return '0 m';
  return `${Math.round(meters)} m`;
}

export function formatInrFare(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function classifyGradeSeverity(gradePct: number): {
  label: string;
  tone: 'neutral' | 'climb' | 'steep' | 'descent';
} {
  if (!Number.isFinite(gradePct)) return {label: 'Flat', tone: 'neutral'};
  if (gradePct >= 6) return {label: 'Steep Climb', tone: 'steep'};
  if (gradePct >= 2) return {label: 'Moderate Climb', tone: 'climb'};
  if (gradePct <= -4) return {label: 'Steep Descent', tone: 'descent'};
  if (gradePct <= -1.5) return {label: 'Gentle Descent', tone: 'descent'};
  return {label: 'Flat', tone: 'neutral'};
}

export function sanitizeFilenameSlug(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || 'bremap-export';
}

export function validateRouteInputs(
  origin: string,
  destination: string
): {valid: boolean; originError: string | null; destinationError: string | null} {
  const cleanOrigin = origin.trim();
  const cleanDest = destination.trim();
  return {
    valid: cleanOrigin.length > 0 && cleanDest.length > 0,
    originError: cleanOrigin.length === 0 ? 'Origin address or coordinate is required.' : null,
    destinationError: cleanDest.length === 0 ? 'Destination address or coordinate is required.' : null,
  };
}

export const SAVED_ROUTES_STORAGE_KEY = 'bremap.savedRoutes.v1';

export function parseSavedRoutes(rawJson: string | null): SavedRouteRecord[] {
  if (!rawJson) return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedRouteRecord =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.origin === 'string' &&
        typeof item.destination === 'string'
    );
  } catch {
    return [];
  }
}
