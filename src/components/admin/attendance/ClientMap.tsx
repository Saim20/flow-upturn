"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { InlineSpinner } from "@/components/ui";
import { MagnifyingGlass, MapPin, X, CircleNotch } from "@phosphor-icons/react";

type Coordinates = {
  lat: number;
  lng: number;
};

type Suggestion = {
  display_name: string;
  lat: string;
  lon: string;
  distance?: number;
};

interface ClientMapProps {
  value: Coordinates;
  onChange: (coords: Coordinates) => void;
  type: string;
  hideSearch?: boolean;
}

const DEFAULT_POSITION: Coordinates = { lat: 51.505, lng: -0.09 };

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Portal component for dropdown to escape modal overflow constraints
const SearchDropdownPortal: React.FC<{
  children: React.ReactNode;
  inputRef: React.RefObject<HTMLInputElement | null>;
  show: boolean;
}> = ({ children, inputRef, show }) => {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (show && inputRef.current) {
      const updatePosition = () => {
        const rect = inputRef.current!.getBoundingClientRect();
        setPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      };
      updatePosition();
      
      // Update position on scroll/resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
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
        zIndex: 99999,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

const MapController = ({ setMap }: { setMap: (map: L.Map) => void }) => {
  const map = useMap();
  
  useEffect(() => {
    setMap(map);
  }, [map, setMap]);
  
  return null;
};

const MapUpdater = ({ coordinates }: { coordinates: Coordinates }) => {
  const map = useMap();
  useEffect(() => {
    if (coordinates) {
      map.flyTo([coordinates.lat, coordinates.lng], map.getZoom());
    }
  }, [coordinates, map]);
  return null;
};

const LocationMarker = ({
  onSelect,
}: {
  onSelect: (coords: Coordinates) => void;
}) => {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });

  return null;
};

export default function ClientMap({ value, onChange, type, hideSearch = false }: ClientMapProps) {
  const [coordinates, setCoordinates] = useState<Coordinates>(value);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search function using refs to avoid recreation on each render
  const handleSearchChange = useCallback((query: string) => {
    setSearch(query);
    
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
      setLoading(false);
      return;
    }

    setLoading(true);
    
    debounceTimerRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();
      
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&addressdetails=1&limit=10`,
          { signal: abortControllerRef.current.signal }
        );
        let data: Suggestion[] = await res.json();

        if (userLocation) {
          data = data
            .map((s) => ({
              ...s,
              distance: Math.sqrt(
                Math.pow(parseFloat(s.lat) - userLocation.lat, 2) +
                  Math.pow(parseFloat(s.lon) - userLocation.lng, 2)
              ),
            }))
            .sort((a, b) => a.distance! - b.distance!);
        }

        const results = data.slice(0, 5);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error("Suggestion error:", error);
        }
      } finally {
        setLoading(false);
      }
    }, 500);
  }, [userLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (type === "create") {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(coords);
          setCoordinates(coords);
          onChange(coords);
        },
        (err) => console.warn("Geolocation error:", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (s: Suggestion) => {
    const newCoords = { lat: parseFloat(s.lat), lng: parseFloat(s.lon) };
    setCoordinates(newCoords);
    setSearch(s.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    onChange(newCoords);
  };

  const clearSearch = () => {
    setSearch("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (coordinates && map) {
      map.setView(coordinates, map.getZoom());
    }
  }, [coordinates, map]);

  useEffect(() => {
    if (value) {
      setCoordinates(value);
    }
  }, [value]);

  return (
    <div className={`w-full ${hideSearch ? '' : 'space-y-4'} relative ${hideSearch ? '' : 'mt-4'}`}>
      {!hideSearch && (
        <div ref={dropdownRef} className="relative">
          <label className="block font-semibold text-foreground-secondary mb-1">
            Location
          </label>
          <div className="relative">
            <MagnifyingGlass 
              size={18} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" 
            />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Search for a location..."
              className="w-full pl-10 pr-10 py-2.5 border border-border-secondary rounded-lg bg-background-primary text-foreground-primary focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-foreground-tertiary"
            />
            {loading && (
              <CircleNotch 
                size={18} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-500 animate-spin" 
              />
            )}
            {!loading && search && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-tertiary hover:text-foreground-secondary transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Dropdown rendered via Portal to escape modal overflow */}
          <SearchDropdownPortal inputRef={inputRef} show={showSuggestions && suggestions.length > 0}>
            <ul className="bg-surface-primary border border-border-secondary rounded-lg shadow-xl max-h-60 overflow-auto">
              {suggestions.map((s, idx) => (
                <li
                  key={idx}
                  onClick={() => handleSelectSuggestion(s)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-950 cursor-pointer text-sm text-foreground-primary border-b border-border-secondary last:border-b-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-primary-500 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{s.display_name}</span>
                  </div>
                </li>
              ))}
            </ul>
          </SearchDropdownPortal>
        </div>
      )}

      <MapContainer
        center={coordinates ?? DEFAULT_POSITION}
        zoom={13}
        scrollWheelZoom={true}
        className="h-[60vh] w-full rounded-lg shadow-md"
      >
        <MapController setMap={setMap} />
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {coordinates && (
          <Marker
            position={coordinates}
            icon={markerIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const newPos = marker.getLatLng();
                setCoordinates({ lat: newPos.lat, lng: newPos.lng });
                onChange({ lat: newPos.lat, lng: newPos.lng });
              },
            }}
          />
        )}
        <LocationMarker
          onSelect={(coords) => {
            setCoordinates(coords);
            onChange(coords);
          }}
        />
        {coordinates && <MapUpdater coordinates={coordinates} />}
      </MapContainer>
    </div>
  );
}
