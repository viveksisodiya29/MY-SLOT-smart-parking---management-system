import React, { useState } from 'react';
import { X, CreditCard, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { ParkingLocation, ParkingSpot } from '../types.ts';
import { createBooking } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface StripeCheckoutModalProps {
  bookingData: {
    spot: ParkingSpot;
    location: ParkingLocation;
    hours: number;
    startTime: string;
    vehiclePlate: string;
    vehicleModel: string;
    isEv: boolean;
    totalAmount: number;
  };
  onClose: () => void;
  onSuccess: (booking: any) => void;
  theme?: 'light' | 'dark';
}

type PaymentMethod = 'card' | 'upi_phonepe' | 'upi_gpay';

export const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({
  bookingData,
  onClose,
  onSuccess,
  theme = 'light',
}) => {
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [zip, setZip] = useState('');
  const [cardName, setCardName] = useState(user?.full_name || '');
  const [upiId, setUpiId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDark = theme === 'dark';

  const surfaceClass = isDark
    ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400';
  const fieldClass = `w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${surfaceClass}`;

  const fillTestCard = (brand: 'visa' | 'mastercard') => {
    if (brand === 'visa') {
      setCardNumber('4242 4242 4242 4242');
      setExpiry('08/29');
      setCvc('789');
    } else {
      setCardNumber('5555 5555 5555 4444');
      setExpiry('11/27');
      setCvc('321');
    }
    setZip('94105');
  };

  const handlePay = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setProcessing(true);

    try {
      const cardDigits = cardNumber.replace(/\D/g, '');
      const token = paymentMethod === 'card'
        ? `tok_demo_${Math.random().toString(36).substring(2, 10)}`
        : `upi_demo_${Math.random().toString(36).substring(2, 10)}`;

      const response = await createBooking({
        spot_id: bookingData.spot.id,
        location_id: bookingData.location.id,
        start_time: bookingData.startTime,
        hours: bookingData.hours,
        vehicle_plate: bookingData.vehiclePlate,
        vehicle_model: bookingData.vehicleModel,
        is_ev: bookingData.isEv,
        stripe_token: token,
        card_last4: paymentMethod === 'card' ? cardDigits.slice(-4) : '',
        payment_method: paymentMethod,
        upi_id: paymentMethod === 'card' ? undefined : upiId.trim(),
      });

      onSuccess(response.booking);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Payment failed');
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-4">
      <div className={`relative max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-3xl border shadow-2xl ${
        isDark ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-800'
      }`}>
        <div className={`flex items-center justify-between border-b px-6 py-5 ${
          isDark
            ? 'border-slate-800 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900'
            : 'border-slate-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-white'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-200 bg-blue-100 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Payment
                </span>
                <span className="rounded border border-blue-200 bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300">
                  DEMO CHECKOUT
                </span>
              </div>
              <h3 className="text-base font-bold">Secure Payment Authorization</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment window"
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`flex items-center justify-between border-b px-6 py-3.5 text-xs ${
          isDark ? 'border-slate-800 bg-slate-950/80 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          <div>
            <span>Reserving:</span>{' '}
            <strong className={isDark ? 'text-white' : 'text-slate-900'}>
              {bookingData.spot.spot_number} ({bookingData.location.name})
            </strong>
          </div>
          <div className="text-right">
            <span>Total:</span>{' '}
            <strong className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              ₹{bookingData.totalAmount.toFixed(2)}
            </strong>
          </div>
        </div>

        <div className="px-6 pb-2 pt-4">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              Choose a payment method
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['card', 'Card'],
                ['upi_phonepe', 'PhonePe'],
                ['upi_gpay', 'Google Pay'],
              ] as const).map(([method, label]) => (
                <label
                  key={method}
                  className={`flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2.5 text-center text-xs font-semibold transition-colors ${
                    paymentMethod === method
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                      : isDark
                        ? 'border-slate-700 text-slate-300 hover:border-slate-500'
                        : 'border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                    className="sr-only"
                  />
                  {method === 'card' && <CreditCard className="mr-1.5 h-4 w-4" />}
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <form onSubmit={handlePay} className="space-y-4 p-6 pt-3">
          {error && (
            <div className="flex items-start space-x-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {paymentMethod === 'card' ? (
            <>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="checkout-card-number" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Card Number
                  </label>
                  <span className="text-[10px] text-slate-400">Demo details only</span>
                </div>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="checkout-card-number"
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={cardNumber}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, '').slice(0, 16);
                      setCardNumber(digits.match(/.{1,4}/g)?.join(' ') ?? '');
                    }}
                    placeholder="4242 4242 4242 4242"
                    className={`${fieldClass} pl-10 font-mono tracking-wider`}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fillTestCard('visa')}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:border-blue-400 dark:border-slate-700 dark:text-slate-300"
                  >
                    Use test Visa
                  </button>
                  <button
                    type="button"
                    onClick={() => fillTestCard('mastercard')}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:border-blue-400 dark:border-slate-700 dark:text-slate-300"
                  >
                    Use test Mastercard
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="checkout-expiry" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Expiration
                  </label>
                  <input
                    id="checkout-expiry"
                    type="text"
                    required
                    maxLength={5}
                    autoComplete="cc-exp"
                    value={expiry}
                    onChange={(event) => setExpiry(event.target.value)}
                    placeholder="MM/YY"
                    className={`${fieldClass} text-center font-mono`}
                  />
                </div>
                <div>
                  <label htmlFor="checkout-cvc" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    CVC / CVV
                  </label>
                  <input
                    id="checkout-cvc"
                    type="text"
                    required
                    maxLength={4}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={cvc}
                    onChange={(event) => setCvc(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    className={`${fieldClass} text-center font-mono`}
                  />
                </div>
                <div>
                  <label htmlFor="checkout-zip" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Postal / Zip
                  </label>
                  <input
                    id="checkout-zip"
                    type="text"
                    required
                    autoComplete="postal-code"
                    value={zip}
                    onChange={(event) => setZip(event.target.value)}
                    placeholder="Postal code"
                    className={`${fieldClass} text-center`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="checkout-card-name" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Cardholder Name
                </label>
                <input
                  id="checkout-card-name"
                  type="text"
                  required
                  autoComplete="cc-name"
                  value={cardName}
                  onChange={(event) => setCardName(event.target.value)}
                  placeholder="Full name as printed on card"
                  className={fieldClass}
                />
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="checkout-upi-id" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                UPI ID / Phone
              </label>
              <input
                id="checkout-upi-id"
                type="text"
                required
                autoComplete="username"
                value={upiId}
                onChange={(event) => setUpiId(event.target.value)}
                placeholder={paymentMethod === 'upi_gpay' ? 'yournumber@okgoogle' : 'yournumber@upi or phone number'}
                className={fieldClass}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={processing}
            className="mt-2 flex w-full items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <span>Processing payment...</span>
              </>
            ) : (
              <span>Pay ₹{bookingData.totalAmount.toFixed(2)} &amp; Lock Spot</span>
            )}
          </button>

          <div className="flex items-center justify-center space-x-2 pt-1 text-center text-[11px] text-slate-500">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Demo flow only. Full card number, expiry, and CVC are not sent or stored by the app.</span>
          </div>
        </form>
      </div>
    </div>
  );
};
