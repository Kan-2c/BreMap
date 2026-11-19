export type TravelMode = 'TWO_WHEELER' | 'DRIVE' | 'BICYCLE' | 'WALK' | 'TRANSIT';

export type WorkspaceTab = 'routes' | 'places' | 'saved';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface RouteBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface RouteGeometryMetrics {
  pointCount: number;
  pathDistanceKm: number;
  crowFliesKm: number;
  sinuosityIndex: number;
  initialBearingDeg: number;
  cardinalDirection: string;
  midpoint: LatLngPoint | null;
  bounds: RouteBounds | null;
}

export interface ElevationProfilePoint {
  index: number;
  distanceKm: number;
  elevationM: number;
  gradePct: number;
  lat: number;
  lng: number;
}

export interface ElevationAnalytics {
  sampleCount: number;
  minElevationM: number;
  maxElevationM: number;
  netChangeM: number;
  totalGainM: number;
  totalLossM: number;
  maxClimbGradePct: number;
  maxDescentGradePct: number;
  avgAbsGradePct: number;
  profile: ElevationProfilePoint[];
}

export interface RouteStop {
  role: 'origin' | 'waypoint' | 'destination';
  label: string;
  location: LatLngPoint;
}

export interface RouteStep {
  instruction: string;
  maneuver: string;
  distanceMeters: number;
  durationSeconds: number;
  location: LatLngPoint;
}

export interface RouteLeg {
  legIndex: number;
  fromLabel: string;
  toLabel: string;
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
}

export interface AnalyzedRoute {
  originLabel: string;
  destinationLabel: string;
  travelMode: TravelMode;
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  averageSpeedKmh: number;
  estimatedAutoFareInr: number;
  encodedPolyline: string;
  path: LatLngPoint[];
  viewport: RouteBounds | null;
  geometry: RouteGeometryMetrics;
  elevation: ElevationAnalytics;
  elevationWarning?: string | null;
  stops: RouteStop[];
  legs: RouteLeg[];
  optimizedIntermediateWaypointIndex?: number[] | null;
  processingMs: number;
}

export interface DiscoveredPlace {
  id: string;
  name: string;
  address: string;
  category: string;
  primaryType: string;
  location: LatLngPoint;
  rating: number | null;
  userRatingCount: number;
  priceLevel?: string | null;
  openNow: boolean | null;
  googleMapsUri: string;
  websiteUri: string;
  distanceFromAnchorKm: number;
  corridorOffsetKm: number;
  spatialScore: number;
}

export interface PlaceDiscoveryResponse {
  count: number;
  searchMode: 'corridor' | 'center';
  center: LatLngPoint;
  places: DiscoveredPlace[];
  processingMs: number;
}

export interface GeocodeInspection {
  formattedAddress: string;
  placeId: string;
  location: LatLngPoint;
  elevationM: number | null;
  processingMs: number;
}

export interface SavedRouteRecord {
  id: string;
  name: string;
  origin: string;
  destination: string;
  intermediates: string[];
  travelMode: TravelMode;
  avoidTolls: boolean;
  avoidHighways: boolean;
  distanceKm: number;
  durationSeconds: number;
  totalGainM: number;
  savedAtIso: string;
}

export interface BackendHealth {
  status: string;
  service: string;
  pythonVersion: string;
  mapsKeyConfigured: boolean;
  attributionId: string;
}
