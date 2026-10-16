import React, { useState, useEffect, useRef } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import {
  Navigation,
  Zap,
  Car,
  ZoomIn,
  ZoomOut,
  ArrowRight,
  Route,
  Clock,
  ExternalLink,
  X,
  Compass,
  CheckCircle,
  MapPin,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { ParkingLocation, NavigationRoute } from '../types.ts';
import { fetchEasyRoute } from '../lib/api.ts';

let mapsLibraryPromise: Promise<google.maps.MapsLibrary> | null = null;

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#d7dde5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#465568' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#2b394b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38485d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a35' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3d50' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17212d' }] },
];

function loadGoogleMaps(): Promise<google.maps.MapsLibrary> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return Promise.reject(
      new Error(
        'Add VITE_GOOGLE_MAPS_API_KEY to the project root .env file, enable Maps JavaScript API in Google Cloud, then restart the app.'
      )
    );
  }

  if (!mapsLibraryPromise) {
    setOptions({ key: apiKey, v: 'weekly' });
    mapsLibraryPromise = importLibrary('maps').catch((error: unknown) => {
      mapsLibraryPromise = null;
      throw error;
    });
  }

  return mapsLibraryPromise;
}

interface InteractiveMapProps {
  locations: ParkingLocation[];
  selectedLocation: ParkingLocation | null;
  onSelectLocation: (loc: ParkingLocation) => void;
  userCoords: { lat: number; lng: number } | null;
  onRecenter: () => void;
  theme?: 'light' | 'dark';
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  userCoords,
  onRecenter,
  theme = 'light',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const garageMarkersRef = useRef<google.maps.Marker[]>([]);
  const routeLayerRef = useRef<google.maps.Polyline | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  const [activeRoute, setActiveRoute] = useState<NavigationRoute | null>(null);
  const [routeDestination, setRouteDestination] = useState<ParkingLocation | null>(null);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [activeCardLocation, setActiveCardLocation] = useState<ParkingLocation | null>(null);
  const [showSteps, setShowSteps] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState<boolean>(false);

  const isDark = theme === 'dark';

  // Load the Google Maps JavaScript API and initialize the map once.
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isMounted = true;

    loadGoogleMaps()
      .then(() => {
        if (!isMounted || !mapContainerRef.current) return;

        const map = new google.maps.Map(mapContainerRef.current, {
          center: userCoords ?? { lat: 28.6315, lng: 77.2167 },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: isDark ? DARK_MAP_STYLES : [],
        });

        mapInstanceRef.current = map;
        setMapError(null);
        setMapReady(true);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        console.error('Failed to load Google Maps:', error);
        const details = error instanceof Error ? error.message : 'Unknown Google Maps API error.';
        setMapError(
          `${details} Check that billing is enabled and your API key allows this website referrer.`
        );
      });

    return () => {
      isMounted = false;
      garageMarkersRef.current.forEach((marker) => marker.setMap(null));
      garageMarkersRef.current = [];
      userMarkerRef.current?.setMap(null);
      routeLayerRef.current?.setMap(null);
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    map.setOptions({ styles: isDark ? DARK_MAP_STYLES : [] });
  }, [isDark, mapReady]);

  // Keep the user's location marker synchronized with the selected GPS position.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (!userCoords) {
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      return;
    }

    const position = new google.maps.LatLng(userCoords.lat, userCoords.lng);
    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(position);
      return;
    }

    userMarkerRef.current = new google.maps.Marker({
      map,
      position,
      title: 'You are here',
      zIndex: 1000,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: '#0284c7',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
    });
  }, [userCoords, mapReady]);

  // Render and refresh garage availability markers from the backend response.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    garageMarkersRef.current.forEach((marker) => marker.setMap(null));
    garageMarkersRef.current = locations.map((loc) => {
      const isSelected = selectedLocation?.id === loc.id;
      const statusColor =
        loc.available_spots <= 0
          ? '#ef4444'
          : loc.available_spots > 10
            ? '#10b981'
            : '#f59e0b';

      const marker = new google.maps.Marker({
        map,
        position: { lat: loc.latitude, lng: loc.longitude },
        title: `${loc.name} — ${loc.available_spots} bays available${loc.ev_spots > 0 ? ' — EV charging' : ''}`,
        label: {
          text: `${loc.available_spots} bays${loc.ev_spots > 0 ? ' ⚡' : ''}`,
          color: isDark ? '#f8fafc' : '#0f172a',
          fontSize: '11px',
          fontWeight: '700',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 10 : 8,
          fillColor: isSelected ? '#0284c7' : statusColor,
          fillOpacity: 1,
          strokeColor: isDark ? '#0f172a' : '#ffffff',
          strokeWeight: 3,
        },
        zIndex: isSelected ? 2 : 1,
      });

      marker.addListener('click', () => {
        setActiveCardLocation(loc);
        onSelectLocation(loc);
      });

      return marker;
    });

    return () => {
      garageMarkersRef.current.forEach((marker) => marker.setMap(null));
      garageMarkersRef.current = [];
    };
  }, [locations, selectedLocation, isDark, mapReady, onSelectLocation]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !activeRoute) {
      routeLayerRef.current?.setMap(null);
      routeLayerRef.current = null;
      return;
    }

    routeLayerRef.current?.setMap(null);
    const path = activeRoute.coordinates.map(([lat, lng]) => ({ lat, lng }));
    const polyline = new google.maps.Polyline({
      map,
      path,
      strokeColor: '#0284c7',
      strokeOpacity: 0.9,
      strokeWeight: 6,
    });
    routeLayerRef.current = polyline;

    const bounds = new google.maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 50);
    }

    return () => {
      polyline.setMap(null);
      if (routeLayerRef.current === polyline) {
        routeLayerRef.current = null;
      }
    };
  }, [activeRoute, mapReady]);

  useEffect(() => {
    if (selectedLocation) {
      setActiveCardLocation(selectedLocation);
    }
  }, [selectedLocation]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !userCoords) return;
    map.panTo(userCoords);
  }, [userCoords, mapReady]);

  // 4. Calculate & Draw Route
  const handleFindRoute = async (dest: ParkingLocation) => {
    if (!userCoords) {
      alert('Please detect or select your GPS location first to generate easy route navigation.');
      return;
    }

    setLoadingRoute(true);
    setRouteDestination(dest);
    setActiveCardLocation(dest);

    try {
      const route = await fetchEasyRoute(
        userCoords.lat,
        userCoords.lng,
        dest.latitude,
        dest.longitude
      );

      setActiveRoute(route);
    } catch (err) {
      console.error('Failed to get route:', err);
      alert('Could not compute road directions. Direct GPS link is available.');
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleClearRoute = () => {
    setActiveRoute(null);
    setRouteDestination(null);
    setShowSteps(false);
    routeLayerRef.current?.setMap(null);
    routeLayerRef.current = null;
  };

  const handleZoomIn = () => {
    const map = mapInstanceRef.current;
    if (map) map.setZoom((map.getZoom() ?? 12) + 1);
  };

  const handleZoomOut = () => {
    const map = mapInstanceRef.current;
    if (map) map.setZoom((map.getZoom() ?? 12) - 1);
  };

  return (
    <div
      className={`relative w-full h-[480px] lg:h-[540px] rounded-3xl border overflow-hidden shadow-lg select-none transition-colors ${
        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}
    >
      {/* Real Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {mapError && (
        <div
          className={`absolute inset-0 z-10 flex items-center justify-center p-6 text-center ${
            isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-700'
          }`}
          role="alert"
        >
          <div className="max-w-lg">
            <MapPin className="mx-auto mb-3 h-8 w-8 text-cyan-600" />
            <h3 className="font-bold">Google Maps needs configuration</h3>
            <p className="mt-2 text-sm">{mapError}</p>
            <a
              className="mt-3 inline-block text-sm font-semibold text-cyan-600 underline"
              href="https://console.cloud.google.com/google/maps-apis"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Google Maps Platform
            </a>
          </div>
        </div>
      )}

      {/* Top Left Floating GPS Status HUD */}
      <div className="absolute top-4 left-4 z-[400] flex items-center space-x-2">
        <div
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border backdrop-blur shadow-md text-xs ${
            isDark
              ? 'bg-slate-900/90 border-slate-700/80 text-slate-200'
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-bold">Real-Time Live Map</span>
          <span className="text-slate-400">|</span>
          <span className="text-cyan-600 dark:text-cyan-400 font-bold font-mono">
            {locations.length} Garages Active
          </span>
        </div>

        <button
          onClick={onRecenter}
          title="Recenter to my location"
          className={`p-2 rounded-xl border backdrop-blur shadow-md transition-colors ${
            isDark
              ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-cyan-400'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-cyan-700'
          }`}
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {/* Top Right Zoom Controls */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col space-y-1.5">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className={`p-2 rounded-xl border backdrop-blur shadow-md transition-colors ${
            isDark
              ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className={`p-2 rounded-xl border backdrop-blur shadow-md transition-colors ${
            isDark
              ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Easy Route Navigation Panel */}
      {activeRoute && routeDestination && (
        <div
          className={`absolute top-16 left-4 right-4 sm:right-auto sm:w-96 z-[400] rounded-2xl border backdrop-blur shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200 ${
            isDark
              ? 'bg-slate-900/95 border-slate-700 text-slate-100'
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-cyan-600/10">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-cyan-600 text-white">
                <Route className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-600 dark:text-cyan-400">
                  Easy Route Navigation
                </span>
                <h4 className="text-xs font-bold line-clamp-1">{routeDestination.name}</h4>
              </div>
            </div>
            <button
              onClick={handleClearRoute}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div
                className={`p-2 rounded-xl border ${
                  isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-[10px] text-slate-400 block font-medium">Distance</span>
                <span className="font-extrabold text-sm text-cyan-600 dark:text-cyan-400">
                  {activeRoute.distanceKm} km ({activeRoute.distanceMiles} mi)
                </span>
              </div>
              <div
                className={`p-2 rounded-xl border ${
                  isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-[10px] text-slate-400 block font-medium">Est. Drive Time</span>
                <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                  ~{activeRoute.durationMinutes} mins
                </span>
              </div>
            </div>

            {/* Turn-by-Turn Steps Toggle */}
            <div className="pt-1">
              <button
                onClick={() => setShowSteps(!showSteps)}
                className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center justify-between w-full"
              >
                <span>
                  {showSteps ? 'Hide Step Directions' : `View ${activeRoute.steps.length} Route Steps`}
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${showSteps ? 'rotate-90' : ''}`}
                />
              </button>

              {showSteps && (
                <div className="max-h-36 overflow-y-auto mt-2 space-y-1.5 pr-1 text-[11px]">
                  {activeRoute.steps.map((st, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-lg border ${
                        isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="font-semibold text-slate-700 dark:text-slate-200">
                        {i + 1}. {st.instruction}
                      </div>
                      {st.distanceMeters > 0 && (
                        <div className="text-[10px] text-slate-400">{st.distanceMeters} meters</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${userCoords?.lat},${userCoords?.lng}&destination=${routeDestination.latitude},${routeDestination.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 transition-colors flex items-center justify-center space-x-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Google Maps</span>
              </a>

              <button
                onClick={() => onSelectLocation(routeDestination)}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center justify-center space-x-1"
              >
                <span>Reserve Bay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Location Quick Preview Card (Bottom Right) */}
      {activeCardLocation && !activeRoute && (
        <div
          className={`absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-88 z-[400] p-4 rounded-2xl border backdrop-blur shadow-2xl animate-in slide-in-from-bottom-2 duration-150 ${
            isDark
              ? 'bg-slate-900/95 border-slate-700 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                {activeCardLocation.city}
              </span>
              <h4 className="text-sm font-bold leading-snug">{activeCardLocation.name}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                {activeCardLocation.address}
              </p>
            </div>
            <button
              onClick={() => setActiveCardLocation(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 text-[10px]">Parking Rate</span>
              <p className="font-extrabold text-slate-900 dark:text-white">
                ₹{activeCardLocation.hourly_rate.toFixed(2)} / hr
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">EV Rate</span>
              <p className="font-extrabold text-emerald-600 dark:text-emerald-400">
                ₹{activeCardLocation.ev_rate_kwh.toFixed(2)} / kWh
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2">
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">
                <strong>{activeCardLocation.available_spots}</strong> free
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleFindRoute(activeCardLocation)}
                disabled={loadingRoute}
                className="flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-cyan-500 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition-colors"
              >
                <Route className="w-3.5 h-3.5" />
                <span>{loadingRoute ? 'Routing...' : 'Find Route'}</span>
              </button>

              <button
                onClick={() => onSelectLocation(activeCardLocation)}
                className="flex items-center space-x-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-sm"
              >
                <span>Reserve</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
