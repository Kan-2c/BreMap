import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {APIProvider} from '@vis.gl/react-google-maps';
import {ChaiStreetHero} from './components/ChaiStreetHero';
import {MapCanvas} from './components/MapCanvas';
import {PipelineDrawer} from './components/PipelineDrawer';
import {PlaceDiscoveryPanel} from './components/PlaceDiscoveryPanel';
import {RoutePlannerPanel} from './components/RoutePlannerPanel';
import {SavedRoutesPanel} from './components/SavedRoutesPanel';
import {TelemetryStrip} from './components/TelemetryStrip';
import {TopBar} from './components/TopBar';
import {
  analyzeRoute,
  discoverPlaces,
  exportGeoJsonCollection,
  fetchBackendHealth,
  fetchClientConfig,
  reverseGeocodeCoordinate,
  searchGeocodeAddress,
} from './services/bremapApi';
import type {
  AnalyzedRoute,
  BackendHealth,
  DiscoveredPlace,
  ElevationProfilePoint,
  GeocodeInspection,
  LatLngPoint,
  SavedRouteRecord,
  TravelMode,
  WorkspaceTab,
} from './types/bremap';
import type {HeroCategoryOption} from './utils/chaiVibes';
import {
  parseSavedRoutes,
  ROUTE_PRESETS,
  SAVED_ROUTES_STORAGE_KEY,
  sanitizeFilenameSlug,
  validateRouteInputs,
  type RoutePreset,
} from './utils/routeFormatting';

export default function App() {
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? ''
  );
  const [configLoaded, setConfigLoaded] = useState<boolean>(() =>
    Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
  );
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const [activeSection, setActiveSection] = useState<'home' | 'explore' | 'saved'>('home');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>('chai-tapri');
  const [heroSearching, setHeroSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('routes');
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  // Route form & state
  const [origin, setOrigin] = useState(ROUTE_PRESETS[0].origin);
  const [destination, setDestination] = useState(ROUTE_PRESETS[0].destination);
  const [intermediates, setIntermediates] = useState<string[]>(
    ROUTE_PRESETS[0].intermediates
  );
  const [travelMode, setTravelMode] = useState<TravelMode>(
    ROUTE_PRESETS[0].travelMode
  );
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [optimizeOrder, setOptimizeOrder] = useState(false);
  const [originError, setOriginError] = useState<string | null>(null);
  const [destinationError, setDestinationError] = useState<string | null>(null);

  const [activeRoute, setActiveRoute] = useState<AnalyzedRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [lastRouteMs, setLastRouteMs] = useState<number | null>(null);

  // Places discovery state
  const [placeQuery, setPlaceQuery] = useState('chai tea stall');
  const [searchMode, setSearchMode] = useState<'corridor' | 'center'>('corridor');
  const [radiusMeters, setRadiusMeters] = useState(2500);
  const [openNow, setOpenNow] = useState(false);
  const [places, setPlaces] = useState<DiscoveredPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [lastPlacesMs, setLastPlacesMs] = useState<number | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<DiscoveredPlace | null>(null);

  // Map inspection & interaction
  const [inspectedPoint, setInspectedPoint] = useState<GeocodeInspection | null>(null);
  const [hoverProfilePoint, setHoverProfilePoint] =
    useState<ElevationProfilePoint | null>(null);
  const [focusTarget, setFocusTarget] = useState<LatLngPoint | null>(null);

  // Saved routes
  const [savedRoutes, setSavedRoutes] = useState<SavedRouteRecord[]>(() =>
    typeof window !== 'undefined'
      ? parseSavedRoutes(window.localStorage.getItem(SAVED_ROUTES_STORAGE_KEY))
      : []
  );

  // Global quota listener
  useEffect(() => {
    const onQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  // Load client map config & Python health on mount
  useEffect(() => {
    let active = true;
    fetchBackendHealth()
      .then((h) => {
        if (active) setBackendHealth(h);
      })
      .catch(() => {
        // Health status remains null if unreachable
      });

    if (!mapsApiKey) {
      fetchClientConfig()
        .then((cfg) => {
          if (active) {
            if (cfg.mapsApiKey) setMapsApiKey(cfg.mapsApiKey);
            setConfigLoaded(true);
          }
        })
        .catch(() => {
          if (active) setConfigLoaded(true);
        });
    }

    return () => {
      active = false;
    };
  }, [mapsApiKey]);

  // Persist saved routes
  useEffect(() => {
    try {
      window.localStorage.setItem(
        SAVED_ROUTES_STORAGE_KEY,
        JSON.stringify(savedRoutes)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [savedRoutes]);

  const runRouteAnalysis = useCallback(
    async (params: {
      originVal: string;
      destVal: string;
      stopsVal: string[];
      modeVal: TravelMode;
      tollsVal: boolean;
      highwaysVal: boolean;
      optimizeVal: boolean;
    }) => {
      const check = validateRouteInputs(params.originVal, params.destVal);
      setOriginError(check.originError);
      setDestinationError(check.destinationError);
      if (!check.valid) return;

      const cleanStops = params.stopsVal.map((s) => s.trim()).filter(Boolean);
      setRouteLoading(true);
      setRouteError(null);

      try {
        const result = await analyzeRoute({
          origin: params.originVal.trim(),
          destination: params.destVal.trim(),
          intermediates: cleanStops,
          travelMode: params.modeVal,
          avoidTolls: params.tollsVal,
          avoidHighways: params.highwaysVal,
          optimizeWaypointOrder: params.optimizeVal,
        });
        setActiveRoute(result);
        setLastRouteMs(result.processingMs);
        setHoverProfilePoint(null);
      } catch (err) {
        setRouteError(
          err instanceof Error ? err.message : 'Unable to analyze route.'
        );
      } finally {
        setRouteLoading(false);
      }
    },
    []
  );

  // Initial route load on mount so workspace opens populated and immediately useful
  useEffect(() => {
    const initial = ROUTE_PRESETS[0];
    runRouteAnalysis({
      originVal: initial.origin,
      destVal: initial.destination,
      stopsVal: initial.intermediates,
      modeVal: initial.travelMode,
      tollsVal: false,
      highwaysVal: false,
      optimizeVal: false,
    });
  }, [runRouteAnalysis]);

  const handleSelectPreset = useCallback(
    (preset: RoutePreset) => {
      setOrigin(preset.origin);
      setDestination(preset.destination);
      setIntermediates(preset.intermediates);
      setTravelMode(preset.travelMode);
      setOriginError(null);
      setDestinationError(null);
      runRouteAnalysis({
        originVal: preset.origin,
        destVal: preset.destination,
        stopsVal: preset.intermediates,
        modeVal: preset.travelMode,
        tollsVal: avoidTolls,
        highwaysVal: avoidHighways,
        optimizeVal: optimizeOrder,
      });
    },
    [avoidHighways, avoidTolls, optimizeOrder, runRouteAnalysis]
  );

  const discoverPlacesForCenter = useCallback(
    async (params: {
      query: string;
      center: LatLngPoint;
      mode: 'corridor' | 'center';
      radius?: number;
    }) => {
      setPlacesLoading(true);
      setPlacesError(null);
      try {
        const res = await discoverPlaces({
          query: params.query,
          center: params.center,
          radiusMeters: params.radius ?? radiusMeters,
          openNow,
          searchMode: params.mode,
          encodedPolyline: activeRoute?.encodedPolyline ?? null,
        });
        setPlaces(res.places);
        setLastPlacesMs(res.processingMs);
        setSelectedPlace(res.places[0] ?? null);
        if (res.places[0]) {
          setFocusTarget(res.places[0].location);
        }
      } catch (err) {
        setPlacesError(
          err instanceof Error ? err.message : 'Unable to discover places.'
        );
      } finally {
        setPlacesLoading(false);
      }
    },
    [activeRoute?.encodedPolyline, openNow, radiusMeters]
  );

  const handleDiscoverPlaces = useCallback(
    async (overrideQuery?: string, overrideTypes?: string[]) => {
      const q = (overrideQuery ?? placeQuery).trim();
      if (!q && (!overrideTypes || overrideTypes.length === 0)) {
        setPlacesError('Enter a search query or choose a category.');
        return;
      }

      const anchor =
        focusTarget ??
        activeRoute?.geometry.midpoint ??
        activeRoute?.stops[0]?.location ??
        {lat: 19.0176, lng: 72.8562};

      const effectiveMode = activeRoute ? searchMode : 'center';
      setPlacesLoading(true);
      setPlacesError(null);

      try {
        const res = await discoverPlaces({
          query: q,
          includedTypes: overrideTypes,
          center: anchor,
          radiusMeters,
          openNow,
          searchMode: effectiveMode,
          encodedPolyline: activeRoute?.encodedPolyline ?? null,
        });
        setPlaces(res.places);
        setLastPlacesMs(res.processingMs);
        setSelectedPlace(res.places[0] ?? null);
        if (res.places[0]) {
          setFocusTarget(res.places[0].location);
        }
      } catch (err) {
        setPlacesError(
          err instanceof Error ? err.message : 'Unable to discover places.'
        );
      } finally {
        setPlacesLoading(false);
      }
    },
    [activeRoute, focusTarget, openNow, placeQuery, radiusMeters, searchMode]
  );

  const scrollToWorkspace = useCallback(() => {
    workspaceRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }, []);

  const handleHeroSearchLocation = useCallback(
    async (locationQuery: string) => {
      setHeroSearching(true);
      setActiveSection('explore');
      setActiveTab('places');
      setSearchMode('center');
      setPlacesError(null);

      let targetCenter: LatLngPoint | null = null;
      try {
        const geo = await searchGeocodeAddress(locationQuery);
        targetCenter = geo.location;
        setFocusTarget(geo.location);
        setInspectedPoint(geo);
      } catch {
        targetCenter =
          activeRoute?.geometry.midpoint ?? {lat: 19.0176, lng: 72.8562};
      }

      const queryToRun = placeQuery.trim() || 'chai tea stall cafe';
      await discoverPlacesForCenter({
        query: queryToRun,
        center: targetCenter,
        mode: 'center',
      });
      setHeroSearching(false);
      scrollToWorkspace();
    },
    [activeRoute?.geometry.midpoint, discoverPlacesForCenter, placeQuery, scrollToWorkspace]
  );

  const handleHeroSelectCategory = useCallback(
    (category: HeroCategoryOption) => {
      setActiveCategoryId(category.id);
      setPlaceQuery(category.query);
      setActiveSection('explore');
      setActiveTab('places');
      scrollToWorkspace();
      void handleDiscoverPlaces(category.query);
    },
    [handleDiscoverPlaces, scrollToWorkspace]
  );

  const handleDiscoverNearUser = useCallback(() => {
    setActiveSection('explore');
    setActiveTab('places');
    setPlaceQuery('cafe chai tea stall');
    setSearchMode('center');
    scrollToWorkspace();

    const fallbackAnchor =
      activeRoute?.geometry.midpoint ?? {lat: 19.0176, lng: 72.8562};

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setFocusTarget(coords);
          void discoverPlacesForCenter({
            query: 'cafe chai tea stall',
            center: coords,
            mode: 'center',
          });
        },
        () => {
          setFocusTarget(fallbackAnchor);
          void discoverPlacesForCenter({
            query: 'cafe chai tea stall',
            center: fallbackAnchor,
            mode: 'center',
          });
        },
        {timeout: 3500}
      );
    } else {
      setFocusTarget(fallbackAnchor);
      void discoverPlacesForCenter({
        query: 'cafe chai tea stall',
        center: fallbackAnchor,
        mode: 'center',
      });
    }
  }, [activeRoute?.geometry.midpoint, discoverPlacesForCenter, scrollToWorkspace]);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    try {
      const inspection = await reverseGeocodeCoordinate(lat, lng);
      setInspectedPoint(inspection);
    } catch {
      // Ignore transient click lookup errors
    }
  }, []);

  const handleAddWaypointAndAnalyze = useCallback(
    (label: string) => {
      const nextStops = [...intermediates, label];
      setIntermediates(nextStops);
      setActiveTab('routes');
      setInspectedPoint(null);
      if (origin.trim() && destination.trim()) {
        runRouteAnalysis({
          originVal: origin,
          destVal: destination,
          stopsVal: nextStops,
          modeVal: travelMode,
          tollsVal: avoidTolls,
          highwaysVal: avoidHighways,
          optimizeVal: optimizeOrder,
        });
      }
    },
    [
      avoidHighways,
      avoidTolls,
      destination,
      intermediates,
      optimizeOrder,
      origin,
      runRouteAnalysis,
      travelMode,
    ]
  );

  const handleSaveCurrentRoute = useCallback(() => {
    if (!activeRoute) return;
    const record: SavedRouteRecord = {
      id: `${Date.now()}`,
      name: `${activeRoute.originLabel.split(',')[0]} to ${
        activeRoute.destinationLabel.split(',')[0]
      }`,
      origin,
      destination,
      intermediates: intermediates.filter((s) => s.trim().length > 0),
      travelMode,
      avoidTolls,
      avoidHighways,
      distanceKm: activeRoute.distanceKm,
      durationSeconds: activeRoute.durationSeconds,
      totalGainM: activeRoute.elevation.totalGainM,
      savedAtIso: new Date().toISOString(),
    };
    setSavedRoutes((prev) => [record, ...prev]);
    setActiveTab('saved');
  }, [
    activeRoute,
    avoidHighways,
    avoidTolls,
    destination,
    intermediates,
    origin,
    travelMode,
  ]);

  const handleLoadSavedRoute = useCallback(
    (record: SavedRouteRecord) => {
      setOrigin(record.origin);
      setDestination(record.destination);
      setIntermediates(record.intermediates);
      setTravelMode(record.travelMode);
      setAvoidTolls(record.avoidTolls);
      setAvoidHighways(record.avoidHighways);
      setActiveTab('routes');
      runRouteAnalysis({
        originVal: record.origin,
        destVal: record.destination,
        stopsVal: record.intermediates,
        modeVal: record.travelMode,
        tollsVal: record.avoidTolls,
        highwaysVal: record.avoidHighways,
        optimizeVal: optimizeOrder,
      });
    },
    [optimizeOrder, runRouteAnalysis]
  );

  const handleExportGeoJson = useCallback(async () => {
    if (!activeRoute && places.length === 0) return;
    try {
      const fc = await exportGeoJsonCollection(activeRoute, places);
      const blob = new Blob([JSON.stringify(fc, null, 2)], {
        type: 'application/geo+json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const slug = sanitizeFilenameSlug(
        activeRoute
          ? `${activeRoute.originLabel.split(',')[0]}-${activeRoute.destinationLabel.split(',')[0]}`
          : 'bremap-places'
      );
      link.href = url;
      link.download = `${slug}.geojson`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setRouteError('Unable to export GeoJSON collection.');
    }
  }, [activeRoute, places]);

  const canExport = useMemo(
    () => Boolean(activeRoute || places.length > 0),
    [activeRoute, places.length]
  );

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#FBF3E4] text-[#3D1F14]">
      {/* Case A Demo Key Quota Banner */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <TopBar
        activeSection={activeSection}
        activeTab={activeTab}
        onGoHome={() => {
          setActiveSection('home');
          window.scrollTo({top: 0, behavior: 'smooth'});
        }}
        onGoExplore={() => {
          setActiveSection('explore');
          if (activeTab === 'saved') setActiveTab('places');
          scrollToWorkspace();
        }}
        onGoSaved={() => {
          setActiveSection('saved');
          setActiveTab('saved');
          scrollToWorkspace();
        }}
        onOpenAbout={() => setPipelineOpen(true)}
        onExportGeoJson={handleExportGeoJson}
        canExport={canExport}
        savedCount={savedRoutes.length}
      />

      <ChaiStreetHero
        activeCategoryId={activeCategoryId}
        isSearching={heroSearching}
        onSearchLocation={handleHeroSearchLocation}
        onSelectCategory={handleHeroSelectCategory}
        onDiscoverNearUser={handleDiscoverNearUser}
      />

      {/* Main Interactive Map & Python Spatial Workspace */}
      <div
        id="explore-workspace"
        ref={workspaceRef}
        className="flex-1 flex flex-col lg:flex-row lg:h-[calc(100vh-4rem)] lg:min-h-[640px] lg:overflow-hidden scroll-mt-16"
      >
        {/* Left Control Sidebar */}
        <aside
          aria-label="Geospatial controls"
          className="w-full lg:w-[400px] xl:w-[420px] shrink-0 bg-[#FCF9F0] border-b-2 lg:border-b-0 lg:border-r-2 border-[#E5DEC9] lg:overflow-y-auto"
        >
          {/* Unified Workspace Mode Switcher */}
          <div className="px-4 pt-3.5 pb-1">
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#EDE5D0] border border-[#D8CCB0] rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setActiveSection('explore');
                  setActiveTab('routes');
                }}
                className={`py-2 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'routes'
                    ? 'bg-[#0E4B3A] text-[#FEF9E7] shadow-xs'
                    : 'text-[#3D1F14] hover:bg-[#FBF3E4]/60'
                }`}
              >
                Route Studio
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSection('explore');
                  setActiveTab('places');
                }}
                className={`py-2 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'places'
                    ? 'bg-[#0E4B3A] text-[#FEF9E7] shadow-xs'
                    : 'text-[#3D1F14] hover:bg-[#FBF3E4]/60'
                }`}
              >
                Place Radar
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSection('saved');
                  setActiveTab('saved');
                }}
                className={`py-2 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'saved'
                    ? 'bg-[#0E4B3A] text-[#FEF9E7] shadow-xs'
                    : 'text-[#3D1F14] hover:bg-[#FBF3E4]/60'
                }`}
              >
                Saved ({savedRoutes.length})
              </button>
            </div>
          </div>

          {activeTab === 'routes' && (
            <RoutePlannerPanel
              origin={origin}
              destination={destination}
              intermediates={intermediates}
              travelMode={travelMode}
              avoidTolls={avoidTolls}
              avoidHighways={avoidHighways}
              optimizeOrder={optimizeOrder}
              originError={originError}
              destinationError={destinationError}
              isLoading={routeLoading}
              routeError={routeError}
              activeRoute={activeRoute}
              onChangeOrigin={(v) => {
                setOrigin(v);
                if (originError) setOriginError(null);
              }}
              onChangeDestination={(v) => {
                setDestination(v);
                if (destinationError) setDestinationError(null);
              }}
              onAddIntermediate={() => setIntermediates((prev) => [...prev, ''])}
              onUpdateIntermediate={(idx, val) =>
                setIntermediates((prev) =>
                  prev.map((item, i) => (i === idx ? val : item))
                )
              }
              onRemoveIntermediate={(idx) =>
                setIntermediates((prev) => prev.filter((_, i) => i !== idx))
              }
              onMoveIntermediate={(idx, dir) =>
                setIntermediates((prev) => {
                  const next = [...prev];
                  const target = idx + dir;
                  if (target < 0 || target >= next.length) return prev;
                  [next[idx], next[target]] = [next[target], next[idx]];
                  return next;
                })
              }
              onChangeTravelMode={setTravelMode}
              onToggleAvoidTolls={setAvoidTolls}
              onToggleAvoidHighways={setAvoidHighways}
              onToggleOptimizeOrder={setOptimizeOrder}
              onSubmitRoute={() =>
                runRouteAnalysis({
                  originVal: origin,
                  destVal: destination,
                  stopsVal: intermediates,
                  modeVal: travelMode,
                  tollsVal: avoidTolls,
                  highwaysVal: avoidHighways,
                  optimizeVal: optimizeOrder,
                })
              }
              onSelectPreset={handleSelectPreset}
              onSaveRoute={handleSaveCurrentRoute}
              onResetRoute={() => {
                setActiveRoute(null);
                setRouteError(null);
                setHoverProfilePoint(null);
                setIntermediates([]);
              }}
              onFocusStep={(lat, lng) => setFocusTarget({lat, lng})}
            />
          )}

          {activeTab === 'places' && (
            <PlaceDiscoveryPanel
              query={placeQuery}
              searchMode={searchMode}
              radiusMeters={radiusMeters}
              openNow={openNow}
              isLoading={placesLoading}
              error={placesError}
              places={places}
              selectedPlaceId={selectedPlace?.id ?? null}
              activeRoute={activeRoute}
              processingMs={lastPlacesMs}
              onChangeQuery={setPlaceQuery}
              onChangeSearchMode={setSearchMode}
              onChangeRadius={setRadiusMeters}
              onToggleOpenNow={setOpenNow}
              onDiscover={handleDiscoverPlaces}
              onSelectPlace={(p) => {
                setSelectedPlace(p);
                setFocusTarget(p.location);
              }}
              onAddPlaceAsWaypoint={(p) => handleAddWaypointAndAnalyze(p.address || p.name)}
            />
          )}

          {activeTab === 'saved' && (
            <SavedRoutesPanel
              savedRoutes={savedRoutes}
              onLoadSavedRoute={handleLoadSavedRoute}
              onDeleteSavedRoute={(id) =>
                setSavedRoutes((prev) => prev.filter((item) => item.id !== id))
              }
              onGoToPlanner={() => setActiveTab('routes')}
            />
          )}
        </aside>

        {/* Right Interactive Map + Telemetry Viewport */}
        <main className="flex-1 flex flex-col min-w-0 lg:overflow-hidden">
          <div className="flex-1 min-h-[380px] relative">
            {mapsApiKey ? (
              <APIProvider
                apiKey={mapsApiKey}
                libraries={['marker']}
                language="en"
                region="IN"
              >
                <MapCanvas
                  route={activeRoute}
                  places={places}
                  selectedPlace={selectedPlace}
                  inspectedPoint={inspectedPoint}
                  hoverProfilePoint={hoverProfilePoint}
                  focusTarget={focusTarget}
                  onSelectPlace={setSelectedPlace}
                  onMapClick={handleMapClick}
                  onCloseInspection={() => setInspectedPoint(null)}
                  onUseInspectedAsOrigin={(label) => {
                    setOrigin(label);
                    setInspectedPoint(null);
                    setActiveTab('routes');
                  }}
                  onAddInspectedAsWaypoint={handleAddWaypointAndAnalyze}
                  onUseInspectedAsDestination={(label) => {
                    setDestination(label);
                    setInspectedPoint(null);
                    setActiveTab('routes');
                  }}
                  onAddPlaceAsWaypoint={(p) =>
                    handleAddWaypointAndAnalyze(p.address || p.name)
                  }
                />
              </APIProvider>
            ) : (
              <div className="w-full h-full min-h-[380px] flex items-center justify-center bg-[#F5EFE0] p-6 text-center">
                <p className="text-sm text-stone-600 max-w-md">
                  {configLoaded
                    ? 'Google Maps Platform API key is not available in this environment.'
                    : 'Initializing map viewport...'}
                </p>
              </div>
            )}
          </div>

          <TelemetryStrip
            route={activeRoute}
            isLoading={routeLoading}
            onHoverProfilePoint={setHoverProfilePoint}
          />
        </main>
      </div>

      <PipelineDrawer
        open={pipelineOpen}
        health={backendHealth}
        lastRouteMs={lastRouteMs}
        lastPlacesMs={lastPlacesMs}
        onClose={() => setPipelineOpen(false)}
      />
    </div>
  );
}
