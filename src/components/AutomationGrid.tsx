import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, SearchX } from 'lucide-react';
import { Automation } from '../types';
import { AutomationCard } from './AutomationCard';

interface AutomationGridProps {
  automations: Automation[];
  viewMode: 'circles' | 'pads';
  onSelectAutomation: (automation: Automation) => void;
  onQuickRun: (e: React.MouseEvent, automation: Automation) => void;
  onDeleteClick: (e: React.MouseEvent, automation: Automation) => void;
  onOpenCreateModal: () => void;
  triggeringId: string | null;
  activeCategory: string;
  searchQuery: string;
}

export const AutomationGrid: React.FC<AutomationGridProps> = ({
  automations,
  viewMode,
  onSelectAutomation,
  onQuickRun,
  onDeleteClick,
  onOpenCreateModal,
  triggeringId,
  activeCategory,
  searchQuery,
}) => {
  if (automations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center my-8 rounded-3xl bg-white border border-slate-200 max-w-lg mx-auto shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          No se encontraron automatizaciones
        </h3>
        <p className="text-xs text-slate-500 mb-6 max-w-sm">
          {searchQuery
            ? `No hay resultados para "${searchQuery}" en la categoría ${activeCategory}.`
            : `Aún no hay automatizaciones creadas en "${activeCategory}".`}
        </p>
        <button
          id="btn-empty-state-create"
          onClick={onOpenCreateModal}
          className="automation-btn flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wide shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Crear Nueva Automatización</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {viewMode === 'circles' ? (
        // Clean Minimalism Circular Grid
        <motion.div 
          layout
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8 justify-items-center"
        >
          <AnimatePresence mode="popLayout">
            {automations.map((auto) => (
              <AutomationCard
                key={auto.id}
                automation={auto}
                viewMode="circles"
                onSelect={onSelectAutomation}
                onQuickRun={onQuickRun}
                onDeleteClick={onDeleteClick}
                isTriggering={triggeringId === auto.id}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        // Clean Minimalism Rectangular Cards Grid
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5"
        >
          <AnimatePresence mode="popLayout">
            {automations.map((auto) => (
              <AutomationCard
                key={auto.id}
                automation={auto}
                viewMode="pads"
                onSelect={onSelectAutomation}
                onQuickRun={onQuickRun}
                onDeleteClick={onDeleteClick}
                isTriggering={triggeringId === auto.id}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};
