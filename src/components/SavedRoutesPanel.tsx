import {Bookmark, FolderOpen, Trash2} from 'lucide-react';
import type {SavedRouteRecord} from '../types/bremap';
import {
  formatDistanceKm,
  formatDurationSeconds,
  formatElevationMeters,
} from '../utils/routeFormatting';

interface SavedRoutesPanelProps {
  savedRoutes: SavedRouteRecord[];
  onLoadSavedRoute: (record: SavedRouteRecord) => void;
  onDeleteSavedRoute: (id: string) => void;
  onGoToPlanner: () => void;
}

export function SavedRoutesPanel({
  savedRoutes,
  onLoadSavedRoute,
  onDeleteSavedRoute,
  onGoToPlanner,
}: SavedRoutesPanelProps) {
  return (
    <div className="p-4 lg:p-5 space-y-4">
      <div className="pb-2.5 border-b border-[#E5DEC9]">
        <h2 className="font-display text-base font-semibold text-stone-900">
          Saved Corridors
        </h2>
        <p className="text-xs text-stone-600 mt-0.5">
          Reload previously analyzed Indian routes directly into the Python spatial pipeline.
        </p>
      </div>

      {savedRoutes.length === 0 ? (
        <div className="p-6 text-center border border-[#E5DEC9] rounded-lg bg-white space-y-3">
          <Bookmark className="w-5 h-5 text-[#B45309] mx-auto" aria-hidden="true" />
          <p className="text-xs text-stone-600 leading-relaxed">
            No corridors saved yet. Analyze a route in Route Studio and select Save Route to store it here.
          </p>
          <button
            type="button"
            onClick={onGoToPlanner}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-[#FEF9E7] bg-[#0E4B3A] hover:bg-[#16654E] rounded-lg transition-colors"
          >
            Open Route Studio
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-[#E5DEC9] border border-[#E5DEC9] rounded-lg bg-white">
          {savedRoutes.map((item) => (
            <li key={item.id} className="p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-stone-900 truncate">
                    {item.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-stone-500 font-mono tabular-nums">
                    <span className="text-[#B45309] font-medium">
                      {item.travelMode === 'TWO_WHEELER' ? 'AUTO' : item.travelMode}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDistanceKm(item.distanceKm)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDurationSeconds(item.durationSeconds)}</span>
                    <span aria-hidden="true">·</span>
                    <span>+{formatElevationMeters(item.totalGainM)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteSavedRoute(item.id)}
                  aria-label={`Delete saved route ${item.name}`}
                  className="p-1.5 text-stone-400 hover:text-red-700 rounded transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onLoadSavedRoute(item)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-800 bg-[#F5EFE0] hover:bg-amber-100 rounded-md transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#0E4B3A]" aria-hidden="true" />
                <span>Load Corridor</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
