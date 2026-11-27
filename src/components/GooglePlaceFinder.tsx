/// <reference types="google.maps" />
import { useCallback, useEffect, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Search } from 'lucide-react';
import type { LatLngPoint } from '../types/guide';

interface PlaceSelection {
  name: string;
  address: string;
  coords: LatLngPoint;
  googlePlaceId: string;
}

interface GooglePlaceFinderProps {
  onSelectPlace: (place: PlaceSelection) => void;
}

const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();

function PlaceAutocompleteInput({ onSelectPlace }: GooglePlaceFinderProps) {
  const placesLib = useMapsLibrary('places');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!placesLib || !query.trim()) {
      setSuggestions([]);
      return;
    }

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    let cancelled = false;
    setLoading(true);

    const timer = window.setTimeout(() => {
      AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        sessionToken: sessionTokenRef.current!,
        includedRegionCodes: ['tw'],
      })
        .then((res) => {
          if (!cancelled) {
            setSuggestions(res.suggestions ?? []);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSuggestions([]);
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placesLib, query]);

  const handleChoose = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!suggestion.placePrediction) return;
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'id'],
      });

      if (place.location) {
        onSelectPlace({
          name: place.displayName ?? suggestion.placePrediction.text.text,
          address: place.formattedAddress ?? '',
          coords: {
            lat: Number(place.location.lat().toFixed(6)),
            lng: Number(place.location.lng().toFixed(6)),
          },
          googlePlaceId: place.id ?? '',
        });
      }

      sessionTokenRef.current = null;
      setQuery('');
      setSuggestions([]);
    },
    [onSelectPlace]
  );

  return (
    <div className="relative space-y-1">
      <label htmlFor="gmp-place-search" className="block text-xs font-medium text-[#1B5E43]">
        透過 Google Maps 搜尋冬山地點自動帶入座標
      </label>
      <div className="relative">
        <Search
          className="w-3.5 h-3.5 text-[#57544D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="gmp-place-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="輸入冬山地點關鍵字（如：冬山河、梅花湖）…"
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#D8D2C5] bg-white text-xs text-[#1C1B18] focus:outline-none focus:border-[#1B5E43]"
        />
      </div>
      {loading && <div className="text-[11px] text-[#57544D]">搜尋地點中…</div>}
      {suggestions.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#D8D2C5] rounded-lg shadow-md max-h-48 overflow-y-auto divide-y divide-[#ECE8DE]">
          {suggestions.map((item, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={() => void handleChoose(item)}
                className="w-full text-left px-3 py-2 text-xs text-[#1C1B18] hover:bg-[#F8F7F3] transition-colors"
              >
                {item.placePrediction?.text.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GooglePlaceFinder({ onSelectPlace }: GooglePlaceFinderProps) {
  if (!GOOGLE_MAPS_API_KEY) return null;

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      language="zh-TW"
      region="TW"
      libraries={['places']}
    >
      <PlaceAutocompleteInput onSelectPlace={onSelectPlace} />
    </APIProvider>
  );
}
