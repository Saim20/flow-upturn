import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { MapPin, MagnifyingGlass, CircleNotch, X, CaretDown, Target } from "@phosphor-icons/react";

// Dynamically import the ClientMap to avoid SSR issues
const ClientMap = dynamic(() => import('@/components/admin/attendance/ClientMap'), { 
  ssr: false 
});

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

interface MapFieldProps {
  label: string;
  value: Coordinates;
  onChange: (coords: Coordinates) => void;
  error?: string;
  required?: boolean;
  className?: string;
  showSearch?: boolean;
  placeholder?: string;
}

// Portal component for dropdown to escape overflow constraints
const DropdownPortal: React.FC<{
  children: React.ReactNode;
  inputRef: React.RefObject<HTMLInputElement | null>;
  show: boolean;
}> = ({ children, inputRef, show }) => {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (show && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [show, inputRef]);

  if (!show || typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export const MapField: React.FC<MapFieldProps> = ({
  label,
  value,
  onChange,
  error,
  required = false,
  className = "",
  showSearch = true,
  placeholder = "Search for a location...",
}) => {
  const [isClient, setIsClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sync manual input fields with value prop
  useEffect(() => {
    if (value) {
      setManualLat(value.lat.toFixed(6));
      setManualLng(value.lng.toFixed(6));
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Debounced search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear any pending request
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    debounceTimerRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();
      
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&addressdetails=1&limit=5`,
          {
            headers: {
              'Accept-Language': 'en',
            },
            signal: abortControllerRef.current.signal,
          }
        );
        const data: LocationSuggestion[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error("Location search error:", error);
        }
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, []);

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    const newCoords = {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    };
    onChange(newCoords);
    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleManualCoordinates = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid latitude and longitude values");
      return;
    }
    
    if (lat < -90 || lat > 90) {
      alert("Latitude must be between -90 and 90");
      return;
    }
    
    if (lng < -180 || lng > 180) {
      alert("Longitude must be between -180 and 180");
      return;
    }
    
    onChange({ lat, lng });
  };

  return (
    <div className={className} ref={containerRef}>
      <label className="block font-semibold text-foreground-secondary mb-2">
        <div className="flex items-center gap-2">
          <MapPin size={18} weight="duotone" className="text-foreground-tertiary" />
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </div>
      </label>

      {/* Location Search Box */}
      {showSearch && isClient && (
        <div className="relative mb-3">
          <div className="relative">
            <MagnifyingGlass 
              size={18} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" 
            />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={placeholder}
              className="w-full pl-10 pr-10 py-2.5 border border-border-secondary rounded-lg 
                       bg-background-primary text-foreground-primary
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       placeholder:text-foreground-tertiary"
            />
            {isSearching && (
              <CircleNotch 
                size={18} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-500 animate-spin" 
              />
            )}
            {!isSearching && searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-tertiary 
                         hover:text-foreground-secondary transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Suggestions Dropdown - Rendered via Portal */}
          <DropdownPortal inputRef={inputRef} show={showSuggestions && suggestions.length > 0}>
            <ul className="bg-surface-primary border border-border-secondary 
                         rounded-lg shadow-xl max-h-60 overflow-auto">
              {suggestions.map((suggestion, idx) => (
                <li
                  key={idx}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                  className="px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-950 
                           cursor-pointer text-sm text-foreground-primary
                           border-b border-border-secondary last:border-b-0
                           transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-primary-500 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{suggestion.display_name}</span>
                  </div>
                </li>
              ))}
            </ul>
          </DropdownPortal>
        </div>
      )}
      
      {/* Manual Coordinate Input */}
      <div className="mb-3 border border-border-secondary rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="w-full px-4 py-2.5 bg-surface-secondary hover:bg-surface-tertiary transition-colors flex items-center justify-between text-sm font-medium text-foreground-secondary"
        >
          <div className="flex items-center gap-2">
            <Target size={16} weight="duotone" />
            <span>Set Coordinates Manually</span>
          </div>
          <CaretDown 
            size={16} 
            className={`transition-transform ${showManualInput ? 'rotate-180' : ''}`} 
          />
        </button>
        
        {showManualInput && (
          <div className="p-4 bg-surface-primary border-t border-border-secondary space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground-tertiary mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  step="0.000001"
                  min="-90"
                  max="90"
                  placeholder="e.g. 51.505"
                  className="w-full px-3 py-2 border border-border-secondary rounded-lg bg-background-primary text-foreground-primary focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-tertiary mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  step="0.000001"
                  min="-180"
                  max="180"
                  placeholder="e.g. -0.09"
                  className="w-full px-3 py-2 border border-border-secondary rounded-lg bg-background-primary text-foreground-primary focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleManualCoordinates}
              className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Apply Coordinates
            </button>
          </div>
        )}
      </div>
      
      <div className="relative">
        {isClient ? (
          <div className="h-64 border border-border-secondary rounded-lg overflow-hidden">
            <ClientMap
              value={value}
              onChange={onChange}
              type="attendance"
              hideSearch={true}
            />
          </div>
        ) : (
          <div className="h-64 border border-border-secondary rounded-lg bg-background-secondary flex items-center justify-center">
            <MapPin size={32} weight="duotone" className="text-foreground-tertiary" />
            <span className="ml-2 text-foreground-tertiary">Loading map...</span>
          </div>
        )}
      </div>
      
      {error && <p className="text-error text-sm mt-1">{error}</p>}
      
      <div className="mt-2 text-sm text-foreground-tertiary flex items-center gap-4">
        <span>Lat: {value.lat.toFixed(6)}</span>
        <span>Lng: {value.lng.toFixed(6)}</span>
      </div>
    </div>
  );
};

export default MapField;
