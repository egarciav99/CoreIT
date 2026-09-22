import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { renderAutomationIcon } from '../utils/theme';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  icon?: string;
  durationMs?: number;
  status: 'success' | 'info' | 'error';
}

interface LiveRunToastProps {
  toast: ToastNotification | null;
  onDismiss: () => void;
}

export const LiveRunToast: React.FC<LiveRunToastProps> = ({ toast, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="pointer-events-auto max-w-sm w-full bg-white border border-slate-200 p-4 rounded-2xl shadow-xl flex items-start gap-3 text-slate-800"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60">
              {toast.icon ? renderAutomationIcon(toast.icon, "w-5 h-5") : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-800 truncate">
                  {toast.title}
                </h4>
                {toast.durationMs && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {toast.durationMs}ms
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                {toast.message}
              </p>
            </div>

            <button
              onClick={onDismiss}
              className="text-slate-400 hover:text-slate-600 p-1 text-xs"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
