import {
  ArrowDown,
  ArrowUp,
  Bike,
  BookmarkPlus,
  Car,
  Footprints,
  Gauge,
  Navigation,
  Plus,
  RotateCcw,
  Train,
  Trash2,
} from 'lucide-react';
import type {AnalyzedRoute, TravelMode} from '../types/bremap';
import {
  ROUTE_PRESETS,
  formatDistanceKm,
  formatDurationSeconds,
  type RoutePreset,
} from '../utils/routeFormatting';

interface RoutePlannerPanelProps {
  origin: string;
  destination: string;
  intermediates: string[];
  travelMode: TravelMode;
  avoidTolls: boolean;
  avoidHighways: boolean;
  optimizeOrder: boolean;
  originError: string | null;
  destinationError: string | null;
  isLoading: boolean;
  routeError: string | null;
  activeRoute: AnalyzedRoute | null;
  onChangeOrigin: (val: string) => void;
  onChangeDestination: (val: string) => void;
  onAddIntermediate: () => void;
  onUpdateIntermediate: (index: number, val: string) => void;
  onRemoveIntermediate: (index: number) => void;
  onMoveIntermediate: (index: number, direction: -1 | 1) => void;
  onChangeTravelMode: (mode: TravelMode) => void;
  onToggleAvoidTolls: (val: boolean) => void;
  onToggleAvoidHighways: (val: boolean) => void;
  onToggleOptimizeOrder: (val: boolean) => void;
  onSubmitRoute: () => void;
  onSelectPreset: (preset: RoutePreset) => void;
  onSaveRoute: () => void;
  onResetRoute: () => void;
  onFocusStep: (lat: number, lng: number) => void;
}

const TRAVEL_MODES: Array<{value: TravelMode; label: string; Icon: typeof Car}> = [
  {value: 'TWO_WHEELER', label: 'Auto', Icon: Gauge},
  {value: 'DRIVE', label: 'Cab', Icon: Car},
  {value: 'BICYCLE', label: 'Cycle', Icon: Bike},
  {value: 'WALK', label: 'Walk', Icon: Footprints},
  {value: 'TRANSIT', label: 'Metro', Icon: Train},
];

const MODE_BADGE_LABELS: Record<TravelMode, string> = {
  TWO_WHEELER: 'AUTO',
  DRIVE: 'CAB',
  BICYCLE: 'CYCLE',
  WALK: 'WALK',
  TRANSIT: 'METRO',
};

export function RoutePlannerPanel({
  origin,
  destination,
  intermediates,
  travelMode,
  avoidTolls,
  avoidHighways,
  optimizeOrder,
  originError,
  destinationError,
  isLoading,
  routeError,
  activeRoute,
  onChangeOrigin,
  onChangeDestination,
  onAddIntermediate,
  onUpdateIntermediate,
  onRemoveIntermediate,
  onMoveIntermediate,
  onChangeTravelMode,
  onToggleAvoidTolls,
  onToggleAvoidHighways,
  onToggleOptimizeOrder,
  onSubmitRoute,
  onSelectPreset,
  onSaveRoute,
  onResetRoute,
  onFocusStep,
}: RoutePlannerPanelProps) {
  return (
    <div className="p-4 lg:p-5 space-y-6">
      {/* Route Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmitRoute();
        }}
        className="space-y-4"
        noValidate
      >
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#E5DEC9]">
          <div>
            <h2 className="font-display text-base font-semibold text-stone-900">
              Route Meter &amp; Corridor
            </h2>
            <p className="text-xs text-stone-600 mt-0.5">
              Indian corridor geometry, ₹ auto meter estimate, and slope profile.
            </p>
          </div>
          {activeRoute && (
            <button
              type="button"
              onClick={onResetRoute}
              className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Origin */}
        <div className="space-y-1.5">
          <label
            htmlFor="route-origin"
            className="block text-xs font-medium text-stone-700"
          >
            Origin
          </label>
          <input
            id="route-origin"
            type="text"
            value={origin}
            onChange={(e) => onChangeOrigin(e.target.value)}
            placeholder="Street, chowk, metro station, or lat, lng"
            className={`w-full px-3 py-2.5 text-sm bg-white border rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0E4B3A] ${
              originError ? 'border-red-500' : 'border-[#E5DEC9]'
            }`}
          />
          {originError && (
            <p className="text-xs text-red-700" role="alert">
              {originError}
            </p>
          )}
        </div>

        {/* Intermediate Waypoints */}
        {intermediates.length > 0 && (
          <div className="space-y-2">
            <span className="block text-xs font-medium text-stone-700">
              Intermediate Stops
            </span>
            {intermediates.map((stop, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <input
                  type="text"
                  aria-label={`Intermediate stop ${idx + 1}`}
                  value={stop}
                  onChange={(e) => onUpdateIntermediate(idx, e.target.value)}
                  placeholder={`Stop ${idx + 1} address or coordinates`}
                  className="flex-1 min-w-0 px-3 py-2 text-sm bg-white border border-[#E5DEC9] rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0E4B3A]"
                />
                <button
                  type="button"
                  onClick={() => onMoveIntermediate(idx, -1)}
                  disabled={idx === 0}
                  aria-label={`Move stop ${idx + 1} up`}
                  className="p-2 rounded-lg border border-[#E5DEC9] bg-white text-stone-600 hover:bg-[#F5EFE0] disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveIntermediate(idx, 1)}
                  disabled={idx === intermediates.length - 1}
                  aria-label={`Move stop ${idx + 1} down`}
                  className="p-2 rounded-lg border border-[#E5DEC9] bg-white text-stone-600 hover:bg-[#F5EFE0] disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveIntermediate(idx)}
                  aria-label={`Remove stop ${idx + 1}`}
                  className="p-2 rounded-lg border border-[#E5DEC9] bg-white text-stone-500 hover:text-red-700 hover:border-red-300"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Destination */}
        <div className="space-y-1.5">
          <label
            htmlFor="route-destination"
            className="block text-xs font-medium text-stone-700"
          >
            Destination
          </label>
          <input
            id="route-destination"
            type="text"
            value={destination}
            onChange={(e) => onChangeDestination(e.target.value)}
            placeholder="Destination market, fort, or lat, lng"
            className={`w-full px-3 py-2.5 text-sm bg-white border rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0E4B3A] ${
              destinationError ? 'border-red-500' : 'border-[#E5DEC9]'
            }`}
          />
          {destinationError && (
            <p className="text-xs text-red-700" role="alert">
              {destinationError}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onAddIntermediate}
          disabled={intermediates.length >= 6}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B45309] hover:text-[#92400E] disabled:text-stone-400 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Add Intermediate Waypoint</span>
        </button>

        {/* Travel Mode Segmented Control */}
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-stone-700">
            Travel Mode
          </span>
          <div className="grid grid-cols-5 gap-1 p-1 bg-[#EDE5D0] rounded-lg">
            {TRAVEL_MODES.map(({value, label, Icon}) => {
              const active = travelMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChangeTravelMode(value)}
                  className={`inline-flex items-center justify-center gap-1 py-2 px-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#0E4B3A] text-[#FEF9E7] shadow-xs'
                      : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modifiers */}
        <div className="space-y-2 pt-1">
          {(travelMode === 'DRIVE' || travelMode === 'TWO_WHEELER') && (
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={avoidTolls}
                  onChange={(e) => onToggleAvoidTolls(e.target.checked)}
                  className="rounded border-stone-300 text-[#0E4B3A] focus:ring-[#0E4B3A]"
                />
                <span>Avoid tolls</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={avoidHighways}
                  onChange={(e) => onToggleAvoidHighways(e.target.checked)}
                  className="rounded border-stone-300 text-[#0E4B3A] focus:ring-[#0E4B3A]"
                />
                <span>Avoid highways</span>
              </label>
            </div>
          )}

          {intermediates.filter((s) => s.trim().length > 0).length >= 2 &&
            travelMode !== 'TRANSIT' && (
              <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optimizeOrder}
                  onChange={(e) => onToggleOptimizeOrder(e.target.checked)}
                  className="rounded border-stone-300 text-[#0E4B3A] focus:ring-[#0E4B3A]"
                />
                <span>Optimize stop sequence (TSP)</span>
              </label>
            )}
        </div>

        {routeError && (
          <div
            role="alert"
            className="p-3 text-xs text-red-900 bg-red-50 border border-red-200 rounded-lg"
          >
            {routeError}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#FEF9E7] bg-[#0E4B3A] hover:bg-[#16654E] disabled:bg-[#0E4B3A]/60 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4B3A] focus-visible:ring-offset-2"
          >
            <Navigation className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{isLoading ? 'Processing Route...' : 'Analyze Route'}</span>
          </button>

          {activeRoute && (
            <button
              type="button"
              onClick={onSaveRoute}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-stone-800 bg-white border border-[#E5DEC9] hover:bg-amber-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <BookmarkPlus className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
              <span>Save Route</span>
            </button>
          )}
        </div>
      </form>

      {/* Quick Corridor Presets */}
      <div className="pt-4 border-t border-[#E5DEC9] space-y-2.5">
        <h3 className="text-xs font-semibold text-stone-600 tracking-wide">
          Indian City Corridors
        </h3>
        <div className="divide-y divide-[#E5DEC9] border border-[#E5DEC9] rounded-lg bg-white">
          {ROUTE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-amber-50/70 transition-colors first:rounded-t-lg last:rounded-b-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0E4B3A]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-stone-900">
                  {preset.title}
                </span>
                <span className="text-xs font-mono font-medium text-[#B45309] shrink-0">
                  {MODE_BADGE_LABELS[preset.travelMode]}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">{preset.subtitle}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Turn-by-Turn Legs */}
      {activeRoute && activeRoute.legs.length > 0 && (
        <div className="pt-4 border-t border-[#E5DEC9] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-stone-900">
              Route Maneuvers
            </h3>
            <span className="text-xs font-mono tabular-nums text-stone-500">
              {activeRoute.legs.length}{' '}
              {activeRoute.legs.length === 1 ? 'leg' : 'legs'}
            </span>
          </div>

          <div className="space-y-4">
            {activeRoute.legs.map((leg) => (
              <div key={leg.legIndex} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-stone-700 pb-1 border-b border-[#E5DEC9]">
                  <span className="truncate max-w-[200px]">
                    {leg.fromLabel} to {leg.toLabel}
                  </span>
                  <span className="font-mono tabular-nums text-stone-500 shrink-0">
                    {formatDistanceKm(leg.distanceMeters / 1000)} ·{' '}
                    {formatDurationSeconds(leg.durationSeconds)}
                  </span>
                </div>

                <ol className="divide-y divide-[#F0EAD6]">
                  {leg.steps.slice(0, 18).map((step, sIdx) => (
                    <li key={sIdx}>
                      <button
                        type="button"
                        onClick={() =>
                          onFocusStep(step.location.lat, step.location.lng)
                        }
                        className="w-full text-left py-2 px-1.5 rounded hover:bg-amber-50/80 transition-colors flex items-start justify-between gap-3"
                      >
                        <span className="text-xs text-stone-700 leading-relaxed">
                          {step.instruction}
                        </span>
                        <span className="text-xs font-mono tabular-nums text-stone-500 shrink-0">
                          {formatDistanceKm(step.distanceMeters / 1000)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
