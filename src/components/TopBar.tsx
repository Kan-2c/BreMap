import {Compass, Download, Heart, Home, Info} from 'lucide-react';
import type {WorkspaceTab} from '../types/bremap';

interface TopBarProps {
  activeSection: 'home' | 'explore' | 'saved';
  activeTab: WorkspaceTab;
  onGoHome: () => void;
  onGoExplore: () => void;
  onGoSaved: () => void;
  onOpenAbout: () => void;
  onExportGeoJson: () => void;
  canExport: boolean;
  savedCount: number;
}

export function TopBar({
  activeSection,
  activeTab,
  onGoHome,
  onGoExplore,
  onGoSaved,
  onOpenAbout,
  onExportGeoJson,
  canExport,
  savedCount,
}: TopBarProps) {
  const isHome = activeSection === 'home';
  const isExplore = activeSection === 'explore' && activeTab !== 'saved';
  const isSaved = activeSection === 'saved' || activeTab === 'saved';

  return (
    <header className="h-16 bg-[#FBF3E4]/95 backdrop-blur-xs border-b-2 border-[#3D1F14]/20 px-4 lg:px-6 flex items-center justify-between gap-4 sm:gap-8 sticky top-0 z-40 shrink-0">
      {/* Zone 1: Single-element Brand Wordmark */}
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onGoHome();
        }}
        className="inline-flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight text-[#FBBF24] bremap-brand-title whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D1F14] rounded"
      >
        <svg
          width="30"
          height="26"
          viewBox="0 0 30 26"
          fill="none"
          aria-hidden="true"
          className="w-7 h-6 shrink-0"
        >
          <path
            d="M4 17V10.5C4 7.5 6.4 5 9.5 5H18.5C21 5 23.1 6.7 23.8 9.1L25.5 14.5C25.8 15.3 26 16.2 26 17V19H3.5V17H4Z"
            fill="#0E4B3A"
            stroke="#3D1F14"
            strokeWidth="1.8"
          />
          <path
            d="M4.5 11C4.5 7.7 7 5 10.2 5H18.5C20.5 5 22.3 6.2 23.2 8L24 11H4.5Z"
            fill="#FACC15"
            stroke="#3D1F14"
            strokeWidth="1.6"
          />
          <rect x="11" y="11" width="8" height="4.5" rx="1" fill="#FEF9E7" stroke="#3D1F14" strokeWidth="1.2" />
          <circle cx="8.5" cy="20" r="2.6" fill="#44403C" stroke="#3D1F14" strokeWidth="1.5" />
          <circle cx="21" cy="20" r="2.6" fill="#44403C" stroke="#3D1F14" strokeWidth="1.5" />
        </svg>
        <span>BreMap</span>
      </a>

      {/* Zone 2: Concise single-line navigation links */}
      <nav
        aria-label="Workspace sections"
        className="hidden md:flex items-center gap-2.5 lg:gap-3"
      >
        <button
          type="button"
          onClick={onGoHome}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-full border-2 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
            isHome
              ? 'bg-[#FCD34D] text-[#3D1F14] border-[#3D1F14] shadow-[0_2px_0_#3D1F14]'
              : 'bg-white/75 text-[#3D1F14] border-[#3D1F14]/25 hover:bg-[#FEF0C7] hover:border-[#3D1F14]'
          }`}
        >
          <Home className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={onGoExplore}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-full border-2 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
            isExplore
              ? 'bg-[#FCD34D] text-[#3D1F14] border-[#3D1F14] shadow-[0_2px_0_#3D1F14]'
              : 'bg-white/75 text-[#3D1F14] border-[#3D1F14]/25 hover:bg-[#FEF0C7] hover:border-[#3D1F14]'
          }`}
        >
          <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Explore</span>
        </button>

        <button
          type="button"
          onClick={onGoSaved}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-full border-2 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
            isSaved
              ? 'bg-[#FCD34D] text-[#3D1F14] border-[#3D1F14] shadow-[0_2px_0_#3D1F14]'
              : 'bg-white/75 text-[#3D1F14] border-[#3D1F14]/25 hover:bg-[#FEF0C7] hover:border-[#3D1F14]'
          }`}
        >
          <Heart className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Saved ({savedCount})</span>
        </button>

        <button
          type="button"
          onClick={onOpenAbout}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-full border-2 bg-white/75 text-[#3D1F14] border-[#3D1F14]/25 hover:bg-[#FEF0C7] hover:border-[#3D1F14] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>About</span>
        </button>
      </nav>

      {/* Zone 3: Single primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onExportGeoJson}
          disabled={!canExport}
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-[#0E4B3A] text-[#FEF9E7] border-2 border-[#3D1F14] shadow-[0_2px_0_#3D1F14] hover:bg-[#16654E] disabled:bg-stone-300 disabled:text-stone-500 disabled:border-stone-400 disabled:shadow-none disabled:cursor-not-allowed transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Export GeoJSON</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>
    </header>
  );
}
