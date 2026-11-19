import {useMemo, useState} from 'react';
import type {AnalyzedRoute, ElevationProfilePoint} from '../types/bremap';
import {
  classifyGradeSeverity,
  formatDistanceKm,
  formatDurationSeconds,
  formatElevationMeters,
  formatInrFare,
} from '../utils/routeFormatting';

interface TelemetryStripProps {
  route: AnalyzedRoute | null;
  isLoading: boolean;
  onHoverProfilePoint: (point: ElevationProfilePoint | null) => void;
}

export function TelemetryStrip({
  route,
  isLoading,
  onHoverProfilePoint,
}: TelemetryStripProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const profile = route?.elevation.profile ?? [];

  const chartGeometry = useMemo(() => {
    if (profile.length < 2) return null;
    const width = 760;
    const height = 104;
    const padX = 8;
    const padY = 12;

    const minE = Math.min(...profile.map((p) => p.elevationM));
    const maxE = Math.max(...profile.map((p) => p.elevationM));
    const spanE = Math.max(8, maxE - minE);
    const maxD = Math.max(0.01, profile[profile.length - 1].distanceKm);

    const coords = profile.map((pt) => {
      const x = padX + (pt.distanceKm / maxD) * (width - padX * 2);
      const y =
        height -
        padY -
        ((pt.elevationM - minE) / spanE) * (height - padY * 2);
      return {x, y, pt};
    });

    const linePath = coords
      .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');
    const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${
      height - padY
    } L ${coords[0].x.toFixed(1)} ${height - padY} Z`;

    return {width, height, padX, padY, coords, linePath, areaPath, minE, maxE};
  }, [profile]);

  if (isLoading && !route) {
    return (
      <section
        aria-label="Route telemetry loading"
        className="bg-[#FCF9F0] border-t-2 border-[#E5DEC9] px-4 lg:px-6 py-4"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
          {Array.from({length: 6}).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 bg-stone-200 rounded" />
              <div className="h-5 w-20 bg-stone-100 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!route) {
    return (
      <section
        aria-label="Route telemetry summary"
        className="bg-[#FCF9F0] border-t-2 border-[#E5DEC9] px-4 lg:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600"
      >
        <span>
          Select an Indian city corridor or enter an origin and destination to compute route geometry, auto fare, and elevation telemetry.
        </span>
        <span className="font-mono text-stone-500">
          Click anywhere on the map to inspect coordinates and elevation
        </span>
      </section>
    );
  }

  const activePoint =
    hoverIdx !== null && profile[hoverIdx] ? profile[hoverIdx] : null;
  const activeGrade = activePoint
    ? classifyGradeSeverity(activePoint.gradePct)
    : null;

  return (
    <section
      aria-label="Route telemetry and elevation profile"
      data-testid="telemetry-strip"
      className="bg-[#FCF9F0] border-t-2 border-[#E5DEC9] px-4 lg:px-6 py-3.5 space-y-3 shrink-0"
    >
      {/* Single-elevation KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-2.5">
        <div>
          <div className="text-xs text-stone-500">Route Distance</div>
          <div className="text-base font-semibold font-mono tabular-nums text-stone-900">
            {formatDistanceKm(route.distanceKm)}
          </div>
        </div>

        <div>
          <div className="text-xs text-stone-500">Estimated Time</div>
          <div className="text-base font-semibold font-mono tabular-nums text-stone-900">
            {formatDurationSeconds(route.durationSeconds)}
          </div>
        </div>

        <div>
          <div className="text-xs text-stone-500">Est. Auto Meter</div>
          <div className="text-base font-semibold font-mono tabular-nums text-[#B45309]">
            {formatInrFare(route.estimatedAutoFareInr)}
          </div>
        </div>

        <div>
          <div className="text-xs text-stone-500">Sinuosity Index</div>
          <div className="text-base font-semibold font-mono tabular-nums text-stone-900">
            {route.geometry.sinuosityIndex.toFixed(2)}x{' '}
            <span className="text-xs font-normal text-stone-500">
              ({route.geometry.cardinalDirection})
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs text-stone-500">Elevation Gain</div>
          <div className="text-base font-semibold font-mono tabular-nums text-[#0E4B3A]">
            +{formatElevationMeters(route.elevation.totalGainM)}
          </div>
        </div>

        <div>
          <div className="text-xs text-stone-500">Peak Climb Grade</div>
          <div className="text-base font-semibold font-mono tabular-nums text-stone-900">
            {route.elevation.maxClimbGradePct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Interactive SVG Elevation Profile */}
      {chartGeometry && (
        <div className="pt-2 border-t border-[#E5DEC9]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 text-xs">
            <span className="font-medium text-stone-700">
              Elevation Profile ({formatElevationMeters(chartGeometry.minE)} min ·{' '}
              {formatElevationMeters(chartGeometry.maxE)} max)
            </span>
            {activePoint && activeGrade ? (
              <span className="font-mono tabular-nums text-stone-700">
                {activePoint.distanceKm.toFixed(2)} km · {activePoint.elevationM} m ·{' '}
                {activePoint.gradePct >= 0 ? '+' : ''}
                {activePoint.gradePct.toFixed(1)}% ({activeGrade.label})
              </span>
            ) : (
              <span className="text-stone-500">
                Hover profile to scrub along route
              </span>
            )}
          </div>

          <div className="relative w-full h-24 overflow-hidden">
            <svg
              viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
              preserveAspectRatio="none"
              className="w-full h-full select-none cursor-crosshair block"
              role="img"
              aria-label="Route elevation and slope profile chart"
              onMouseLeave={() => {
                setHoverIdx(null);
                onHoverProfilePoint(null);
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (rect.width <= 0) return;
                const relX = (e.clientX - rect.left) / rect.width;
                const idx = Math.max(
                  0,
                  Math.min(
                    profile.length - 1,
                    Math.round(relX * (profile.length - 1))
                  )
                );
                setHoverIdx(idx);
                onHoverProfilePoint(profile[idx]);
              }}
            >
              <defs>
                <linearGradient id="bremapElevFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#B45309" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#B45309" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              <line
                x1={chartGeometry.padX}
                y1={chartGeometry.height - chartGeometry.padY}
                x2={chartGeometry.width - chartGeometry.padX}
                y2={chartGeometry.height - chartGeometry.padY}
                stroke="#E5DEC9"
                strokeWidth="1"
              />

              <path d={chartGeometry.areaPath} fill="url(#bremapElevFill)" />
              <path
                d={chartGeometry.linePath}
                fill="none"
                stroke="#B45309"
                strokeWidth="2.2"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
              />
            </svg>

            {hoverIdx !== null && chartGeometry.coords[hoverIdx] && (
              <>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-2 bottom-2 w-px bg-stone-500/70"
                  style={{
                    left: `${
                      (chartGeometry.coords[hoverIdx].x / chartGeometry.width) *
                      100
                    }%`,
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#B45309] border-2 border-[#FEF9E7] shadow-sm"
                  style={{
                    left: `${
                      (chartGeometry.coords[hoverIdx].x / chartGeometry.width) *
                      100
                    }%`,
                    top: `${
                      (chartGeometry.coords[hoverIdx].y / chartGeometry.height) *
                      100
                    }%`,
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
