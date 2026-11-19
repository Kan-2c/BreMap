import type {
  AnalyzedRoute,
  BackendHealth,
  GeocodeInspection,
  LatLngPoint,
  PlaceDiscoveryResponse,
  TravelMode,
} from '../types/bremap';

export class ApiClientError extends Error {
  status: number;
  code: string;
  isQuotaExceeded: boolean;

  constructor(message: string, status: number, code: string, isQuotaExceeded = false) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.isQuotaExceeded = isQuotaExceeded;
  }
}

function notifyQuotaIfNeeded(status: number, code?: string, isQuotaFlag?: boolean): boolean {
  const exceeded =
    status === 429 ||
    isQuotaFlag === true ||
    code === 'RESOURCE_EXHAUSTED' ||
    code === 'OVER_QUERY_LIMIT' ||
    code === 'OVER_DAILY_LIMIT';
  if (exceeded && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
  return exceeded;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    parsed = {};
  }

  if (!response.ok) {
    const errObj = (parsed.error as Record<string, unknown> | undefined) ?? {};
    const code = String(errObj.code ?? `HTTP_${response.status}`);
    const message = String(errObj.message ?? `Request failed with status ${response.status}`);
    const isQuota = notifyQuotaIfNeeded(
      response.status,
      code,
      Boolean(errObj.isQuotaExceeded)
    );
    throw new ApiClientError(message, response.status, code, isQuota);
  }

  return parsed as T;
}

export async function fetchClientConfig(): Promise<{
  mapsApiKey: string;
  attributionId: string;
}> {
  return requestJson('/api/client-config');
}

export async function fetchBackendHealth(): Promise<BackendHealth> {
  return requestJson('/api/health');
}

export async function analyzeRoute(params: {
  origin: string | LatLngPoint;
  destination: string | LatLngPoint;
  intermediates?: Array<string | LatLngPoint>;
  travelMode: TravelMode;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  optimizeWaypointOrder?: boolean;
}): Promise<AnalyzedRoute> {
  return requestJson<AnalyzedRoute>('/api/routes/analyze', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function discoverPlaces(params: {
  query?: string;
  includedTypes?: string[];
  center: LatLngPoint;
  radiusMeters: number;
  openNow: boolean;
  searchMode: 'corridor' | 'center';
  encodedPolyline?: string | null;
}): Promise<PlaceDiscoveryResponse> {
  return requestJson<PlaceDiscoveryResponse>('/api/places/discover', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function reverseGeocodeCoordinate(
  lat: number,
  lng: number
): Promise<GeocodeInspection> {
  const qs = new URLSearchParams({lat: String(lat), lng: String(lng)});
  return requestJson<GeocodeInspection>(`/api/geocode/reverse?${qs.toString()}`);
}

export async function searchGeocodeAddress(address: string): Promise<GeocodeInspection> {
  const qs = new URLSearchParams({address});
  return requestJson<GeocodeInspection>(`/api/geocode/search?${qs.toString()}`);
}

export async function exportGeoJsonCollection(
  route: AnalyzedRoute | null,
  places: PlaceDiscoveryResponse['places']
): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>('/api/export/geojson', {
    method: 'POST',
    body: JSON.stringify({route, places}),
  });
}
