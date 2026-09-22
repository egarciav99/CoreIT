import React from 'react';
import { motion } from 'motion/react';
import { Play, Clock, Zap, Trash2, Code2, Workflow } from 'lucide-react';
import { Automation } from '../types';
import { renderAutomationIcon, COLOR_SCHEMES } from '../utils/theme';
import { playPosBeep } from '../utils/audio';

interface AutomationCardProps {
  automation: Automation;
  viewMode: 'circles' | 'pads';
  onSelect: (automation: Automation) => void;
  onQuickRun: (e: React.MouseEvent, automation: Automation) => void;
  onDeleteClick: (e: React.MouseEvent, automation: Automation) => void;
  isTriggering?: boolean;
}

export const AutomationCard: React.FC<AutomationCardProps> = ({
  automation,
  viewMode,
  onSelect,
  onQuickRun,
  onDeleteClick,
  isTriggering = false,
}) => {
  const colorScheme = COLOR_SCHEMES[automation.color] || COLOR_SCHEMES.blue;
  const isActive = automation.status === 'active';
  const hasCustomCode = Boolean(automation.customCode);
  const isN8n = automation.webhookProvider === 'n8n' || automation.triggerType === 'n8n_webhook';

  const handleCardClick = () => {
    playPosBeep('tap');
    onSelect(automation);
  };

  const handleRunClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playPosBeep('trigger');
    onQuickRun(e, automation);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    playPosBeep('tap');
    onDeleteClick(e, automation);
  };

  if (viewMode === 'circles') {
    // CLEAN MINIMALISM CIRCULAR BUTTONS
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: 1.04, y: -3 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative flex flex-col items-center group cursor-pointer"
        onClick={handleCardClick}
      >
        {/* Quick Delete Trash Button (Top right on hover/tap) */}
        <button
          id={`btn-card-delete-${automation.id}`}
          onClick={handleDelete}
          title="Eliminar automatización"
          className="absolute -top-1 -right-1 z-10 w-7 h-7 rounded-full bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* The Clean White Circle Button */}
        <div
          id={`pos-circle-${automation.id}`}
          className={`automation-btn relative w-36 h-36 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center p-3 text-center bg-white shadow-xs border-2 transition-all select-none ${
            isActive 
              ? 'border-slate-200/90 hover:border-emerald-500 hover:shadow-md' 
              : 'border-slate-200/60 opacity-80 hover:opacity-100 hover:border-slate-300'
          }`}
        >
          {/* Icon Box with Pastel Tinted Background */}
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105 ${colorScheme.iconBg}`}>
            {renderAutomationIcon(automation.icon, "w-5 h-5 sm:w-6 sm:h-6")}
          </div>

          {/* Name */}
          <h3 className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-1 px-2 mb-1">
            {automation.name}
          </h3>

          {/* Status Dot + ON/OFF Text + Code Badge */}
          <div className="flex items-center gap-1.5">
            <div 
              className={`w-2 h-2 rounded-full ${
                isActive ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-slate-300'
              }`} 
            />
            <span className="text-[11px] font-semibold text-slate-500 font-mono">
              {isActive ? 'ON' : 'OFF'}
            </span>
            {hasCustomCode && (
              <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-1 rounded border border-emerald-200/60">
                JS
              </span>
            )}
          </div>

          {/* Quick Trigger Button (Small bottom pill) */}
          <button
            id={`btn-quick-run-${automation.id}`}
            onClick={handleRunClick}
            disabled={isTriggering}
            title="Disparo rápido"
            className={`mt-1.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium transition-all cursor-pointer ${
              isTriggering
                ? 'bg-amber-100 text-amber-700 animate-pulse font-bold'
                : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600'
            }`}
          >
            <Zap className="w-2.5 h-2.5" />
            <span>{isTriggering ? 'RUN...' : `${automation.executionCount}`}</span>
          </button>
        </div>

        {/* Subtitle / Category Label */}
        <span className="text-xs text-slate-500 mt-2 font-medium truncate max-w-[140px]">
          {automation.category}
        </span>
      </motion.div>
    );
  }

  // CLEAN MINIMALISM RECTANGULAR CARD
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      onClick={handleCardClick}
      id={`pos-pad-${automation.id}`}
      className={`automation-btn group relative rounded-2xl p-5 bg-white border flex flex-col justify-between min-h-[190px] shadow-xs hover:shadow-md transition-all cursor-pointer select-none ${
        isActive
          ? 'border-slate-200 hover:border-emerald-400'
          : 'border-slate-200/70 opacity-85 hover:opacity-100 hover:border-slate-300'
      }`}
    >
      {/* Top row: Icon Box + Category + Status + Delete */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorScheme.iconBg}`}>
            {renderAutomationIcon(automation.icon, "w-5 h-5")}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {automation.category}
              </span>
              {hasCustomCode && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-mono font-bold border border-emerald-200/60">
                  Script
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {automation.n8nWorkflowName || automation.triggerType}
            </div>
          </div>
        </div>

        {/* Status Badge & Trash Icon */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">
            <div 
              className={`w-2 h-2 rounded-full ${
                isActive ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-slate-300'
              }`} 
            />
            <span className="text-xs font-semibold text-slate-600 font-mono">
              {isActive ? 'ON' : 'OFF'}
            </span>
          </div>

          <button
            id={`btn-pad-delete-${automation.id}`}
            onClick={handleDelete}
            title="Eliminar automatización"
            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center: Title & Description */}
      <div className="my-3">
        <h3 className="text-base font-bold text-slate-800 line-clamp-1 mb-1">
          {automation.name}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {automation.description}
        </p>
      </div>

      {/* Bottom Footer: Stats + Quick Trigger */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{automation.lastExecutedAt || 'Sin ejecuciones'}</span>
        </div>

        <button
          id={`btn-pad-quick-run-${automation.id}`}
          onClick={handleRunClick}
          disabled={isTriggering}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
            isTriggering
              ? 'bg-amber-100 text-amber-700 animate-pulse'
              : 'bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white'
          }`}
        >
          <Zap className="w-3 h-3" />
          <span>{isTriggering ? 'RUN...' : 'DISPARAR'}</span>
        </button>
      </div>
    </motion.div>
  );
};
