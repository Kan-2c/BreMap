import {ExternalLink, MapPin, PlusCircle, Search} from 'lucide-react';
import type {AnalyzedRoute, DiscoveredPlace} from '../types/bremap';

interface PlaceDiscoveryPanelProps {
  query: string;
  searchMode: 'corridor' | 'center';
  radiusMeters: number;
  openNow: boolean;
  isLoading: boolean;
  error: string | null;
  places: DiscoveredPlace[];
  selectedPlaceId: string | null;
  activeRoute: AnalyzedRoute | null;
  processingMs: number | null;
  onChangeQuery: (val: string) => void;
  onChangeSearchMode: (mode: 'corridor' | 'center') => void;
  onChangeRadius: (radiusMeters: number) => void;
  onToggleOpenNow: (openNow: boolean) => void;
  onDiscover: (overrideQuery?: string, overrideTypes?: string[]) => void;
  onSelectPlace: (place: DiscoveredPlace) => void;
  onAddPlaceAsWaypoint: (place: DiscoveredPlace) => void;
}

const QUICK_CATEGORIES = [
  {label: 'Chai & Tapri', query: 'chai tea stall'},
  {label: 'South Indian Tiffin', query: 'south indian tiffin restaurant'},
  {label: 'Auto & Metro Stand', query: 'metro auto stand'},
  {label: 'EV Charging', query: 'EV charging station'},
  {label: 'Parks & Ghats', query: 'scenic park waterfront'},
];

const RADIUS_OPTIONS = [
  {label: '1 km', value: 1000},
  {label: '2.5 km', value: 2500},
  {label: '5 km', value: 5000},
  {label: '10 km', value: 10000},
];

export function PlaceDiscoveryPanel({
  query,
  searchMode,
  radiusMeters,
  openNow,
  isLoading,
  error,
  places,
  selectedPlaceId,
  activeRoute,
  processingMs,
  onChangeQuery,
  onChangeSearchMode,
  onChangeRadius,
  onToggleOpenNow,
  onDiscover,
  onSelectPlace,
  onAddPlaceAsWaypoint,
}: PlaceDiscoveryPanelProps) {
  return (
    <div className="p-4 lg:p-5 space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onDiscover();
        }}
        className="space-y-4"
        noValidate
      >
        <div className="pb-2.5 border-b border-[#E5DEC9]">
          <h2 className="font-display text-base font-semibold text-stone-900">
            Chai Tapri &amp; Street Radar
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            Python ranks Indian tea stalls, tiffin corners, and transit stops along your corridor.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="place-search-query"
            className="block text-xs font-medium text-stone-700"
          >
            Place Query
          </label>
          <div className="flex gap-2">
            <input
              id="place-search-query"
              type="text"
              value={query}
              onChange={(e) => onChangeQuery(e.target.value)}
              placeholder="e.g. irani chai, filter coffee, auto stand"
              className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-white border border-[#E5DEC9] rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0E4B3A]"
            />
            <button
              type="submit"
              disabled={isLoading}
              aria-label="Search places"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-[#FEF9E7] bg-[#B45309] hover:bg-[#92400E] disabled:bg-[#B45309]/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{isLoading ? 'Scanning' : 'Scan'}</span>
            </button>
          </div>
        </div>

        {/* Quick Category Triggers */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              type="button"
              onClick={() => {
                onChangeQuery(cat.query);
                onDiscover(cat.query);
              }}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-[#E5DEC9] bg-white text-stone-700 hover:bg-amber-50 hover:border-amber-300 hover:text-stone-950 transition-colors whitespace-nowrap shrink-0"
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Scope & Radius */}
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#EDE5D0] rounded-lg">
            <button
              type="button"
              disabled={!activeRoute}
              onClick={() => onChangeSearchMode('corridor')}
              className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                searchMode === 'corridor' && activeRoute
                  ? 'bg-[#0E4B3A] text-[#FEF9E7] shadow-xs'
                  : 'text-stone-700 hover:text-stone-950 disabled:opacity-45'
              }`}
            >
              Along Route
            </button>
            <button
              type="button"
              onClick={() => onChangeSearchMode('center')}
              className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                searchMode === 'center' || !activeRoute
                  ? 'bg-[#0E4B3A] text-[#FEF9E7] shadow-xs'
                  : 'text-stone-700 hover:text-stone-950'
              }`}
            >
              Map Viewport
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            {searchMode === 'center' || !activeRoute ? (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="place-radius"
                  className="text-xs font-medium text-stone-700"
                >
                  Radius
                </label>
                <select
                  id="place-radius"
                  value={radiusMeters}
                  onChange={(e) => onChangeRadius(Number(e.target.value))}
                  className="px-2.5 py-1.5 text-xs bg-white border border-[#E5DEC9] rounded-md text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#0E4B3A]"
                >
                  {RADIUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-xs text-stone-500">
                Scoped along active route corridor
              </span>
            )}

            <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={openNow}
                onChange={(e) => onToggleOpenNow(e.target.checked)}
                className="rounded border-stone-300 text-[#0E4B3A] focus:ring-[#0E4B3A]"
              />
              <span>Open now</span>
            </label>
          </div>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="p-3 text-xs text-red-900 bg-red-50 border border-red-200 rounded-lg"
        >
          {error}
        </div>
      )}

      {/* Results List */}
      <div className="pt-3 border-t border-[#E5DEC9] space-y-3">
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span className="font-medium text-stone-700">
            Ranked Results ({places.length})
          </span>
          {processingMs !== null && (
            <span className="font-mono tabular-nums">{processingMs} ms</span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((skeleton) => (
              <div
                key={skeleton}
                className="p-3.5 rounded-lg border border-[#E5DEC9] bg-white space-y-2 animate-pulse"
              >
                <div className="h-4 w-2/3 bg-stone-200 rounded" />
                <div className="h-3 w-1/2 bg-stone-100 rounded" />
              </div>
            ))}
          </div>
        ) : places.length === 0 ? (
          <div className="p-5 text-center border border-[#E5DEC9] rounded-lg bg-white space-y-2">
            <MapPin
              className="w-5 h-5 text-[#B45309] mx-auto"
              aria-hidden="true"
            />
            <p className="text-xs text-stone-600">
              Search a chai stall, tiffin centre, or keyword to rank nearby stops with the Python scorer.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#E5DEC9] border border-[#E5DEC9] rounded-lg bg-white">
            {places.map((place) => {
              const selected = place.id === selectedPlaceId;
              return (
                <li
                  key={place.id}
                  className={`p-3.5 transition-colors ${
                    selected ? 'bg-amber-50/80' : 'hover:bg-[#FCF9F0]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectPlace(place)}
                      className="text-left flex-1 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4B3A] rounded"
                    >
                      <div className="text-sm font-semibold text-stone-900 truncate">
                        {place.name}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-stone-500">
                        <span>{place.category}</span>
                        {place.rating !== null && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums text-stone-700">
                              {place.rating.toFixed(1)} ({place.userRatingCount})
                            </span>
                          </>
                        )}
                        {place.openNow !== null && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                place.openNow ? 'text-[#0E4B3A] font-medium' : 'text-stone-500'
                              }
                            >
                              {place.openNow ? 'Open' : 'Closed'}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-stone-500 truncate">
                        {place.address}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs font-mono tabular-nums text-stone-600">
                        <span>
                          {activeRoute
                            ? `${place.corridorOffsetKm.toFixed(2)} km off route`
                            : `${place.distanceFromAnchorKm.toFixed(2)} km away`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#B45309] font-semibold">
                          Score {place.spatialScore.toFixed(1)}
                        </span>
                      </div>
                    </button>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onAddPlaceAsWaypoint(place)}
                        aria-label={`Add ${place.name} as route waypoint`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0E4B3A] hover:bg-emerald-50 rounded-md transition-colors whitespace-nowrap shrink-0"
                      >
                        <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Add Stop</span>
                      </button>
                      {place.googleMapsUri && (
                        <a
                          href={place.googleMapsUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 px-2 py-1"
                        >
                          <span>Maps</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
