import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Download,
  Clock
} from 'lucide-react';
import { POSStats } from '../types';
import { getConfig } from '../config';
import { playPosBeep, setSoundEnabled } from '../utils/audio';

interface PosHeaderProps {
  stats: POSStats;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCreateModal: () => void;
  onResetDefaults: () => void;
  onExportData: () => void;
  viewMode: 'circles' | 'pads';
  onViewModeChange: (mode: 'circles' | 'pads') => void;
}

export const PosHeader: React.FC<PosHeaderProps> = ({
  stats,
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  onResetDefaults,
  onExportData,
  viewMode,
  onViewModeChange,
}) => {
  const [time, setTime] = useState<string>('');
  const [soundOn, setSoundOn] = useState<boolean>(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) {
      playPosBeep('click');
    }
  };

  const handleCreateClick = () => {
    playPosBeep('tap');
    onOpenCreateModal();
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Upper Status & Utility Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              TERM-01 • ONLINE
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-500 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-700 font-medium">{time}</span>
          </div>

          <span className="hidden md:inline-block text-slate-300">|</span>

          <div className="hidden md:flex items-center gap-2 text-slate-500">
            <span>{getConfig().mode === 'demo' ? 'Ejecuciones hoy' : 'Ejecuciones'}: <strong className="text-slate-800 font-semibold">{stats.totalExecutions}</strong></span>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              id="btn-view-circles"
              onClick={() => {
                playPosBeep('click');
                onViewModeChange('circles');
              }}
              title="Vista de Bolitas / Círculos"
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'circles'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ● Círculos
            </button>
            <button
              id="btn-view-pads"
              onClick={() => {
                playPosBeep('click');
                onViewModeChange('pads');
              }}
              title="Vista de Cuadrícula Clásica"
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'pads'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ■ Tarjetas
            </button>
          </div>

          {/* Audio Feedback Toggle */}
          <button
            id="btn-toggle-sound"
            onClick={handleToggleSound}
            title={soundOn ? "Sonido Táctil Activado" : "Sonido Desactivado"}
            className={`px-2.5 py-1 rounded-xl border transition-all flex items-center gap-1 text-xs font-medium ${
              soundOn 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
            }`}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px] font-mono">{soundOn ? 'SONIDO' : 'MUTE'}</span>
          </button>

          {/* Export & Reset */}
          <button
            id="btn-export-json"
            onClick={() => {
              playPosBeep('click');
              onExportData();
            }}
            title="Exportar respaldo JSON"
            className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-emerald-700 hover:border-emerald-300 transition-all text-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-reset-defaults"
            onClick={() => {
              if (window.confirm('¿Deseas restaurar las automatizaciones iniciales?')) {
                playPosBeep('delete');
                onResetDefaults();
              }
            }}
            title="Restaurar valores iniciales"
            className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-amber-600 hover:border-amber-300 transition-all text-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Clean Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 sm:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {getConfig().logoUrl && (
              <img src={getConfig().logoUrl} alt={getConfig().companyName || 'Logo'} className="h-9 w-auto max-w-[140px] object-contain" />
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-1.5">
              <span>CoreIT</span>
              <span className="text-emerald-700 font-bold">Automatización</span>
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300/80 shadow-2xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Powered by IA - IT
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {getConfig().companyName ? `${getConfig().companyName} • ` : 'Terminal de Control & Automatización • '}<span className="text-emerald-600 font-semibold">{stats.active} Activas</span> de {stats.total}
          </p>
        </div>

        {/* Search & Add Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Clean Search Input */}
          <div className="relative flex-1 sm:w-72 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center transition-all focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100">
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              id="input-pos-search"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar automatización..."
              className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="text-xs text-slate-400 hover:text-slate-600 ml-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Primary "Nueva" Button */}
          <button
            id="btn-open-create-modal"
            onClick={handleCreateClick}
            className="automation-btn flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all select-none cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva</span>
          </button>
        </div>
      </div>
    </header>
  );
};
