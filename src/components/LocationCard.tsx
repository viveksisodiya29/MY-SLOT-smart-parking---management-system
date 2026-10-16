import React from 'react';
import {
  MapPin,
  Zap,
  Car,
  Shield,
  ArrowRight,
  Clock,
  Route,
} from 'lucide-react';
import { ParkingLocation } from '../types.ts';

interface LocationCardProps {
  location: ParkingLocation;
  onSelect: (loc: ParkingLocation) => void;
  onFindRoute?: (loc: ParkingLocation) => void;
  isSelected: boolean;
  theme?: 'light' | 'dark';
}

export const LocationCard: React.FC<LocationCardProps> = ({
  location,
  onSelect,
  onFindRoute,
  isSelected,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      onClick={() => onSelect(location)}
      className={`group relative flex flex-col justify-between rounded-3xl border transition-all duration-200 cursor-pointer overflow-hidden ${
        isSelected
          ? isDark
            ? 'bg-slate-900 border-cyan-500 ring-2 ring-cyan-500/30 shadow-xl'
            : 'bg-white border-cyan-600 ring-2 ring-cyan-600/30 shadow-lg'
          : isDark
          ? 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
          : 'bg-white hover:bg-slate-50/50 border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md'
      }`}
    >
      {/* Image Banner */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
        <img
          src={location.image_url}
          alt={location.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Proximity Pill */}
        {location.distance_miles !== null && location.distance_miles !== undefined && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-extrabold bg-white/95 dark:bg-slate-950/80 backdrop-blur text-cyan-800 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/40 shadow-sm">
            {location.distance_miles} miles away
          </div>
        )}

        {/* Live Availability Ribbon */}
        <div className="absolute bottom-3 left-3 flex items-center space-x-2">
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-950/90 dark:bg-emerald-950/85 backdrop-blur border border-emerald-400/50 text-emerald-300 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{location.available_spots} Spots Free</span>
          </div>

          {location.available_ev_spots > 0 && (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-950/90 dark:bg-amber-950/85 backdrop-blur border border-amber-400/50 text-amber-300 text-xs font-bold shadow-sm">
              <Zap className="w-3 h-3 fill-amber-300 text-amber-300" />
              <span>{location.available_ev_spots} EV Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between">
            <h3 className={`text-base font-bold transition-colors ${
              isDark ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-cyan-600'
            }`}>
              {location.name}
            </h3>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{location.address}, {location.city}</span>
          </div>

          {/* Pricing Highlight */}
          <div className={`grid grid-cols-2 gap-2 mt-4 p-3 rounded-2xl border ${
            isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Parking Rate</span>
              <p className={`text-sm font-extrabold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ₹{location.hourly_rate.toFixed(2)}{' '}
                <span className="text-[11px] font-normal text-slate-500">/ hr</span>
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <Zap className="w-3 h-3 fill-emerald-600 dark:fill-emerald-400" />
                <span>EV Charging</span>
              </span>
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                ₹{location.ev_rate_kwh.toFixed(2)}{' '}
                <span className="text-[11px] font-normal text-slate-500">/ kWh</span>
              </p>
            </div>
          </div>

          {/* Amenities Pills */}
          {location.amenities && location.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3.5">
              {location.amenities.slice(0, 4).map((amenity, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                    isDark
                      ? 'bg-slate-800 text-slate-300 border-slate-700/60'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {amenity}
                </span>
              ))}
              {location.amenities.length > 4 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] text-slate-400">
                  +{location.amenities.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className={`mt-5 pt-4 border-t flex items-center justify-between ${
          isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-500'
        }`}>
          <div className="text-xs">
            Capacity: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{location.total_spots} bays</strong>
          </div>
          <button
            type="button"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-all group-hover:translate-x-0.5"
          >
            <span>Choose Spot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
