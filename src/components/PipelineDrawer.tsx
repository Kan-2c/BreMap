import {X} from 'lucide-react';
import type {BackendHealth} from '../types/bremap';

interface PipelineDrawerProps {
  open: boolean;
  health: BackendHealth | null;
  lastRouteMs: number | null;
  lastPlacesMs: number | null;
  onClose: () => void;
}

export function PipelineDrawer({
  open,
  health,
  lastRouteMs,
  lastPlacesMs,
  onClose,
}: PipelineDrawerProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pipeline-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-[#FCF9F0] border border-[#E5DEC9] rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-[#0E4B3A] border-b-[3px] border-amber-400 flex items-center justify-between gap-4">
          <h2
            id="pipeline-dialog-title"
            className="font-display text-lg font-semibold text-[#FEF9E7]"
          >
            BreMap Processing Architecture
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close architecture dialog"
            className="p-2 text-emerald-100 hover:text-white rounded-lg hover:bg-emerald-900/60 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-sm text-stone-700">
          <p className="leading-relaxed">
            BreMap separates geospatial computation from interactive map rendering.
            All Google Maps Platform REST queries (biased to India <code className="font-mono text-xs bg-[#EDE5D0] px-1 py-0.5 rounded">IN</code>) and
            spatial analytics execute inside the Python backend before normalized telemetry reaches the browser.
          </p>

          <div className="border border-[#E5DEC9] bg-white rounded-lg divide-y divide-[#E5DEC9]">
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-stone-500">
                Python Runtime
              </span>
              <span className="font-mono text-xs text-stone-900 tabular-nums">
                {health ? `Python ${health.pythonVersion} (stdlib HTTP)` : 'Connecting...'}
              </span>
            </div>

            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-stone-500">
                Server Maps Credentials
              </span>
              <span className="text-xs font-medium text-[#0E4B3A]">
                {health?.mapsKeyConfigured ? 'Configured on server' : 'Pending'}
              </span>
            </div>

            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-stone-500">
                Last Route Pipeline
              </span>
              <span className="font-mono text-xs text-stone-900 tabular-nums">
                {lastRouteMs !== null ? `${lastRouteMs} ms` : 'Not run yet'}
              </span>
            </div>

            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-stone-500">
                Last Place Scoring
              </span>
              <span className="font-mono text-xs text-stone-900 tabular-nums">
                {lastPlacesMs !== null ? `${lastPlacesMs} ms` : 'Not run yet'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-stone-600">
              Backend Processing Stages
            </h3>
            <ul className="space-y-1.5 text-xs text-stone-600 leading-relaxed">
              <li>
                1. Routes API v2 &amp; Elevation API ingestion via Python REST client (India region biasing)
              </li>
              <li>
                2. Polyline5 decoding, Haversine segment lengths, sinuosity ratio, and INR auto-rickshaw meter estimation
              </li>
              <li>
                3. Bridge-smoothed slope grade calculation, cumulative gain/loss, and elevation profile sampling
              </li>
              <li>
                4. Places API (New) corridor offset distance &amp; Bayesian quality ranking for chai stalls and transit stops
              </li>
            </ul>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-[#F5EFE0] border-t border-[#E5DEC9] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#FEF9E7] bg-[#0E4B3A] hover:bg-[#16654E] rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
