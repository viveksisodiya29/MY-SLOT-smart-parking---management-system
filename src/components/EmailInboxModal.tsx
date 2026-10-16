import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Calendar,
  CheckCircle,
  ExternalLink,
  Printer,
  ChevronRight,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import { EmailNotification } from '../types.ts';
import { getMyNotifications } from '../lib/api.ts';

interface EmailInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export const EmailInboxModal: React.FC<EmailInboxModalProps> = ({
  isOpen,
  onClose,
  theme = 'light',
}) => {
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    if (isOpen) {
      loadEmails();
    }
  }, [isOpen]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const res = await getMyNotifications();
      setNotifications(res.notifications);
      if (res.notifications.length > 0) {
        setSelectedEmail(res.notifications[0]);
      }
    } catch (err) {
      console.error('Failed to load email notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`relative w-full max-w-5xl h-[88vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold">Email Notification Inbox</h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                  SQL Auto-Dispatched
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated confirmations delivered for every verified reservation &amp; Stripe payment
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Split View */}
        <div className={`flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x ${
          isDark ? 'divide-slate-800' : 'divide-slate-200'
        }`}>
          {/* Left Email List */}
          <div className={`md:col-span-5 lg:col-span-4 overflow-y-auto p-4 space-y-2 ${
            isDark ? 'bg-slate-950/50' : 'bg-slate-50/70'
          }`}>
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500">Loading sent notification logs...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 text-center text-slate-400 p-4">
                <Mail className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No emails dispatched yet</p>
                <p className="text-xs mt-1">Make a spot reservation to receive an automated confirmation email.</p>
              </div>
            ) : (
              notifications.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                return (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? isDark
                          ? 'bg-slate-800 border-cyan-500/60 shadow-md'
                          : 'bg-white border-cyan-600 shadow-sm ring-1 ring-cyan-600/30'
                        : isDark
                        ? 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-cyan-700 dark:text-cyan-400 truncate max-w-[140px]">
                        {email.recipient_email}
                      </span>
                      <span className="text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(email.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>

                    <h4 className="text-xs font-bold line-clamp-1">{email.subject}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                      Ref: {email.booking_code || 'Confirmed'}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Dispatched to inbox</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Rendered Email Preview */}
          <div className={`md:col-span-7 lg:col-span-8 overflow-y-auto p-6 flex flex-col justify-between ${
            isDark ? 'bg-slate-900/90' : 'bg-white'
          }`}>
            {selectedEmail ? (
              <div className="space-y-4">
                {/* Meta details bar */}
                <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-slate-400">To:</span>{' '}
                    <strong className={isDark ? 'text-slate-200' : 'text-slate-900'}>{selectedEmail.recipient_email}</strong>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Subject: <span className="font-medium text-slate-800 dark:text-white">{selectedEmail.subject}</span>
                    </div>
                  </div>
                  <div className="text-right text-slate-400 text-[11px]">
                    <div>{new Date(selectedEmail.sent_at).toLocaleString()}</div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px]">Status: 200 OK Delivered</span>
                  </div>
                </div>

                {/* Rendered HTML Container */}
                <div className={`p-1 rounded-2xl border ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  <div
                    className="p-4 sm:p-6 rounded-xl overflow-x-auto text-sm"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Select an email from the left sidebar to preview the confirmation message.
              </div>
            )}

            {selectedEmail && (
              <div className={`pt-4 border-t flex items-center justify-end space-x-2 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-colors ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
