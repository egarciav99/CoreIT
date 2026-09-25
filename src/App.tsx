import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  Automation, 
  AutomationCategory, 
  ExecutionLog, 
  POSStats,
  ExecuteAutomationPayload
} from './types';
import { INITIAL_AUTOMATIONS } from './data/initialAutomations';
import { PosHeader } from './components/PosHeader';
import { CategoryFilter } from './components/CategoryFilter';
import { AutomationGrid } from './components/AutomationGrid';
import { AutomationDetailModal } from './components/AutomationDetailModal';
import { CreateAutomationModal } from './components/CreateAutomationModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { LiveRunToast, ToastNotification } from './components/LiveRunToast';
import { playPosBeep } from './utils/audio';
import { executeUserCode, DEFAULT_CODE_TEMPLATES } from './utils/codeRunner';

const STORAGE_KEY = 'hub_pos_automations_v3';
const VIEW_MODE_KEY = 'hub_pos_view_mode_v3';

const CATEGORIES: AutomationCategory[] = [
  'Todas',
  'n8n Webhooks',
  'Documentos & PDF',
  'Código & Scripts',
  'IA & LLMs',
  'Datos',
  'Marketing',
  'Notificaciones',
  'Finanzas'
];

export default function App() {
  const [automations, setAutomations] = useState<Automation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_AUTOMATIONS;
  });

  const [viewMode, setViewMode] = useState<'circles' | 'pads'>(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY);
      if (saved === 'pads' || saved === 'circles') return saved;
    } catch {
      // Fallback
    }
    return 'circles';
  });

  const [activeCategory, setActiveCategory] = useState<AutomationCategory>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [deletingAutomation, setDeletingAutomation] = useState<Automation | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(automations));
    } catch (e) {
      console.error('Error guardando en localStorage', e);
    }
  }, [automations]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch (e) {
      console.error('Error guardando viewMode', e);
    }
  }, [viewMode]);

  // Toast Auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Filtered Automations
  const filteredAutomations = useMemo(() => {
    return automations.filter((auto) => {
      const matchesCategory = activeCategory === 'Todas' || auto.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        auto.name.toLowerCase().includes(q) ||
        auto.description.toLowerCase().includes(q) ||
        (auto.targetService && auto.targetService.toLowerCase().includes(q)) ||
        (auto.n8nWorkflowName && auto.n8nWorkflowName.toLowerCase().includes(q)) ||
        (auto.webhookUrl && auto.webhookUrl.toLowerCase().includes(q)) ||
        auto.triggerType.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [automations, activeCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<AutomationCategory, number> = {
      'Todas': automations.length,
      'n8n Webhooks': 0,
      'Documentos & PDF': 0,
      'Código & Scripts': 0,
      'IA & LLMs': 0,
      'Datos': 0,
      'Marketing': 0,
      'Notificaciones': 0,
      'Finanzas': 0,
    };
    automations.forEach((a) => {
      if (counts[a.category] !== undefined) {
        counts[a.category]++;
      }
    });
    return counts;
  }, [automations]);

  // Overall Statistics
  const stats: POSStats = useMemo(() => {
    const total = automations.length;
    const active = automations.filter(a => a.status === 'active').length;
    const paused = total - active;
    const totalExecutions = automations.reduce((acc, curr) => acc + curr.executionCount, 0);
    return {
      total,
      active,
      paused,
      totalExecutions,
      successRate: 99.7,
    };
  }, [automations]);

  // Actions
  const handleToggleStatus = (id: string) => {
    setAutomations(prev => prev.map(a => {
      if (a.id === id) {
        const nextStatus = a.status === 'active' ? 'paused' : 'active';
        return { ...a, status: nextStatus };
      }
      return a;
    }));

    if (selectedAutomation && selectedAutomation.id === id) {
      setSelectedAutomation(prev => prev ? {
        ...prev,
        status: prev.status === 'active' ? 'paused' : 'active'
      } : null);
    }
  };

  const handleConfirmDelete = (id: string) => {
    const toDelete = automations.find(a => a.id === id);
    setAutomations(prev => prev.filter(a => a.id !== id));
    if (selectedAutomation?.id === id) {
      setSelectedAutomation(null);
    }
    setToast({
      id: `toast-${Date.now()}`,
      title: 'Automatización Eliminada',
      message: `"${toDelete?.name || 'El flujo'}" ha sido eliminado del tablero.`,
      status: 'info'
    });
  };

  const handleClone = (automation: Automation) => {
    const newAuto: Automation = {
      ...automation,
      id: `auto-${Date.now()}`,
      name: `${automation.name} (Copia)`,
      executionCount: 0,
      lastExecutedAt: null,
      createdAt: new Date().toISOString().split('T')[0],
      logs: []
    };
    setAutomations(prev => [newAuto, ...prev]);
    setSelectedAutomation(newAuto);
    setToast({
      id: `toast-${Date.now()}`,
      title: 'Automatización Duplicada',
      message: `Se ha creado una copia de "${automation.name}".`,
      icon: newAuto.icon,
      status: 'success'
    });
  };

  const handleSaveAutomation = (data: Omit<Automation, 'id' | 'executionCount' | 'lastExecutedAt' | 'avgDurationMs' | 'logs' | 'createdAt'> & { id?: string }) => {
    if (data.id) {
      // Editing existing
      setAutomations(prev => prev.map(a => {
        if (a.id === data.id) {
          const updated: Automation = {
            ...a,
            ...data,
          };
          if (selectedAutomation?.id === data.id) {
            setSelectedAutomation(updated);
          }
          return updated;
        }
        return a;
      }));
      setToast({
        id: `toast-${Date.now()}`,
        title: 'Automatización Actualizada',
        message: `Los cambios para "${data.name}" se guardaron con éxito.`,
        icon: data.icon,
        status: 'success'
      });
    } else {
      // Creating new
      const isFile = data.inputType === 'excel_file' || data.inputType === 'csv_file' || data.inputType === 'generic_file' || data.inputType === 'pdf_file' || data.outputType === 'excel_download';
      const newAuto: Automation = {
        ...data,
        id: `auto-${Date.now()}`,
        executionCount: 0,
        lastExecutedAt: null,
        avgDurationMs: Math.floor(Math.random() * 300) + 180,
        createdAt: new Date().toISOString().split('T')[0],
        logs: [
          {
            id: `log-init-${Date.now()}`,
            timestamp: 'Hace un momento',
            status: 'success',
            durationMs: 95,
            responseSummary: data.customCode 
              ? 'Código JavaScript cargado en el motor de ejecución.' 
              : (isFile ? `Flujo n8n (${data.inputType || 'archivo'}) inicializado.` : 'Flujo registrado en CoreIT Automatización.'),
            stepDetails: ['Código compilado', 'Parámetros validados', 'Listo para producción']
          }
        ]
      };
      setAutomations(prev => [newAuto, ...prev]);
      setToast({
        id: `toast-${Date.now()}`,
        title: '¡Automatización Creada!',
        message: `"${newAuto.name}" se ha añadido al tablero con su lógica.`,
        icon: newAuto.icon,
        status: 'success'
      });
    }
  };

  const handleExecuteAutomation = async (
    automation: Automation, 
    customPayload?: ExecuteAutomationPayload
  ): Promise<ExecutionLog> => {
    const isFileInput = 
      automation.inputType === 'excel_file' || 
      automation.inputType === 'csv_file' || 
      automation.inputType === 'generic_file' || 
      automation.inputType === 'pdf_file' || 
      automation.outputType === 'excel_download' || 
      automation.outputType === 'interactive_selection';

    const defaultInputFileName = 
      automation.outputType === 'interactive_selection' ? 'Ficha_Tecnica_TitanX.pdf' :
      automation.inputType === 'excel_file' ? 'Planilla_Operaciones_2025.xlsx' :
      automation.inputType === 'csv_file' ? 'Registros_Exportados.csv' :
      automation.inputType === 'generic_file' ? 'Datos_Entrada_2025.xlsx' :
      automation.inputType === 'pdf_file' ? 'Factura_Proveedor_2025.pdf' :
      'Datos_Origen.xlsx';

    const inputFileName = customPayload?.inputFileName || (isFileInput ? defaultInputFileName : undefined);
    const nowStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Execute user code or standard runner
    const execResult = await executeUserCode(automation, {
      inputFileName,
      file: customPayload?.file,
      step: customPayload?.step,
      selectedSection: customPayload?.selectedSection,
      intermediateData: customPayload?.intermediateData,
      webhookUrl: customPayload?.webhookUrl,
      payload: customPayload?.payload
    });

    const status = execResult.status || (execResult.success ? 'success' : 'failed');

    const newLog: ExecutionLog = {
      id: `log-${Date.now()}`,
      timestamp: `Hoy, ${nowStr}`,
      status,
      durationMs: execResult.durationMs,
      inputFileName,
      downloadFileName: execResult.downloadFileName,
      downloadFileType: isFileInput ? 'excel' : undefined,
      intermediateData: execResult.intermediateData,
      triggerPayload: isFileInput 
        ? `{"file": "${inputFileName}", "format": "${automation.inputType || 'binary'}", "step": ${customPayload?.step || 1}}`
        : `{"manualTrigger": true, "timestamp": "${new Date().toISOString()}"}`,
      responseSummary: execResult.summary,
      stepDetails: execResult.logs.length > 0 ? execResult.logs : [
        `Trigger ${automation.triggerType} verificado`,
        `Payload procesado (${execResult.durationMs}ms)`,
        `Respuesta 200 OK de ${automation.targetService || 'Destino'}`
      ],
      outputData: execResult.outputData,
      error: execResult.error
    };

    setAutomations(prev => prev.map(a => {
      if (a.id === automation.id) {
        return {
          ...a,
          executionCount: a.executionCount + 1,
          lastExecutedAt: `Hoy, ${nowStr}`,
          logs: [newLog, ...(a.logs || [])].slice(0, 20)
        };
      }
      return a;
    }));

    if (selectedAutomation?.id === automation.id) {
      setSelectedAutomation(prev => prev ? {
        ...prev,
        executionCount: prev.executionCount + 1,
        lastExecutedAt: `Hoy, ${nowStr}`,
        logs: [newLog, ...(prev.logs || [])].slice(0, 20)
      } : null);
    }

    return newLog;
  };

  // Quick Run directly from card button
  const handleQuickRun = async (e: React.MouseEvent, automation: Automation) => {
    e.stopPropagation();
    if (triggeringId) return;

    setTriggeringId(automation.id);
    playPosBeep('trigger');

    const log = await handleExecuteAutomation(automation);
    setTriggeringId(null);
    playPosBeep(log.status === 'success' ? 'success' : 'delete');

    if (log.status === 'success') {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.85 }
      });
    }

    setToast({
      id: `toast-${Date.now()}`,
      title: `⚡ ${automation.name}`,
      message: log.responseSummary || 'Ejecución completada con éxito.',
      durationMs: log.durationMs,
      icon: automation.icon,
      status: log.status === 'success' ? 'success' : 'error'
    });
  };

  const handleResetDefaults = () => {
    setAutomations(INITIAL_AUTOMATIONS);
    setSelectedAutomation(null);
    setToast({
      id: `toast-${Date.now()}`,
      title: 'Valores Restaurados',
      message: 'Se han recargado las automatizaciones y scripts iniciales.',
      status: 'info'
    });
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(automations, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `autohub-n8n-export-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-800">
      {/* Header */}
      <PosHeader
        stats={stats}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCreateModal={() => {
          setEditingAutomation(null);
          setIsCreateModalOpen(true);
        }}
        onResetDefaults={handleResetDefaults}
        onExportData={handleExportData}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Clean Category Navigation Strip */}
      <CategoryFilter
        categories={CATEGORIES}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        categoryCounts={categoryCounts}
      />

      {/* Main Grid Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <AutomationGrid
          automations={filteredAutomations}
          viewMode={viewMode}
          onSelectAutomation={(auto) => {
            setSelectedAutomation(auto);
          }}
          onQuickRun={handleQuickRun}
          onDeleteClick={(e, auto) => {
            setDeletingAutomation(auto);
          }}
          onOpenCreateModal={() => {
            setEditingAutomation(null);
            setIsCreateModalOpen(true);
          }}
          triggeringId={triggeringId}
          activeCategory={activeCategory}
          searchQuery={searchQuery}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 px-4 sm:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">CoreIT Automatización</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 font-medium text-[11px]">
              Powered by IA - IT
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span>Flujos: <strong className="text-emerald-600 font-semibold">{stats.active} Activos</strong></span>
            <span>Éxito (24h): <strong className="text-emerald-600 font-semibold">99.7%</strong></span>
            <span>Latencia promedio: <strong className="text-slate-800 font-mono">180ms</strong></span>
          </div>
        </div>
        <p className="max-w-7xl mx-auto mt-2 text-[11px] text-slate-400 text-center sm:text-right">
          Creado por{' '}
          <a
            href="https://www.egsolutions.tech/?utm_source=coreit&utm_medium=footer"
            target="_blank"
            rel="noopener"
            className="underline decoration-slate-300 underline-offset-2 hover:text-emerald-700 transition-colors"
          >
            EG Solutions
          </a>
        </p>
      </footer>

      {/* Automation Detail Modal */}
      <AutomationDetailModal
        automation={selectedAutomation}
        isOpen={Boolean(selectedAutomation)}
        onClose={() => setSelectedAutomation(null)}
        onToggleStatus={handleToggleStatus}
        onRequestDelete={(auto) => {
          setDeletingAutomation(auto);
        }}
        onClone={handleClone}
        onExecute={handleExecuteAutomation}
        onEdit={(auto) => {
          setSelectedAutomation(null);
          setEditingAutomation(auto);
          setIsCreateModalOpen(true);
        }}
      />

      {/* Create / Edit / Code Modal */}
      <CreateAutomationModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingAutomation(null);
        }}
        onSave={handleSaveAutomation}
        editingAutomation={editingAutomation}
      />

      {/* Guaranteed Delete Confirmation Modal */}
      <DeleteConfirmModal
        automation={deletingAutomation}
        isOpen={Boolean(deletingAutomation)}
        onClose={() => setDeletingAutomation(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Live Toast */}
      <LiveRunToast
        toast={toast}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
