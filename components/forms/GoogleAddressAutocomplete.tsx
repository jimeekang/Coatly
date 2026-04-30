'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  parseGooglePlaceAddressComponents,
  type GooglePlaceAddressComponent,
  type ParsedGooglePlaceAddress,
} from '@/lib/google-places-address';

type GooglePlace = {
  addressComponents?: GooglePlaceAddressComponent[];
  fetchFields: (request: { fields: string[] }) => Promise<void>;
};

type GooglePlacePrediction = {
  text: { toString: () => string };
  toPlace: () => GooglePlace;
};

type GoogleAutocompleteSuggestion = {
  placePrediction?: GooglePlacePrediction;
};

type GooglePlacesLibrary = {
  AutocompleteSessionToken: new () => unknown;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: {
      input: string;
      includedRegionCodes: string[];
      language: string;
      region: string;
      sessionToken?: unknown;
    }) => Promise<{ suggestions: GoogleAutocompleteSuggestion[] }>;
  };
};

type GoogleMapsWindow = Window & {
  google?: {
    maps?: {
      importLibrary?: (libraryName: 'places') => Promise<GooglePlacesLibrary>;
    };
  };
};

type Props = {
  id?: string;
  name?: string;
  value: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  className?: string;
  'aria-invalid'?: boolean;
  onChange: (value: string) => void;
  onAddressSelected: (address: ParsedGooglePlaceAddress) => void;
  onBlur?: () => void;
};

let googleMapsScriptPromise: Promise<void> | null = null;
let googlePlacesLibraryPromise: Promise<GooglePlacesLibrary> | null = null;

function getGoogleMapsApiKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
}

function loadGoogleMapsScript(apiKey: string) {
  const googleWindow = window as GoogleMapsWindow;
  if (googleWindow.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  googleMapsScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-coatly-google-maps="places-new"]'
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Google Maps failed to load.')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset.coatlyGoogleMaps = 'places-new';
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Google Maps failed to load.')),
      { once: true }
    );
    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
}

async function loadGooglePlacesLibrary(apiKey: string) {
  if (googlePlacesLibraryPromise) {
    return googlePlacesLibraryPromise;
  }

  googlePlacesLibraryPromise = loadGoogleMapsScript(apiKey).then(() => {
    const googleWindow = window as GoogleMapsWindow;
    const importLibrary = googleWindow.google?.maps?.importLibrary;
    if (!importLibrary) {
      throw new Error('Google Places library is unavailable.');
    }
    return importLibrary('places');
  });

  return googlePlacesLibraryPromise;
}

export function GoogleAddressAutocomplete({
  id,
  name,
  value,
  placeholder,
  autoComplete,
  disabled,
  className,
  onChange,
  onAddressSelected,
  onBlur,
  'aria-invalid': ariaInvalid,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onAddressSelectedRef = useRef(onAddressSelected);
  const sessionTokenRef = useRef<unknown>(null);
  const requestIdRef = useRef(0);
  const generatedId = useId();
  const [placesLibrary, setPlacesLibrary] =
    useState<GooglePlacesLibrary | null>(null);
  const [suggestions, setSuggestions] = useState<GooglePlacePrediction[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const listboxId = `${id ?? name ?? generatedId}-suggestions`;

  useEffect(() => {
    onAddressSelectedRef.current = onAddressSelected;
  }, [onAddressSelected]);

  useEffect(() => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey || disabled) return;

    let isMounted = true;
    loadGooglePlacesLibrary(apiKey)
      .then((placesLibrary) => {
        if (!isMounted) return;
        setPlacesLibrary(placesLibrary);
      })
      .catch(() => {
        googleMapsScriptPromise = null;
        googlePlacesLibraryPromise = null;
        if (isMounted) {
          setPlacesLibrary(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [disabled]);

  useEffect(() => {
    if (disabled || !isFocused) {
      return;
    }

    const input = value.trim();
    if (input.length < 2) {
      return;
    }

    if (!placesLibrary) return;

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new placesLibrary.AutocompleteSessionToken();
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const timeout = window.setTimeout(() => {
      placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        includedRegionCodes: ['au'],
        language: 'en-AU',
        region: 'au',
        sessionToken: sessionTokenRef.current,
      })
        .then(({ suggestions: nextSuggestions }) => {
          if (requestIdRef.current !== requestId) return;
          setSuggestions(
            nextSuggestions
              .map((suggestion) => suggestion.placePrediction)
              .filter((prediction): prediction is GooglePlacePrediction =>
                Boolean(prediction)
              )
          );
        })
        .catch(() => {
          if (requestIdRef.current === requestId) {
            setSuggestions([]);
          }
        });
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [disabled, isFocused, placesLibrary, value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    onChange(nextValue);
    if (nextValue.trim().length < 2) {
      setSuggestions([]);
    }
  }

  async function handleSuggestionSelect(prediction: GooglePlacePrediction) {
    const label = prediction.text.toString();
    onChange(label);
    setSuggestions([]);

    const place = prediction.toPlace();
    await place.fetchFields({ fields: ['addressComponents'] });
    const parsedAddress = parseGooglePlaceAddressComponents(
      place.addressComponents
    );

    if (parsedAddress.addressLine1) {
      onChange(parsedAddress.addressLine1);
    }
    onAddressSelectedRef.current(parsedAddress);
    sessionTokenRef.current = null;
  }

  function handleSuggestionPointerDown(
    event: PointerEvent<HTMLButtonElement>,
    prediction: GooglePlacePrediction
  ) {
    event.preventDefault();
    void handleSuggestionSelect(prediction);
  }

  function handleSuggestionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    prediction: GooglePlacePrediction
  ) {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    void handleSuggestionSelect(prediction);
  }

  function handleBlur() {
    window.setTimeout(() => setSuggestions([]), 120);
    setIsFocused(false);
    onBlur?.();
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={suggestions.length > 0}
        aria-invalid={ariaInvalid}
        className={className}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
      />
      {suggestions.length > 0 && (
        <div className="border-pm-border absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-lg border bg-white shadow-lg">
          <ul
            id={listboxId}
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
          >
            {suggestions.map((suggestion, index) => (
              <li key={`${suggestion.text.toString()}-${index}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="text-pm-body hover:bg-pm-teal-light focus:bg-pm-teal-light w-full px-4 py-3 text-left text-sm focus:outline-none"
                  onPointerDown={(event) =>
                    handleSuggestionPointerDown(event, suggestion)
                  }
                  onKeyDown={(event) =>
                    handleSuggestionKeyDown(event, suggestion)
                  }
                >
                  {suggestion.text.toString()}
                </button>
              </li>
            ))}
          </ul>
          <div className="text-pm-secondary border-pm-border border-t px-4 py-2 text-xs">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
