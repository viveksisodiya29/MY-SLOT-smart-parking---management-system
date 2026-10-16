import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Car,
  Shield,
  Clock,
  Check,
  AlertCircle,
  Sparkles,
  Info,
  CreditCard,
  BatteryCharging,
} from 'lucide-react';
import { ParkingLocation, ParkingSpot, SpotStatus } from '../types.ts';
import { getLocationSpots } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface SpotSelectorModalProps {
  location: ParkingLocation;
  onClose: () => void;
  onProceedToCheckout: (data: {
    spot: ParkingSpot;
    location: ParkingLocation;
    hours: number;
    startTime: string;
    vehiclePlate: string;
    vehicleModel: string;
    isEv: boolean;
    totalAmount: number;
  }) => void;
  theme?: 'light' | 'dark';
}

export const SpotSelectorModal: React.FC<SpotSelectorModalProps> = ({
  location,
  onClose,
  onProceedToCheckout,
  theme = 'light',
}) => {
  const { user } = useAuth();
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentFloor, setCurrentFloor] = useState<string>('Level 1');
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);

  const [hours, setHours] = useState<number>(2);
  const [vehiclePlate, setVehiclePlate] = useState<string>('7XYZ890');
  const [vehicleModel, setVehicleModel] = useState<string>('Tesla Model Y');
  const [formError, setFormError] = useState<string | null>(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    loadSpots();
  }, [location.id]);

  const loadSpots = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getLocationSpots(location.id);
      setSpots(res.spots);
      const firstAvail = res.spots.find((s) => s.status === 'available');
      if (firstAvail) {
        setSelectedSpot(firstAvail);
        setCurrentFloor(firstAvail.floor_level);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load parking spots');
    } finally {
      setLoading(false);
    }
  };

  const floors = Array.from(new Set(spots.map((s) => s.floor_level)));
  const visibleSpots = spots.filter((s) => s.floor_level === currentFloor);

  const isEvSpot = selectedSpot?.spot_type === 'ev_charger';
  const basePrice = selectedSpot ? selectedSpot.price_per_hour * hours : 0;
  const evEnergyFee = isEvSpot ? location.ev_rate_kwh * 25.0 : 0;
  const subtotal = basePrice + evEnergyFee;
  const tax = subtotal * 0.0875;
  const totalAmount = Number((subtotal + tax).toFixed(2));

  const handleContinue = () => {
    setFormError(null);
    if (!selectedSpot) {
      setFormError('Please click to select an available parking spot');
      return;
    }
    if (selectedSpot.status !== 'available') {
      setFormError(`Spot ${selectedSpot.spot_number} is currently ${selectedSpot.status}`);
      return;
    }
    if (!vehiclePlate.trim()) {
      setFormError('Please enter your vehicle license plate number');
      return;
    }

    onProceedToCheckout({
      spot: selectedSpot,
      location,
      hours,
      startTime: new Date().toISOString(),
      vehiclePlate: vehiclePlate.trim().toUpperCase(),
      vehicleModel: vehicleModel.trim() || 'Standard Vehicle',
      isEv: isEvSpot,
      totalAmount,
    });
  };

  const getStatusBadge = (status: SpotStatus) => {
    if (isDark) {
      switch (status) {
        case 'available':
          return { bg: 'bg-emerald-950/60 border-emerald-500/60 hover:border-emerald-400 text-emerald-300', dot: 'bg-emerald-400' };
        case 'reserved':
          return { bg: 'bg-amber-950/40 border-amber-500/40 text-amber-400 opacity-75', dot: 'bg-amber-400' };
        case 'occupied':
          return { bg: 'bg-red-950/40 border-red-500/40 text-red-400 opacity-70', dot: 'bg-red-400' };
        case 'maintenance':
          return { bg: 'bg-slate-800/60 border-slate-700 text-slate-500 opacity-50', dot: 'bg-slate-500' };
      }
    } else {
      switch (status) {
        case 'available':
          return { bg: 'bg-emerald-50/80 border-emerald-300 hover:border-emerald-500 text-emerald-900', dot: 'bg-emerald-500' };
        case 'reserved':
          return { bg: 'bg-amber-50/80 border-amber-200 text-amber-900 opacity-80', dot: 'bg-amber-500' };
        case 'occupied':
          return { bg: 'bg-rose-50/80 border-rose-200 text-rose-900 opacity-75', dot: 'bg-rose-500' };
        case 'maintenance':
          return { bg: 'bg-slate-100 border-slate-200 text-slate-500 opacity-60', dot: 'bg-slate-400' };
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className={`relative w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold">{location.name}</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 font-semibold">
                  Live Floorplan
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{location.address}, {location.city}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className={`flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x ${
          isDark ? 'divide-slate-800' : 'divide-slate-200'
        }`}>
          {/* Left: Floorplan Grid */}
          <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-6">
            <div>
              {/* Floor Switcher & Legend */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className={`flex items-center p-1 rounded-xl border ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  {floors.map((floor) => (
                    <button
                      key={floor}
                      onClick={() => setCurrentFloor(floor)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        currentFloor === floor
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      {floor}
                    </button>
                  ))}
                </div>

                {/* Spot Status Legend */}
                <div className="flex items-center space-x-3 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Available</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Reserved</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Occupied</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    <span>EV Fast</span>
                  </span>
                </div>
              </div>

              {/* Floorplan Layout */}
              {loading ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-2">
                  <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500">Loading bay occupancy...</p>
                </div>
              ) : (
                <div className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                }`}>
                  <div className={`flex items-center justify-between text-xs pb-3 mb-3 border-b font-mono ${
                    isDark ? 'border-slate-800/60 text-slate-500' : 'border-slate-200 text-slate-400'
                  }`}>
                    <span>ENTRY &lt;&lt; LANE A</span>
                    <span>DRIVEWAY</span>
                    <span>LANE B &gt;&gt; EXIT</span>
                  </div>

                  {/* Spot Bays Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {visibleSpots.map((spot) => {
                      const isSelected = selectedSpot?.id === spot.id;
                      const statusConfig = getStatusBadge(spot.status);
                      const isEv = spot.spot_type === 'ev_charger';

                      return (
                        <button
                          key={spot.id}
                          disabled={spot.status !== 'available'}
                          onClick={() => setSelectedSpot(spot)}
                          className={`relative p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                            isSelected
                              ? isDark
                                ? 'bg-cyan-500/20 border-cyan-400 ring-2 ring-cyan-400/50 scale-[1.03] shadow-md'
                                : 'bg-cyan-50 border-cyan-600 ring-2 ring-cyan-600/40 scale-[1.03] shadow-md text-cyan-950'
                              : statusConfig.bg
                          }`}
                        >
                          <div className="w-full flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono font-bold">
                              {spot.spot_number}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                          </div>

                          <div className="my-1">
                            {isEv ? (
                              <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                                <Zap className="w-4 h-4 fill-current" />
                                <span className="text-[9px] font-bold">EV</span>
                              </div>
                            ) : spot.spot_type === 'accessible' ? (
                              <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">ACC</span>
                            ) : (
                              <Car className="w-4 h-4 text-slate-400" />
                            )}
                          </div>

                          <span className="text-[10px] font-bold mt-1">
                            ${spot.price_per_hour}/hr
                          </span>

                          {isEv && spot.ev_power_kw > 0 && (
                            <span className="mt-1 text-[8px] font-extrabold uppercase px-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                              {spot.ev_power_kw}kW
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className={`p-3 rounded-xl border flex items-center space-x-2 text-xs ${
              isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'
            }`}>
              <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>
                Parking spots update in real-time. Once reserved, your spot is locked exclusively for your vehicle plate.
              </span>
            </div>
          </div>

          {/* Right: Reservation Config & Price Breakdown */}
          <div className={`lg:col-span-5 p-6 flex flex-col justify-between ${
            isDark ? 'bg-slate-900/60' : 'bg-slate-50/50'
          }`}>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 mb-4 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Reservation Details</span>
              </h3>

              {selectedSpot ? (
                <div className={`p-4 rounded-2xl border space-y-3 mb-5 ${
                  isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Selected Bay</span>
                      <h4 className="text-lg font-extrabold">
                        {selectedSpot.spot_number}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          ({selectedSpot.floor_level})
                        </span>
                      </h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                      {selectedSpot.spot_type.replace('_', ' ')}
                    </span>
                  </div>

                  {isEvSpot && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-300 flex items-center space-x-2.5 text-xs">
                      <BatteryCharging className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className="font-bold">{selectedSpot.ev_charger_type}</p>
                        <p className="text-[11px] opacity-90">
                          High-speed charging up to {selectedSpot.ev_power_kw} kW. Auto-sync with EV.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 mb-5 text-center">
                  Select a spot on the floorplan to configure your booking.
                </div>
              )}

              {/* Duration Selector */}
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-2 flex items-center space-x-1 text-slate-700 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Reservation Duration</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 4, 8].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHours(h)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        hours === h
                          ? 'bg-cyan-600 border-cyan-600 text-white shadow-xs'
                          : isDark
                          ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {h} {h === 1 ? 'Hour' : 'Hours'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle Information */}
              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Vehicle License Plate Number
                  </label>
                  <input
                    type="text"
                    required
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    placeholder="e.g. 7XYZ890"
                    className={`w-full px-3 py-2 text-sm uppercase font-mono tracking-wider font-bold rounded-xl border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Vehicle Model
                  </label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="e.g. Tesla Model 3 / BMW i4"
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Parking Rate ({hours} hrs @ ₹{selectedSpot?.price_per_hour || 0}/hr)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">₹{basePrice.toFixed(2)}</span>
                </div>

                {isEvSpot && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                    <span className="flex items-center space-x-1">
                      <Zap className="w-3 h-3" />
                      <span>EV Fast Energy Reservation (~25 kWh)</span>
                    </span>
                    <span className="font-semibold">₹{evEnergyFee.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Taxes &amp; City Fee (8.75%)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">₹{tax.toFixed(2)}</span>
                </div>

                <div className={`pt-2 border-t flex justify-between items-center text-sm font-bold ${
                  isDark ? 'border-slate-800 text-white' : 'border-slate-100 text-slate-900'
                }`}>
                  <span>Total Amount</span>
                  <span className="text-base text-cyan-600 dark:text-cyan-400 font-extrabold">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {formError && (
                <div className="mt-3 flex items-center space-x-2 text-xs text-red-600 dark:text-red-400 p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </div>

            {/* Checkout Button */}
            <div className={`mt-6 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={handleContinue}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center space-x-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay ₹{totalAmount.toFixed(2)} with Card / UPI</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
