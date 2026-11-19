import {useState} from 'react';
import {
  Coffee,
  CupSoda,
  MapPin,
  Search,
  Sparkles,
  Star,
  Store,
} from 'lucide-react';
import {HERO_CATEGORIES, type HeroCategoryOption} from '../utils/chaiVibes';
import {ChaiVibesPlayer} from './ChaiVibesPlayer';

interface ChaiStreetHeroProps {
  activeCategoryId: string | null;
  isSearching: boolean;
  onSearchLocation: (locationQuery: string) => void;
  onSelectCategory: (category: HeroCategoryOption) => void;
  onDiscoverNearUser: () => void;
}

const CATEGORY_ICONS: Record<string, typeof Coffee> = {
  'chai-tapri': CupSoda,
  'coffee-stalls': Coffee,
  cafes: Store,
  'trending-spots': Star,
  'hidden-gems': Sparkles,
};

export function ChaiStreetHero({
  activeCategoryId,
  isSearching,
  onSearchLocation,
  onSelectCategory,
  onDiscoverNearUser,
}: ChaiStreetHeroProps) {
  const [locationInput, setLocationInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = locationInput.trim();
    if (!cleaned) {
      setInputError('Enter an Indian city, street, or neighborhood to search.');
      return;
    }
    setInputError(null);
    onSearchLocation(cleaned);
  };

  return (
    <section
      aria-label="BreMap Indian Chai and Coffee Discovery Hero"
      className="relative w-full overflow-hidden bg-gradient-to-b from-[#E58E7B] via-[#F7B98D] to-[#FCE5C8] border-b-2 border-[#3D1F14] lg:h-[700px]"
    >
      {/* Full-bleed Indian Chai Tapri, Auto-Rickshaw & Coffee Street Scene */}
      <img
        src="/assets/aistudio/BrewMap__Chai__Coffee__and_Street_Vibes_0022be99.png"
        alt="Indian street scene at sunset featuring a Chai Tapri stall, green and yellow auto-rickshaw, India Gate, and a coffee cart"
        referrerPolicy="no-referrer"
        className="hidden md:block absolute inset-x-0 bottom-0 w-full h-[114%] object-cover object-bottom select-none pointer-events-none"
      />

      {/* Soft closest-side sunset sky clouds dissolving baked-in upper-sky graphics with zero hard edges */}
      <div
        aria-hidden="true"
        className="hidden md:block pointer-events-none absolute -top-10 left-[22%] right-[22%] h-[495px] z-[2]"
        style={{
          background:
            'radial-gradient(closest-side at 50% 45%, rgba(242, 166, 135, 1) 75%, rgba(246, 184, 142, 0.96) 86%, rgba(246, 184, 142, 0) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="hidden md:block pointer-events-none absolute -top-[55px] -right-[75px] w-[490px] h-[360px] z-[2]"
        style={{
          background:
            'radial-gradient(closest-side at 50% 50%, rgba(242, 165, 134, 1) 86%, rgba(245, 179, 140, 0.9) 93%, rgba(245, 179, 140, 0) 100%)',
        }}
      />

      {/* Mobile scenic banner preview */}
      <div className="md:hidden relative w-full h-44 overflow-hidden border-b-2 border-[#3D1F14]">
        <img
          src="/assets/aistudio/BrewMap__Chai__Coffee__and_Street_Vibes_0022be99.png"
          alt="Indian street scene with a Chai Tapri stall and green-and-yellow auto-rickshaw"
          referrerPolicy="no-referrer"
          className="w-full h-[130%] -mt-[8%] object-cover object-[50%_88%] select-none pointer-events-none"
        />
      </div>

      {/* Hero Interactive Content Layer */}
      <div className="relative z-10 max-w-[1440px] h-full mx-auto px-4 sm:px-6 pt-5 pb-6 md:pt-8 md:pb-52 lg:pb-0">
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-5">
          {/* Center Interactive Hero Stage */}
          <div className="w-full max-w-[732px] lg:mt-2 bg-[#FBF3E4] border-2 border-[#3D1F14] rounded-3xl px-4 sm:px-7 py-5 sm:py-8 shadow-[0_6px_0_#3D1F14] text-center">
            {/* Illustrated Auto-Rickshaw + Chai Stall Crest */}
            <div className="inline-flex items-center justify-center mb-1" aria-hidden="true">
              <svg
                width="92"
                height="46"
                viewBox="0 0 92 46"
                fill="none"
                className="w-20 h-10"
              >
                {/* Awning */}
                <path
                  d="M36 10H82L86 19H34L36 10Z"
                  fill="#DC2626"
                  stroke="#3D1F14"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <path d="M46 10L45 19H54L55 10H46Z" fill="#FACC15" />
                <path d="M64 10L63 19H72L73 10H64Z" fill="#FACC15" />
                {/* Auto front */}
                <path
                  d="M8 36V20C8 14.5 12.5 10 18 10H35L39 23V36H8Z"
                  fill="#0E4B3A"
                  stroke="#3D1F14"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 19C10 14 14 10 19 10H34L36 17H10V19Z"
                  fill="#FACC15"
                  stroke="#3D1F14"
                  strokeWidth="2"
                />
                <rect x="20" y="19" width="12" height="8" rx="2" fill="#FEF9E7" stroke="#3D1F14" strokeWidth="1.8" />
                <circle cx="15" cy="38" r="4.5" fill="#44403C" stroke="#3D1F14" strokeWidth="2" />
                <circle cx="33" cy="38" r="4.5" fill="#44403C" stroke="#3D1F14" strokeWidth="2" />
                {/* Steaming Chai Cup */}
                <path
                  d="M50 24H69L66 36C65.6 37.8 64 39 62.1 39H56.9C55 39 53.4 37.8 53 36L50 24Z"
                  fill="#FEF9E7"
                  stroke="#3D1F14"
                  strokeWidth="2.2"
                />
                <path d="M53 27H66L64.5 34H54.5L53 27Z" fill="#B45309" />
                <path d="M69 26.5H72C73.6 26.5 74.5 27.8 74.5 29.2C74.5 30.8 73.5 32 71.8 32H68" stroke="#3D1F14" strokeWidth="2" strokeLinecap="round" />
                <path d="M56 6C56 4 58 3 57 1" stroke="#3D1F14" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M62 6C62 4 64 3 63 1" stroke="#3D1F14" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#FBBF24] bremap-hero-title leading-none">
              BreMap
            </h1>
            <p className="mt-2 text-sm sm:text-base font-semibold text-[#3D1F14]">
              Find Your Perfect Chai, Coffee &amp; More!
            </p>

            {/* Location Search Pill Bar */}
            <form
              onSubmit={handleSubmit}
              className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white border-2 border-[#3D1F14] rounded-2xl sm:rounded-full p-1.5 shadow-[0_3px_0_#3D1F14]"
              noValidate
            >
              <div className="flex-1 flex items-center gap-2 pl-3 pr-2">
                <MapPin className="w-4 h-4 text-[#B45309] shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Enter your Indian location"
                  value={locationInput}
                  onChange={(e) => {
                    setLocationInput(e.target.value);
                    if (inputError) setInputError(null);
                  }}
                  placeholder="Enter your location..."
                  className="w-full py-2 text-sm bg-transparent text-[#3D1F14] placeholder:text-[#785946] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-[#3D1F14] bg-[#FACC15] hover:bg-[#FDE047] disabled:opacity-65 border-2 border-[#3D1F14] rounded-xl sm:rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{isSearching ? 'Searching...' : 'Search'}</span>
              </button>
            </form>

            {inputError && (
              <p role="alert" className="mt-2 text-xs font-medium text-red-700">
                {inputError}
              </p>
            )}

            {/* 5 Interactive Category Buttons */}
            <div
              role="group"
              aria-label="Street discovery categories"
              className="mt-4 flex flex-wrap items-center justify-center gap-2"
            >
              {HERO_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.id] ?? Coffee;
                const active = activeCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onSelectCategory(cat)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold border-2 border-[#3D1F14] rounded-xl transition-transform duration-150 hover:-translate-y-0.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#FACC15] text-[#3D1F14] shadow-[0_3px_0_#3D1F14]'
                        : 'bg-[#FEF9E7] text-[#3D1F14] hover:bg-[#FEF0C7] shadow-[0_2px_0_#3D1F14]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-[#B45309] shrink-0" aria-hidden="true" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Headless background music engine */}
      <ChaiVibesPlayer />

      {/* Bottom-left Street Callout CTA covering the corner bubble cleanly */}
      <button
        type="button"
        onClick={onDiscoverNearUser}
        className="hidden lg:flex flex-col items-start justify-center absolute bottom-3 left-3 z-20 w-[290px] min-h-[118px] bg-[#FBF3E4] hover:bg-[#FEF0C7] text-[#3D1F14] border-2 border-[#3D1F14] rounded-3xl px-5 py-3.5 shadow-[0_4px_0_#3D1F14] transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer text-left"
      >
        <span className="font-display text-xl font-bold leading-snug">
          Discover Cafés Near You
        </span>
        <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#B45309]">
          <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Open live Indian chai &amp; auto map</span>
        </span>
      </button>
    </section>
  );
}
