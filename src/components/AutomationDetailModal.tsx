import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Zap, 
  Trash2, 
  Copy, 
  Check, 
  RotateCw,
  FileText,
  Download,
  UploadCloud,
  FileSpreadsheet,
  Workflow,
  Code2,
  Edit3,
  Layers,
  Sparkles,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Automation, ExecutionLog, IntermediateData, ExecuteAutomationPayload } from '../types';
import { renderAutomationIcon, COLOR_SCHEMES } from '../utils/theme';
import { playPosBeep } from '../utils/audio';
import { generateAndDownloadExcel } from '../utils/fileExporter';

interface AutomationDetailModalProps {
  automation: Automation | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleStatus: (id: string) => void;
  onRequestDelete: (automation: Automation) => void;
  onClone: (automation: Automation) => void;
  onExecute: (
    automation: Automation, 
    customPayload?: ExecuteAutomationPayload
  ) => Promise<ExecutionLog>;
  onEdit: (automation: Automation) => void;
}

export const AutomationDetailModal: React.FC<AutomationDetailModalProps> = ({
  automation,
  isOpen,
  onClose,
  onToggleStatus,
  onRequestDelete,
  onClone,
  onExecute,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'code' | 'logs' | 'n8n_config'>('details');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isGeneratingWorksheet, setIsGeneratingWorksheet] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [executionSteps, setExecutionSteps] = useState<{ label: string; done: boolean }[]>([]);
  const [lastRunResult, setLastRunResult] = useState<ExecutionLog | null>(null);

  // File upload state for PDF to Excel n8n automations
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sampleFileName, setSampleFileName] = useState<string>('Ficha_Tecnica_Industrial_2025.pdf');

  // Interactive 2-Step selection state & intermediate data
  const [currentIntermediateData, setCurrentIntermediateData] = useState<IntermediateData | null>(null);
  const [detectedSections, setDetectedSections] = useState<string[]>([]);
  const [detectedTitle, setDetectedTitle] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  // Live elapsed execution counter up to 2 minutes (120s)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning || isGeneratingWorksheet) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRunning, isGeneratingWorksheet]);

  useEffect(() => {
    if (automation) {
      // Check latest log for intermediate data
      const latestLog = automation.logs?.[0];
      if (latestLog?.intermediateData?.secciones_detectadas) {
        setCurrentIntermediateData(latestLog.intermediateData);
        setDetectedSections(latestLog.intermediateData.secciones_detectadas);
        setDetectedTitle(latestLog.intermediateData.titulo_ficha || 'Ficha Técnica Detectada');
        setSelectedSection(latestLog.intermediateData.selectedSection || latestLog.intermediateData.secciones_detectadas[0]);
      } else {
        setCurrentIntermediateData(null);
        setDetectedSections([]);
        setDetectedTitle('');
        setSelectedSection('');
      }
      setLastRunResult(latestLog || null);
      setSelectedFile(null);

      const defaultName = 
        automation.outputType === 'interactive_selection' ? 'Ficha_Tecnica_TitanX.pdf' :
        automation.inputType === 'excel_file' ? 'Planilla_Operaciones_2025.xlsx' :
        automation.inputType === 'csv_file' ? 'Registros_Exportados.csv' :
        automation.inputType === 'generic_file' ? 'Datos_Entrada_2025.xlsx' :
        automation.inputType === 'pdf_file' ? 'Factura_Proveedor_2025.pdf' :
        'Datos_Origen.xlsx';

      setSampleFileName(defaultName);
    }
  }, [automation, isOpen]);

  if (!isOpen || !automation) return null;

  const colorScheme = COLOR_SCHEMES[automation.color] || COLOR_SCHEMES.blue;
  const isActive = automation.status === 'active';
  const isFileInput = 
    automation.inputType === 'excel_file' || 
    automation.inputType === 'csv_file' || 
    automation.inputType === 'generic_file' || 
    automation.inputType === 'pdf_file' || 
    (!automation.inputType && (automation.outputType === 'excel_download' || automation.outputType === 'interactive_selection'));
  const isInteractive = automation.outputType === 'interactive_selection';
  const isN8n = automation.webhookProvider === 'n8n' || automation.triggerType === 'n8n_webhook';
  const hasCustomCode = Boolean(automation.customCode);

  const fileAcceptTypes = 
    automation.inputType === 'excel_file' ? '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel' :
    automation.inputType === 'csv_file' ? '.csv,text/csv' :
    automation.inputType === 'generic_file' ? '*/*,.xlsx,.xls,.csv,.pdf,.json,.xml,.txt' :
    automation.inputType === 'pdf_file' ? '.pdf,application/pdf' :
    '*/*,.xlsx,.xls,.csv,.pdf';

  const fileSectionLabel = 
    automation.inputType === 'excel_file' ? 'Hoja Excel (.xlsx / .xls) de Entrada para n8n:' :
    automation.inputType === 'csv_file' ? 'Archivo CSV (.csv) de Entrada para n8n:' :
    automation.inputType === 'generic_file' ? 'Archivo de Entrada (.xlsx, .csv, .pdf, etc.) para n8n:' :
    automation.inputType === 'pdf_file' ? 'Documento PDF (.pdf) de Entrada para n8n:' :
    'Archivo de Entrada para n8n:';

  const changeFileLabel = 
    automation.inputType === 'excel_file' ? 'Cambiar Excel' :
    automation.inputType === 'csv_file' ? 'Cambiar CSV' :
    automation.inputType === 'generic_file' ? 'Cambiar Archivo' :
    automation.inputType === 'pdf_file' ? 'Cambiar PDF' :
    'Cambiar Archivo';

  const sampleButtonLabel = 
    automation.inputType === 'excel_file' ? 'Usar Excel de muestra' :
    automation.inputType === 'csv_file' ? 'Usar CSV de muestra' :
    automation.inputType === 'generic_file' ? 'Usar archivo de muestra (.xlsx)' :
    automation.inputType === 'pdf_file' ? 'Usar PDF de muestra' :
    'Usar archivo de muestra';

  const handleCopyWebhook = () => {
    if (automation.webhookUrl) {
      navigator.clipboard.writeText(automation.webhookUrl);
      setCopiedUrl(true);
      playPosBeep('click');
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const curlCommand = `curl -X POST "${automation.webhookUrl || 'https://n8n.tu-servidor.io/webhook/pdf-to-excel'}" \\
  --max-time 120 \\
  -H "Content-Type: multipart/form-data" \\
  -F "data=@${sampleFileName}"`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    playPosBeep('click');
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleCopyCode = () => {
    if (automation.customCode) {
      navigator.clipboard.writeText(automation.customCode);
      setCopiedCode(true);
      playPosBeep('click');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleToggle = () => {
    playPosBeep('toggle');
    onToggleStatus(automation.id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSampleFileName(file.name);
      playPosBeep('tap');
    }
  };

  // STEP 1 RUN: Analysis and Extraction (or standard full execution)
  const handleRunNow = async () => {
    if (isRunning || isGeneratingWorksheet) return;
    setIsRunning(true);
    setLastRunResult(null);
    playPosBeep('trigger');

    const activeFileName = selectedFile ? selectedFile.name : sampleFileName;
    const isExcelFile = automation.inputType === 'excel_file' || activeFileName.endsWith('.xlsx') || activeFileName.endsWith('.xls');
    const isCsvFile = automation.inputType === 'csv_file' || activeFileName.endsWith('.csv');
    const isPdfFile = automation.inputType === 'pdf_file' || activeFileName.endsWith('.pdf');

    if (isInteractive) {
      setExecutionSteps([
        { label: `Enviando "${activeFileName}" al Webhook de n8n`, done: false },
        { label: 'n8n analiza documento con OCR y segmenta estructura en JSON', done: false },
        { label: 'Detectando secciones y tablas técnicas para selección interactiva', done: false }
      ]);
    } else if (hasCustomCode) {
      setExecutionSteps([
        { label: 'Cargando sandbox de ejecución JavaScript', done: false },
        { label: 'Ejecutando script de automatización custom', done: false },
        { label: 'Procesando salida y generando entregable (.xlsx / .csv)', done: false }
      ]);
    } else if (isExcelFile) {
      setExecutionSteps([
        { label: `Enviando archivo Excel "${activeFileName}" al Webhook de n8n`, done: false },
        { label: 'n8n lee las hojas de cálculo y procesa registros estructurados', done: false },
        { label: 'Sincronizando datos con el servicio destino', done: false }
      ]);
    } else if (isCsvFile) {
      setExecutionSteps([
        { label: `Enviando archivo CSV "${activeFileName}" al Webhook de n8n`, done: false },
        { label: 'n8n procesa delimitadores y transforma registros', done: false },
        { label: 'Ingesta completada exitosamente', done: false }
      ]);
    } else if (isFileInput) {
      setExecutionSteps([
        { label: `Enviando "${activeFileName}" al Webhook de n8n`, done: false },
        { label: 'n8n ejecuta nodo de lectura y procesamiento binario', done: false },
        { label: 'Generando resultado del flujo de trabajo', done: false }
      ]);
    } else {
      setExecutionSteps([
        { label: `Capturando evento trigger (${automation.triggerType})`, done: false },
        { label: 'n8n procesa reglas de flujo y transformaciones', done: false },
        { label: `Completando sincronización con ${automation.targetService || 'Destino'}`, done: false }
      ]);
    }

    // Progress animations
    await new Promise((r) => setTimeout(r, 260));
    setExecutionSteps((prev) => prev.map((s, i) => (i === 0 ? { ...s, done: true } : s)));

    await new Promise((r) => setTimeout(r, 340));
    setExecutionSteps((prev) => prev.map((s, i) => (i === 1 ? { ...s, done: true } : s)));

    try {
      // Execute step 1
      const log = await onExecute(automation, {
        inputFileName: isFileInput ? activeFileName : undefined,
        file: selectedFile,
        step: 1,
        webhookUrl: automation.webhookUrl
      });

      setExecutionSteps((prev) => prev.map((s) => ({ ...s, done: true })));
      setLastRunResult(log);

      if (log.intermediateData?.secciones_detectadas && log.intermediateData.secciones_detectadas.length > 0) {
        setCurrentIntermediateData(log.intermediateData);
        setDetectedSections(log.intermediateData.secciones_detectadas);
        setDetectedTitle(log.intermediateData.titulo_ficha || 'Ficha Técnica Detectada');
        setSelectedSection(log.intermediateData.selectedSection || log.intermediateData.secciones_detectadas[0]);
        playPosBeep('toggle');
      } else if (log.status === 'success') {
        playPosBeep('success');
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.8 }
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setLastRunResult({
        id: `err-${Date.now()}`,
        timestamp: `Hoy, ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
        status: 'failed',
        durationMs: 120,
        responseSummary: `Error en Paso 1: ${errorMsg}`,
        stepDetails: [`Error capturado: ${errorMsg}`],
        error: errorMsg
      });
      playPosBeep('toggle');
    } finally {
      setIsRunning(false);
    }
  };

  // STEP 2: Confirm Selection and Generate e-Worksheet (.xlsx)
  const handleGenerateWorksheet = async () => {
    if (isGeneratingWorksheet || !selectedSection) return;
    setIsGeneratingWorksheet(true);
    setLastRunResult(null);
    playPosBeep('trigger');

    const activeFileName = selectedFile ? selectedFile.name : sampleFileName;
    
    // Explicitly package intermediate data with detected sections & blocks
    const dataToSend: IntermediateData = {
      titulo_ficha: detectedTitle || currentIntermediateData?.titulo_ficha || 'Ficha Técnica de Homologación - Titan X',
      secciones_detectadas: detectedSections.length > 0 ? detectedSections : (currentIntermediateData?.secciones_detectadas || []),
      selectedSection: selectedSection,
      todos_los_bloques: currentIntermediateData?.todos_los_bloques || [
        { seccion: "1. Parámetros Eléctricos y Consumo Energético", parametros: 8 },
        { seccion: "2. Ensayos Térmicos y Límites de Temperatura", parametros: 6 },
        { seccion: "3. Certificaciones de Seguridad CE / UL / ISO 9001", parametros: 5 },
        { seccion: "4. Desglose de Componentes Críticos y Lista BOM", parametros: 12 }
      ]
    };

    setExecutionSteps([
      { label: `Enviando sección seleccionada: "${selectedSection}"`, done: false },
      { label: 'n8n compila tablas técnicas y genera archivo binario .xlsx', done: false },
      { label: 'Descarga automática de e-Worksheet completada', done: false }
    ]);

    setTimeout(() => {
      setExecutionSteps((prev) => prev.map((s, i) => (i === 0 ? { ...s, done: true } : s)));
    }, 200);

    try {
      // Execute Step 2 explicitly with selectedSection, intermediateData, file, webhookUrl
      const log = await onExecute(automation, {
        inputFileName: activeFileName,
        file: selectedFile || null,
        step: 2,
        selectedSection: selectedSection,
        intermediateData: dataToSend,
        webhookUrl: automation.webhookUrl
      });

      setExecutionSteps((prev) => prev.map((s) => ({ ...s, done: true })));
      setLastRunResult(log);

      if (log.status === 'success') {
        playPosBeep('success');
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.8 }
        });
      } else if (log.status === 'failed') {
        playPosBeep('toggle');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Error al ejecutar Paso 2:', errorMsg);
      const errorLog: ExecutionLog = {
        id: `log-err-${Date.now()}`,
        timestamp: `Hoy, ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
        status: 'failed',
        durationMs: 120,
        responseSummary: `Error ejecutando Paso 2: ${errorMsg}`,
        stepDetails: [`Error capturado en Paso 2: ${errorMsg}`],
        error: errorMsg
      };
      setLastRunResult(errorLog);
      playPosBeep('toggle');
    } finally {
      setIsGeneratingWorksheet(false);
    }
  };

  const handleDownloadExcel = (logItem?: ExecutionLog) => {
    playPosBeep('success');
    const targetLog = logItem || lastRunResult;
    const fileName = targetLog?.downloadFileName || (automation.downloadFileNameTemplate || 'Reporte_Extraido_n8n.xlsx');
    generateAndDownloadExcel(fileName, sampleFileName);
  };

  const handleDeleteClick = () => {
    playPosBeep('tap');
    onRequestDelete(automation);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]"
        >
          {/* Header */}
          <div className="bg-white p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs ${colorScheme.iconBg}`}>
                {renderAutomationIcon(automation.icon, "w-7 h-7")}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {automation.category}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-mono text-slate-500 font-medium">
                    {automation.n8nWorkflowName || automation.triggerType}
                  </span>
                  {isInteractive && (
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      2 Pasos Interactivos
                    </span>
                  )}
                  {hasCustomCode && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">
                      JS Script
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">
                  {automation.name}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-modal-edit"
                onClick={() => onEdit(automation)}
                className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                title="Editar automatización / Código"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  playPosBeep('tap');
                  onClose();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 px-5 sm:px-6 bg-slate-50/50 gap-4 sm:gap-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('details');
                playPosBeep('tap');
              }}
              className={`py-3 relative cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'details' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flujo & Parámetros</span>
              {activeTab === 'details' && (
                <motion.div
                  layoutId="modal-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"
                />
              )}
            </button>

            {hasCustomCode && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('code');
                  playPosBeep('tap');
                }}
                className={`py-3 relative cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'code' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Código Script</span>
                {activeTab === 'code' && (
                  <motion.div
                    layoutId="modal-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"
                  />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setActiveTab('n8n_config');
                playPosBeep('tap');
              }}
              className={`py-3 relative cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'n8n_config' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Conexión Webhook</span>
              {activeTab === 'n8n_config' && (
                <motion.div
                  layoutId="modal-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('logs');
                playPosBeep('tap');
              }}
              className={`py-3 relative cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'logs' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Historial ({automation.logs?.length || 0})</span>
              {activeTab === 'logs' && (
                <motion.div
                  layoutId="modal-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"
                />
              )}
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {/* TAB 1: DETAILS & EXECUTION */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {automation.description}
                </p>

                {/* File Uploader / Test File Selector */}
                {isFileInput && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <UploadCloud className="w-4 h-4 text-emerald-600" />
                        {fileSectionLabel}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        multipart/form-data
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 hover:border-emerald-400 rounded-xl transition-colors">
                          {(() => {
                            const name = (selectedFile ? selectedFile.name : sampleFileName).toLowerCase();
                            if (name.endsWith('.xlsx') || name.endsWith('.xls') || automation.inputType === 'excel_file') {
                              return <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />;
                            }
                            if (name.endsWith('.csv') || automation.inputType === 'csv_file') {
                              return <FileSpreadsheet className="w-4 h-4 text-teal-600 shrink-0" />;
                            }
                            if (name.endsWith('.pdf') || automation.inputType === 'pdf_file') {
                              return <FileText className="w-4 h-4 text-rose-500 shrink-0" />;
                            }
                            return <UploadCloud className="w-4 h-4 text-blue-600 shrink-0" />;
                          })()}
                          <span className="text-xs text-slate-700 truncate font-mono">
                            {selectedFile ? selectedFile.name : sampleFileName}
                          </span>
                          <span className="ml-auto text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold shrink-0">
                            {changeFileLabel}
                          </span>
                        </div>
                        <input
                          type="file"
                          accept={fileAcceptTypes}
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          const defaultSample = 
                            automation.outputType === 'interactive_selection' ? 'Ficha_Tecnica_TitanX.pdf' :
                            automation.inputType === 'excel_file' ? 'Planilla_Operaciones_2025.xlsx' :
                            automation.inputType === 'csv_file' ? 'Registros_Exportados.csv' :
                            automation.inputType === 'generic_file' ? 'Datos_Entrada_2025.xlsx' :
                            automation.inputType === 'pdf_file' ? 'Factura_Amazon_AWS_2025.pdf' :
                            'Datos_Origen.xlsx';
                          setSampleFileName(defaultSample);
                          setSelectedFile(null);
                          playPosBeep('tap');
                        }}
                        className="px-3 py-2 text-xs font-mono text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                      >
                        {sampleButtonLabel}
                      </button>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE STEP 2: DYNAMIC SECTION SELECTION */}
                {detectedSections.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border-2 border-purple-300 bg-purple-50/70 p-4 sm:p-5 space-y-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          2
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-purple-950">
                            Paso 2: Selección de Sección Detectada
                          </h4>
                          <p className="text-[11px] text-purple-700 font-medium">
                            {detectedTitle || 'Ficha Técnica Analizada por n8n'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
                        {detectedSections.length} Secciones
                      </span>
                    </div>

                    <p className="text-xs text-slate-700">
                      Selecciona la sección del documento que deseas compilar en la hoja de cálculo binaria:
                    </p>

                    {/* Dropdown Selector */}
                    <div>
                      <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                        Sección a Generar en Excel (.xlsx):
                      </label>
                      <select
                        value={selectedSection}
                        onChange={(e) => {
                          setSelectedSection(e.target.value);
                          playPosBeep('tap');
                        }}
                        className="w-full bg-white border border-purple-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
                      >
                        {detectedSections.map((sec, idx) => (
                          <option key={idx} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Pill Chips Selector for fast tactile selection */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">
                        O elige rápidamente una sección:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {detectedSections.map((sec, idx) => {
                          const isPicked = selectedSection === sec;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSelectedSection(sec);
                                playPosBeep('click');
                              }}
                              className={`p-2.5 rounded-xl text-left text-xs transition-all border flex items-center justify-between gap-2 cursor-pointer ${
                                isPicked
                                  ? 'bg-purple-600 text-white border-purple-700 font-bold shadow-xs'
                                  : 'bg-white text-slate-700 border-purple-200 hover:border-purple-400 hover:bg-purple-50'
                              }`}
                            >
                              <span className="truncate">{sec}</span>
                              {isPicked ? (
                                <Check className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Confirmation Button */}
                    <div className="pt-2 flex items-center justify-end">
                      <button
                        id="btn-confirm-worksheet"
                        type="button"
                        onClick={handleGenerateWorksheet}
                        disabled={isGeneratingWorksheet || !selectedSection}
                        className="automation-btn px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm cursor-pointer transition-all disabled:opacity-75"
                      >
                        {isGeneratingWorksheet ? (
                          <>
                            <RotateCw className="w-4 h-4 animate-spin text-white" />
                            <span>Generando e-Worksheet con n8n...</span>
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Generar e-Worksheet (.xlsx)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Progress / Step details during execution (Step 1 or Step 2) */}
                {(isRunning || isGeneratingWorksheet) && (
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-2.5">
                    <div className="flex items-center justify-between font-bold text-emerald-950">
                      <div className="flex items-center gap-2">
                        <RotateCw className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>
                          {isGeneratingWorksheet ? 'Compilando e-Worksheet con n8n...' : 'Ejecutando webhook en n8n...'}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold">
                        ⏱️ {elapsedSeconds}s / 120s máx (2 min)
                      </span>
                    </div>

                    {/* Elapsed Progress Bar */}
                    <div className="w-full h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                        style={{ width: `${Math.min(100, (elapsedSeconds / 120) * 100)}%` }}
                      />
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {executionSteps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-700">
                          {step.done ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 font-bold shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin inline-block shrink-0" />
                          )}
                          <span className={step.done ? 'text-slate-800 font-medium' : 'text-emerald-800 font-medium'}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Banner if execution failed */}
                {lastRunResult && !isRunning && !isGeneratingWorksheet && lastRunResult.status === 'failed' && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        Error de Ejecución
                      </span>
                      <span className="text-[11px] text-rose-600 font-mono">
                        {lastRunResult.timestamp}
                      </span>
                    </div>
                    <p className="text-rose-800 font-medium">{lastRunResult.responseSummary || lastRunResult.error}</p>
                    {lastRunResult.error && (
                      <pre className="p-2.5 bg-rose-100/70 rounded-xl text-[11px] font-mono text-rose-950 overflow-x-auto">
                        {lastRunResult.error}
                      </pre>
                    )}
                  </div>
                )}

                {/* Result card with Excel download */}
                {lastRunResult && !isRunning && !isGeneratingWorksheet && lastRunResult.status === 'success' && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600" />
                        ¡Ejecución Exitosa! ({lastRunResult.durationMs}ms)
                      </span>
                      <span className="text-[11px] text-emerald-700 font-mono">
                        {lastRunResult.timestamp}
                      </span>
                    </div>

                    <p className="text-slate-700">{lastRunResult.responseSummary}</p>

                    {lastRunResult.intermediateData?.selectedSection && (
                      <div className="bg-emerald-100/60 p-2.5 rounded-xl text-emerald-900 text-[11px] flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Sección compilada: <strong>{lastRunResult.intermediateData.selectedSection}</strong></span>
                      </div>
                    )}

                    {(lastRunResult.downloadFileName || isFileInput) && (
                      <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-slate-600">
                          Archivo generado: <strong className="font-mono text-slate-800">{lastRunResult.downloadFileName || 'Reporte_Extraido.xlsx'}</strong>
                        </span>
                        <button
                          id="btn-download-excel-result"
                          onClick={() => handleDownloadExcel()}
                          className="automation-btn px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>Descargar Excel (.xlsx / .csv)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CODE & SCRIPT RUNNER */}
            {activeTab === 'code' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-blue-600" />
                    Código JavaScript de Ejecución
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 font-mono transition-colors"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode ? 'Copiado' : 'Copiar'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(automation)}
                      className="px-2.5 py-1 text-xs rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1 font-semibold transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Modificar Código</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-300 bg-slate-900 p-4 font-mono text-xs text-emerald-300 overflow-x-auto max-h-72 leading-relaxed">
                  <pre>{automation.customCode || '// Sin código personalizado. Utiliza el conector estándar.'}</pre>
                </div>
              </div>
            )}

            {/* TAB 3: N8N CONFIG & CURL */}
            {activeTab === 'n8n_config' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    URL del Webhook de n8n:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={automation.webhookUrl || 'https://n8n.tu-servidor.io/webhook/pdf-to-excel'}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs text-slate-800 focus:outline-none"
                    />
                    <button
                      onClick={handleCopyWebhook}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 transition-colors"
                    >
                      {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedUrl ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {/* 2-Minute Timeout Info */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-900">
                  <div className="p-1 rounded-md bg-amber-200/80 text-amber-900 font-bold shrink-0">
                    ⏱️ 120s
                  </div>
                  <div>
                    <span className="font-bold block text-amber-950">
                      Tiempo de espera configurado: 2 minutos (120 segundos)
                    </span>
                    <p className="text-amber-800 leading-relaxed">
                      El cliente web y el sandbox esperan hasta 120 segundos para permitir que n8n complete análisis OCR pesados, inferencias de IA y compilación de hojas Excel sin interrumpir la conexión.
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">
                      Comando cURL de Prueba (Envío multipart / PDF con timeout de 2 min):
                    </label>
                    <button
                      onClick={handleCopyCurl}
                      className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                    >
                      {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCurl ? 'Copiado' : 'Copiar cURL'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto">
                    {curlCommand}
                  </pre>
                </div>
              </div>
            )}

            {/* TAB 4: LOGS */}
            {activeTab === 'logs' && (
              <div className="space-y-2.5 font-mono text-xs">
                {automation.logs && automation.logs.length > 0 ? (
                  automation.logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : (log.status === 'requires_input' ? 'bg-purple-500' : 'bg-rose-500')}`}></span>
                          <span>{log.status === 'success' ? 'Éxito' : (log.status === 'requires_input' ? 'Requiere Selección' : 'Fallo')}</span>
                          <span className="text-slate-400 font-normal">({log.durationMs}ms)</span>
                        </span>
                        <span className="text-[11px] text-slate-400">{log.timestamp}</span>
                      </div>

                      {log.inputFileName && (
                        <div className="text-[11px] text-slate-600 flex items-center justify-between">
                          <span>Entrada: <strong>{log.inputFileName}</strong></span>
                          {log.downloadFileName && (
                            <button
                              onClick={() => handleDownloadExcel(log)}
                              className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>Descargar Excel</span>
                            </button>
                          )}
                        </div>
                      )}

                      {log.responseSummary && (
                        <p className="text-slate-700 font-sans text-xs">
                          {log.responseSummary}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 font-sans text-xs">
                    Sin ejecuciones registradas.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons Grid */}
          <div className="p-4 sm:p-6 border-t border-slate-100 bg-white grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              id="btn-modal-toggle-status"
              onClick={handleToggle}
              className="automation-btn py-3 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-all text-center cursor-pointer"
            >
              {isActive ? 'Pausar Flujo' : 'Activar Flujo'}
            </button>

            <button
              id="btn-modal-clone"
              onClick={() => {
                playPosBeep('tap');
                onClone(automation);
              }}
              className="automation-btn py-3 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-all text-center cursor-pointer"
            >
              Duplicar
            </button>

            <button
              id="btn-modal-delete"
              onClick={handleDeleteClick}
              className="automation-btn col-span-2 sm:col-span-1 py-3 px-3 rounded-xl font-semibold text-xs bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 transition-all text-center cursor-pointer flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5 inline" />
              <span>Eliminar</span>
            </button>

            <button
              id="btn-modal-run-now"
              onClick={handleRunNow}
              disabled={isRunning || isGeneratingWorksheet}
              className="automation-btn col-span-2 sm:col-span-3 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wide shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-75"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>
                {isRunning 
                  ? 'Ejecutando...' 
                  : (isInteractive
                      ? 'Analizar PDF y Extraer Secciones'
                      : (hasCustomCode 
                          ? 'Ejecutar Script de Automatización' 
                          : (automation.inputType === 'excel_file'
                              ? 'Procesar Excel en n8n'
                              : (automation.inputType === 'csv_file'
                                  ? 'Ingestar CSV en n8n'
                                  : (automation.inputType === 'pdf_file'
                                      ? 'Procesar PDF a Excel en n8n'
                                      : (isFileInput ? 'Procesar Archivo en n8n' : 'Ejecutar Ahora'))))))}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

