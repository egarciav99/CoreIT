import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Automation } from '../types';
import { playPosBeep } from '../utils/audio';

interface DeleteConfirmModalProps {
  automation: Automation | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  automation,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !automation) return null;

  const handleConfirm = () => {
    playPosBeep('delete');
    onConfirm(automation.id);
    onClose();
  };

  const handleCancel = () => {
    playPosBeep('click');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Warning Icon */}
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
          </div>

          <h3 className="text-lg font-bold text-slate-800 mb-1.5">
            ¿Eliminar automatización?
          </h3>

          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            Estás a punto de eliminar permanentemente el botón{' '}
            <strong className="text-slate-800">"{automation.name}"</strong> ({automation.category}). Se borrará su configuración y todo su historial de ejecuciones.
          </p>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 mb-6 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500">ID: {automation.id}</span>
            <span className="text-slate-700 font-semibold">{automation.executionCount} ejecuciones</span>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              id="btn-cancel-delete-modal"
              onClick={handleCancel}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all text-center cursor-pointer"
            >
              Cancelar
            </button>

            <button
              id="btn-confirm-delete-modal"
              onClick={handleConfirm}
              className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Sí, Eliminar</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
