import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Workflow, 
  FileSpreadsheet, 
  Sparkles, 
  Code2, 
  Play, 
  Terminal, 
  Download,
  Layers,
  Globe
} from 'lucide-react';
import { 
  Automation, 
  AutomationCategory, 
  ColorTheme, 
  TriggerType,
  WebhookInputType,
  WebhookOutputType
} from '../types';
import { ICON_OPTIONS, COLOR_SCHEMES, renderAutomationIcon } from '../utils/theme';
import { playPosBeep } from '../utils/audio';
import { DEFAULT_CODE_TEMPLATES, executeUserCode } from '../utils/codeRunner';

interface CreateAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (automation: Omit<Automation, 'id' | 'executionCount' | 'lastExecutedAt' | 'avgDurationMs' | 'logs' | 'createdAt'> & { id?: string }) => void;
  editingAutomation?: Automation | null;
}

const CATEGORIES: Exclude<AutomationCategory, 'Todas'>[] = [
  'n8n Webhooks',
  'Documentos & PDF',
  'Código & Scripts',
  'IA & LLMs',
  'Datos',
  'Marketing',
  'Notificaciones',
  'Finanzas'
];

export const CreateAutomationModal: React.FC<CreateAutomationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAutomation,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'code' | 'network'>('code');
  
  // Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Exclude<AutomationCategory, 'Todas'>>('Documentos & PDF');
  const [triggerType, setTriggerType] = useState<TriggerType>('code_script');
  const [color, setColor] = useState<ColorTheme>('emerald');
  const [icon, setIcon] = useState<string>('FileText');
  const [status, setStatus] = useState<'active' | 'paused'>('active');

  // Code & Logic
  const [customCode, setCustomCode] = useState<string>(DEFAULT_CODE_TEMPLATES.pdfToExcel);
  const [testConsoleLogs, setTestConsoleLogs] = useState<string[]>([]);
  const [isTestingCode, setIsTestingCode] = useState(false);
  const [testResult, setTestResult] = useState<{ summary?: string; error?: string; download?: string } | null>(null);

  // Network / Webhook info
  const [webhookProvider, setWebhookProvider] = useState<'n8n' | 'make' | 'zapier' | 'custom'>('n8n');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookUrlStep2, setWebhookUrlStep2] = useState('');
  const [httpMethod, setHttpMethod] = useState<'POST' | 'GET' | 'PUT' | 'DELETE'>('POST');
  const [n8nWorkflowName, setN8nWorkflowName] = useState('');
  const [targetService, setTargetService] = useState('');
  const [inputType, setInputType] = useState<WebhookInputType>('pdf_file');
  const [outputType, setOutputType] = useState<WebhookOutputType>('excel_download');

  useEffect(() => {
    if (editingAutomation) {
      setName(editingAutomation.name);
      setDescription(editingAutomation.description);
      setCategory(editingAutomation.category);
      setTriggerType(editingAutomation.triggerType || 'code_script');
      setColor(editingAutomation.color);
      setIcon(editingAutomation.icon);
      setStatus(editingAutomation.status);
      setCustomCode(editingAutomation.customCode || DEFAULT_CODE_TEMPLATES.pdfToExcel);
      setWebhookProvider(editingAutomation.webhookProvider || 'n8n');
      setWebhookUrl(editingAutomation.webhookUrl || '');
      setWebhookUrlStep2(editingAutomation.webhookUrlStep2 || '');
      setHttpMethod(editingAutomation.httpMethod || 'POST');
      setN8nWorkflowName(editingAutomation.n8nWorkflowName || '');
      setTargetService(editingAutomation.targetService || '');
      setInputType(editingAutomation.inputType || 'none');
      setOutputType(editingAutomation.outputType || 'custom_code');
      setActiveTab(editingAutomation.customCode ? 'code' : 'basic');
    } else {
      setName('n8n: PDF Factura a Excel');
      setDescription('Recibe un documento PDF, procesa tablas en n8n y genera un archivo Excel (.csv/.xlsx) para descarga directa.');
      setCategory('Documentos & PDF');
      setTriggerType('n8n_webhook');
      setColor('emerald');
      setIcon('FileText');
      setStatus('active');
      setCustomCode(DEFAULT_CODE_TEMPLATES.pdfToExcel);
      setWebhookProvider('n8n');
      setWebhookUrl('https://n8n.tu-servidor.io/webhook/pdf-to-excel');
      setWebhookUrlStep2('');
      setHttpMethod('POST');
      setN8nWorkflowName('WF-PDF_to_Excel_Parser');
      setTargetService('n8n (OCR + Excel Builder)');
      setInputType('pdf_file');
      setOutputType('excel_download');
      setActiveTab('code');
    }
    setTestConsoleLogs([]);
    setTestResult(null);
  }, [editingAutomation, isOpen]);

  if (!isOpen) return null;

  const handleLoadTemplate = (templateKey: keyof typeof DEFAULT_CODE_TEMPLATES) => {
    playPosBeep('tap');
    const code = DEFAULT_CODE_TEMPLATES[templateKey];
    setCustomCode(code);

    if (templateKey === 'excelProcessor') {
      setName('n8n: Procesar Planilla Excel');
      setCategory('Código & Scripts');
      setIcon('FileSpreadsheet');
      setColor('emerald');
      setInputType('excel_file');
      setOutputType('excel_download');
      setTriggerType('n8n_webhook');
      setTargetService('n8n (Excel Reader & Sync)');
    } else if (templateKey === 'csvProcessor') {
      setName('n8n: Ingesta de Registros CSV');
      setCategory('Código & Scripts');
      setIcon('FileSpreadsheet');
      setColor('teal');
      setInputType('csv_file');
      setOutputType('json_response');
      setTriggerType('n8n_webhook');
      setTargetService('n8n (CSV Parser & Ingestion)');
    } else if (templateKey === 'genericFileProcessor') {
      setName('n8n: Procesar Archivo General');
      setCategory('Código & Scripts');
      setIcon('UploadCloud');
      setColor('emerald');
      setInputType('generic_file');
      setOutputType('excel_download');
      setTriggerType('n8n_webhook');
      setTargetService('n8n (Binary Processor)');
    } else if (templateKey === 'interactivePdfToExcel') {
      setName('n8n: Ficha Técnica PDF a e-Worksheet');
      setCategory('Documentos & PDF');
      setIcon('FileSpreadsheet');
      setColor('purple');
      setInputType('pdf_file');
      setOutputType('interactive_selection');
      setTriggerType('n8n_webhook');
      setTargetService('n8n (OCR + JSON Segmenter + Excel Builder)');
    } else if (templateKey === 'pdfToExcel') {
      setName('n8n: PDF Factura a Excel');
      setCategory('Documentos & PDF');
      setIcon('FileText');
      setColor('emerald');
      setInputType('pdf_file');
      setOutputType('excel_download');
      setTriggerType('n8n_webhook');
    } else if (templateKey === 'webhookApi') {
      setName('n8n: Webhook Receptor API');
      setCategory('n8n Webhooks');
      setIcon('Webhook');
      setColor('blue');
      setInputType('json_payload');
      setOutputType('json_response');
      setTriggerType('n8n_webhook');
    } else if (templateKey === 'dataTransformer') {
      setName('Script: Calculadora de Ventas');
      setCategory('Código & Scripts');
      setIcon('Cpu');
      setColor('cyan');
      setInputType('none');
      setOutputType('excel_download');
      setTriggerType('code_script');
    } else if (templateKey === 'aiPrompt') {
      setName('n8n: Clasificador de Leads IA');
      setCategory('IA & LLMs');
      setIcon('Sparkles');
      setColor('purple');
      setInputType('json_payload');
      setOutputType('json_response');
      setTriggerType('ai_agent');
    }
  };

  const handleTestCode = async () => {
    setIsTestingCode(true);
    setTestConsoleLogs(['Ejecutando script de prueba...']);
    setTestResult(null);
    playPosBeep('trigger');

    const tempAuto: Automation = {
      id: 'temp-test',
      name,
      description,
      category,
      status: 'active',
      triggerType,
      color,
      icon,
      executionCount: 0,
      lastExecutedAt: null,
      avgDurationMs: 0,
      customCode,
      inputType,
      outputType,
      webhookUrl,
      webhookUrlStep2,
      targetService,
      logs: [],
      createdAt: new Date().toISOString()
    };

    const testFileName = 
      inputType === 'excel_file' ? 'Planilla_Test_2025.xlsx' :
      inputType === 'csv_file' ? 'Registros_Test.csv' :
      inputType === 'generic_file' ? 'Archivo_Datos_2025.xlsx' :
      inputType === 'pdf_file' ? 'Factura_Ejemplo.pdf' : undefined;

    const res = await executeUserCode(tempAuto, {
      inputFileName: testFileName
    });

    setIsTestingCode(false);
    setTestConsoleLogs(res.logs);
    setTestResult({
      summary: res.summary,
      error: res.error,
      download: res.downloadFileName
    });

    if (res.success) {
      playPosBeep('success');
    } else {
      playPosBeep('delete');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    playPosBeep('success');
    onSave({
      ...(editingAutomation ? { id: editingAutomation.id } : {}),
      name: name.trim(),
      description: description.trim() || 'Automatización configurada en AUTOHUB.',
      category,
      triggerType,
      color,
      icon,
      status,
      customCode: customCode.trim() || undefined,
      webhookProvider,
      webhookUrl: webhookUrl.trim() || undefined,
      webhookUrlStep2: outputType === 'interactive_selection' ? webhookUrlStep2.trim() || undefined : undefined,
      httpMethod,
      n8nWorkflowName: n8nWorkflowName.trim() || undefined,
      inputType,
      outputType,
      targetService: targetService.trim() || (webhookProvider === 'n8n' ? 'n8n Workflow' : 'Servicio Externo'),
      downloadFileNameTemplate: outputType === 'excel_download' ? `${name.replace(/[^a-zA-Z0-9]/g, '_')}.csv` : undefined,
    });
    onClose();
  };

  const activeColorScheme = COLOR_SCHEMES[color] || COLOR_SCHEMES.blue;

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
          <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {editingAutomation ? 'Editar Código de Automatización' : 'Nueva Automatización & Código'}
                </h2>
                <p className="text-xs text-slate-500">
                  Define la lógica, script o webhook de n8n que ejecutará este botón en CoreIT Automatización.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                playPosBeep('click');
                onClose();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50 px-6 gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                playPosBeep('click');
                setActiveTab('code');
              }}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'code'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Código & Lógica del Botón</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playPosBeep('click');
                setActiveTab('basic');
              }}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'basic'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Diseño & Botón</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playPosBeep('click');
                setActiveTab('network');
              }}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'network'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Webhook n8n / Red</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4 text-xs">
            {/* TAB 1: CODE & SCRIPT RUNNER */}
            {activeTab === 'code' && (
              <div className="space-y-3.5">
                {/* Code Templates Selector */}
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Cargar Plantilla de Código / n8n:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadTemplate('excelProcessor')}
                      className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-emerald-800 text-left transition-all"
                    >
                      <span className="font-bold text-xs block">📊 Excel (.xlsx)</span>
                      <span className="text-[10px] text-emerald-600">Lectura y sincronización</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadTemplate('csvProcessor')}
                      className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100/70 border border-teal-200 text-teal-800 text-left transition-all"
                    >
                      <span className="font-bold text-xs block">📑 CSV (.csv)</span>
                      <span className="text-[10px] text-teal-600">Ingesta de registros</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadTemplate('genericFileProcessor')}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200 text-slate-800 text-left transition-all"
                    >
                      <span className="font-bold text-xs block">📁 Archivo General</span>
                      <span className="text-[10px] text-slate-600">Cualquier formato binario</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadTemplate('pdfToExcel')}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100/70 border border-rose-200 text-rose-800 text-left transition-all"
                    >
                      <span className="font-bold text-xs block">📄 PDF a Excel</span>
                      <span className="text-[10px] text-rose-600">OCR y descarga</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadTemplate('interactivePdfToExcel')}
                      className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100/70 border border-purple-200 text-purple-800 text-left transition-all"
                    >
                      <span className="font-bold text-xs block">📑 2 Pasos Ficha</span>
                      <span className="text-[10px] text-purple-600">Sección a e-Worksheet</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadTemplate('webhookApi')}
                      className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100/70 border border-blue-200 text-blue-800 text-left transition-all"
                    >
                      <span className="font-bold text-xs block">⚡ n8n Webhook</span>
                      <span className="text-[10px] text-blue-600">HTTP POST / API</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadTemplate('dataTransformer')}
                      className="p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100/70 border border-cyan-200 text-cyan-800 text-left transition-all"
                    >
                      <span className="font-bold text-xs block">🔄 Transformador</span>
                      <span className="text-[10px] text-cyan-600">Cálculos & tablas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadTemplate('aiPrompt')}
                      className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100/70 border border-amber-200 text-amber-800 text-left transition-all"
                    >
                      <span className="font-bold text-xs block">🤖 Agente IA</span>
                      <span className="text-[10px] text-amber-600">Clasificación LLM</span>
                    </button>
                  </div>
                </div>

                {/* Code Editor Window */}
                <div className="rounded-2xl border border-slate-300 overflow-hidden bg-slate-900 shadow-inner">
                  <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="text-slate-400 font-mono text-[11px] ml-2">
                        automation_script.js (JavaScript / Async Runner)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestCode}
                      disabled={isTestingCode}
                      className="automation-btn px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isTestingCode ? 'Probando...' : 'Probar Código'}</span>
                    </button>
                  </div>

                  <textarea
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    rows={12}
                    spellCheck={false}
                    className="w-full p-4 font-mono text-xs text-emerald-300 bg-slate-900 focus:outline-none resize-y leading-relaxed"
                    placeholder="// Escribe aquí tu función de automatización..."
                  />
                </div>

                {/* Test Console Output */}
                {testConsoleLogs.length > 0 && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                      <span className="flex items-center gap-1">
                        <Terminal className="w-3.5 h-3.5 text-slate-400" />
                        Consola de Ejecución:
                      </span>
                      {testResult?.summary && (
                        <span className="text-emerald-600">✓ {testResult.summary}</span>
                      )}
                    </div>
                    <div className="space-y-0.5 text-slate-700 text-[11px] max-h-28 overflow-y-auto">
                      {testConsoleLogs.map((log, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="text-slate-400">›</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: BASIC & BUTTON DESIGN */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                {/* Live Preview Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 block font-semibold">
                      Vista Previa del Botón:
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {name || 'Nueva Automatización'}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      {category} • {triggerType}
                    </span>
                  </div>
                  <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center p-2 bg-white border border-slate-200 shadow-xs">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 ${activeColorScheme.iconBg}`}>
                      {renderAutomationIcon(icon, "w-4 h-4")}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="text-[9px] font-bold text-slate-500 font-mono">ON</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Nombre del Botón / Flujo *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. n8n: Factura PDF a Excel"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Categoría
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Exclude<AutomationCategory, 'Todas'>)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Descripción del Flujo
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe qué realiza esta automatización al hacer clic..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white resize-none"
                  />
                </div>

                {/* Color Palette Picker */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">
                    Color del Botón:
                  </label>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {(Object.keys(COLOR_SCHEMES) as ColorTheme[]).map((colKey) => {
                      const scheme = COLOR_SCHEMES[colKey];
                      const isSelected = color === colKey;
                      return (
                        <button
                          key={colKey}
                          type="button"
                          title={scheme.label}
                          onClick={() => {
                            playPosBeep('click');
                            setColor(colKey);
                          }}
                          className={`h-9 rounded-xl flex items-center justify-center transition-all border ${scheme.iconBg} ${
                            isSelected
                              ? 'ring-2 ring-emerald-600 scale-105 shadow-xs font-bold'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-full ${scheme.accentBg}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Icon Picker */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">
                    Ícono:
                  </label>
                  <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-slate-50 rounded-2xl border border-slate-200">
                    {ICON_OPTIONS.map((opt) => {
                      const isSelected = icon === opt.name;
                      const IconComp = opt.icon;
                      return (
                        <button
                          key={opt.name}
                          type="button"
                          title={opt.label}
                          onClick={() => {
                            playPosBeep('click');
                            setIcon(opt.name);
                          }}
                          className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs scale-105'
                              : 'text-slate-600 hover:bg-white hover:text-slate-900'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: NETWORK & WEBHOOK PARAMS */}
            {activeTab === 'network' && (
              <div className="space-y-3.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    URL Webhook de n8n / Endpoint HTTP
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://n8n.tu-instancia.com/webhook/..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                  {outputType === 'interactive_selection' && (
                    <p className="text-[11px] text-slate-500 mt-1">Paso 1: recibe el archivo y devuelve las secciones detectadas.</p>
                  )}
                </div>

                {outputType === 'interactive_selection' && (
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      URL Webhook del paso 2 (genera el archivo)
                    </label>
                    <input
                      type="url"
                      value={webhookUrlStep2}
                      onChange={(e) => setWebhookUrlStep2(e.target.value)}
                      placeholder="https://n8n.tu-instancia.com/webhook/..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Recibe la sección elegida y los pasos revisados, y devuelve el .xlsx.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Método HTTP
                    </label>
                    <select
                      value={httpMethod}
                      onChange={(e) => setHttpMethod(e.target.value as 'POST' | 'GET')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800"
                    >
                      <option value="POST">POST (Recomendado)</option>
                      <option value="GET">GET</option>
                      <option value="PUT">PUT</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Tipo de Entrada
                    </label>
                    <select
                      value={inputType}
                      onChange={(e) => setInputType(e.target.value as WebhookInputType)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800"
                    >
                      <option value="generic_file">📁 Archivo General (.xlsx, .csv, .pdf, etc.)</option>
                      <option value="excel_file">📊 Hoja Excel (.xlsx, .xls)</option>
                      <option value="csv_file">📑 Archivo CSV (.csv)</option>
                      <option value="pdf_file">📄 Documento PDF (.pdf)</option>
                      <option value="json_payload">📦 JSON Payload</option>
                      <option value="text_input">📝 Texto Plano</option>
                      <option value="none">⚡ Sin archivo (Trigger directo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Tipo de Salida
                    </label>
                    <select
                      value={outputType}
                      onChange={(e) => setOutputType(e.target.value as WebhookOutputType)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800"
                    >
                      <option value="excel_download">📊 Excel (.xlsx / .csv)</option>
                      <option value="interactive_selection">📑 Selección Interactiva (2 Pasos)</option>
                      <option value="json_response">📦 JSON Response</option>
                      <option value="notification">🔔 Notificación</option>
                      <option value="custom_code">💻 Script Libre</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nombre del Workflow en n8n
                  </label>
                  <input
                    type="text"
                    value={n8nWorkflowName}
                    onChange={(e) => setN8nWorkflowName(e.target.value)}
                    placeholder="Ej. WF-PDF_to_Excel_Parser"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-emerald-950 font-medium">
                    <span className="text-base">⏱️</span>
                    <span>Timeout de Webhook: <strong>2 minutos (120 segundos)</strong></span>
                  </div>
                  <span className="text-[11px] text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                    120.000 ms
                  </span>
                </div>
              </div>
            )}

            {/* Form Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  playPosBeep('click');
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-submit-automation"
                type="submit"
                className="automation-btn flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{editingAutomation ? 'Guardar Cambios' : 'Guardar Automatización'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
