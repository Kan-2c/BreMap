/// <reference types="google.maps" />
import {useEffect, useRef} from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMapView,
  Pin,
  useAdvancedMarkerRef,
  useMap,
} from '@vis.gl/react-google-maps';
import type {
  AnalyzedRoute,
  DiscoveredPlace,
  ElevationProfilePoint,
  GeocodeInspection,
  LatLngPoint,
  RouteStop,
} from '../types/bremap';

interface MapCanvasProps {
  route: AnalyzedRoute | null;
  places: DiscoveredPlace[];
  selectedPlace: DiscoveredPlace | null;
  inspectedPoint: GeocodeInspection | null;
  hoverProfilePoint: ElevationProfilePoint | null;
  focusTarget: LatLngPoint | null;
  onSelectPlace: (place: DiscoveredPlace | null) => void;
  onMapClick: (lat: number, lng: number) => void;
  onCloseInspection: () => void;
  onUseInspectedAsOrigin: (label: string) => void;
  onAddInspectedAsWaypoint: (label: string) => void;
  onUseInspectedAsDestination: (label: string) => void;
  onAddPlaceAsWaypoint: (place: DiscoveredPlace) => void;
}

const DEFAULT_CENTER: LatLngPoint = {lat: 19.0176, lng: 72.8562};

function RoutePolylineLayer({route}: {route: AnalyzedRoute | null}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (!route || route.path.length < 2) return;

    const line = new google.maps.Polyline({
      path: route.path,
      geodesic: true,
      strokeColor: '#B45309',
      strokeOpacity: 0.94,
      strokeWeight: 5,
      map,
    });
    polylineRef.current = line;

    if (route.viewport) {
      map.fitBounds(route.viewport, {top: 48, right: 48, bottom: 48, left: 48});
    }

    return () => {
      line.setMap(null);
      polylineRef.current = null;
    };
  }, [map, route]);

  return null;
}

function MapCameraFocusEffect({focusTarget}: {focusTarget: LatLngPoint | null}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !focusTarget) return;
    map.panTo(focusTarget);
    const currentZoom = map.getZoom() ?? 12;
    if (currentZoom < 14) {
      map.setZoom(14);
    }
  }, [map, focusTarget]);

  return null;
}

function StopMarkerItem({
  stop,
  index,
}: {
  stop: RouteStop;
  index: number;
}) {
  const isOrigin = stop.role === 'origin';
  const isDest = stop.role === 'destination';

  const bg = isOrigin ? '#0E4B3A' : isDest ? '#B45309' : '#D97706';
  const border = isOrigin ? '#072E23' : isDest ? '#78350F' : '#92400E';
  const glyphText = isOrigin ? 'A' : isDest ? 'B' : String(index);

  return (
    <AdvancedMarker position={stop.location} title={stop.label} zIndex={30}>
      <Pin
        background={bg}
        borderColor={border}
        glyphColor="#FEF9E7"
        glyphText={glyphText}
      />
    </AdvancedMarker>
  );
}

function PlaceMarkerItem({
  place,
  isSelected,
  onSelect,
  onAddWaypoint,
}: {
  place: DiscoveredPlace;
  isSelected: boolean;
  onSelect: (place: DiscoveredPlace | null) => void;
  onAddWaypoint: (place: DiscoveredPlace) => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={place.location}
        title={place.name}
        zIndex={isSelected ? 40 : 20}
        onClick={() => onSelect(place)}
      >
        <Pin
          background={isSelected ? '#0E4B3A' : '#D97706'}
          borderColor={isSelected ? '#072E23' : '#92400E'}
          glyphColor="#FEF9E7"
          scale={isSelected ? 1.18 : 0.95}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={260}
          onCloseClick={() => onSelect(null)}
        >
          <div className="p-1 space-y-1.5 text-stone-900">
            <div className="text-sm font-semibold leading-snug">
              {place.name}
            </div>
            <div className="text-xs text-stone-600">
              {place.category}
              {place.rating !== null ? ` · ${place.rating.toFixed(1)} ★` : ''}
            </div>
            {place.address && (
              <div className="text-xs text-stone-500">{place.address}</div>
            )}
            <div className="pt-1 flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-[#B45309]">
                Score {place.spatialScore.toFixed(1)}
              </span>
              <button
                type="button"
                onClick={() => onAddWaypoint(place)}
                className="px-2.5 py-1 text-xs font-semibold text-[#FEF9E7] bg-[#0E4B3A] hover:bg-[#16654E] rounded"
              >
                Add Stop
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function InspectedMarker({
  inspection,
  onClose,
  onSetOrigin,
  onAddWaypoint,
  onSetDestination,
}: {
  inspection: GeocodeInspection;
  onClose: () => void;
  onSetOrigin: (label: string) => void;
  onAddWaypoint: (label: string) => void;
  onSetDestination: (label: string) => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const coordStr = `${inspection.location.lat.toFixed(5)}, ${inspection.location.lng.toFixed(5)}`;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={inspection.location}
        title={inspection.formattedAddress}
        zIndex={45}
      >
        <Pin
          background="#1C1917"
          borderColor="#44403C"
          glyphColor="#FEF9E7"
          scale={0.95}
        />
      </AdvancedMarker>

      {marker && (
        <InfoWindow anchor={marker} maxWidth={280} onCloseClick={onClose}>
          <div className="p-1 space-y-2 text-stone-900">
            <div className="text-xs font-semibold leading-snug">
              {inspection.formattedAddress}
            </div>
            <div className="text-xs font-mono text-stone-500">
              {coordStr}
              {inspection.elevationM !== null ? ` · ${inspection.elevationM} m` : ''}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => onSetOrigin(inspection.formattedAddress)}
                className="px-2 py-1 text-xs font-medium bg-[#F5EFE0] hover:bg-amber-100 text-stone-800 rounded"
              >
                Set Origin
              </button>
              <button
                type="button"
                onClick={() => onAddWaypoint(inspection.formattedAddress)}
                className="px-2 py-1 text-xs font-medium bg-[#0E4B3A] hover:bg-[#16654E] text-[#FEF9E7] rounded"
              >
                Add Stop
              </button>
              <button
                type="button"
                onClick={() => onSetDestination(inspection.formattedAddress)}
                className="px-2 py-1 text-xs font-medium bg-[#F5EFE0] hover:bg-amber-100 text-stone-800 rounded"
              >
                Set Dest
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function MapCanvas({
  route,
  places,
  selectedPlace,
  inspectedPoint,
  hoverProfilePoint,
  focusTarget,
  onSelectPlace,
  onMapClick,
  onCloseInspection,
  onUseInspectedAsOrigin,
  onAddInspectedAsWaypoint,
  onUseInspectedAsDestination,
  onAddPlaceAsWaypoint,
}: MapCanvasProps) {
  return (
    <div
      data-testid="map-canvas"
      className="relative w-full h-full min-h-[380px] bg-[#F5EFE0]"
    >
      <GoogleMapView
        mapId="DEMO_MAP_ID"
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={true}
        streetViewControl={false}
        fullscreenControl={true}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{width: '100%', height: '100%'}}
        onClick={(ev) => {
          const ll = ev.detail.latLng;
          if (ll) {
            onMapClick(ll.lat, ll.lng);
          }
        }}
      >
        <RoutePolylineLayer route={route} />
        <MapCameraFocusEffect focusTarget={focusTarget} />

        {route?.stops.map((stop, idx) => (
          <StopMarkerItem key={`${stop.role}-${idx}`} stop={stop} index={idx} />
        ))}

        {places.map((place) => (
          <PlaceMarkerItem
            key={place.id}
            place={place}
            isSelected={selectedPlace?.id === place.id}
            onSelect={onSelectPlace}
            onAddWaypoint={onAddPlaceAsWaypoint}
          />
        ))}

        {inspectedPoint && (
          <InspectedMarker
            inspection={inspectedPoint}
            onClose={onCloseInspection}
            onSetOrigin={onUseInspectedAsOrigin}
            onAddWaypoint={onAddInspectedAsWaypoint}
            onSetDestination={onUseInspectedAsDestination}
          />
        )}

        {hoverProfilePoint && (
          <AdvancedMarker
            position={{
              lat: hoverProfilePoint.lat,
              lng: hoverProfilePoint.lng,
            }}
            zIndex={50}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-[#B45309] border-2 border-[#FEF9E7] shadow-sm" />
          </AdvancedMarker>
        )}
      </GoogleMapView>
    </div>
  );
}
