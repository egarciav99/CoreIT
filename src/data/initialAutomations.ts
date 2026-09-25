import { Automation } from '../types';
import { DEFAULT_CODE_TEMPLATES } from '../utils/codeRunner';

export const INITIAL_AUTOMATIONS: Automation[] = [
  {
    id: 'auto-n8n-ficha-interactiva',
    name: 'n8n: Ficha Técnica PDF a e-Worksheet (.xlsx)',
    description: 'Flujo interactivo en 2 pasos: n8n extrae los pasos del PDF con reglas y con IA, un segundo modelo los audita contra el texto original, y la persona elige la sección y revisa los campos antes de generar un e-Worksheet Excel protegido.',
    category: 'Documentos & PDF',
    status: 'active',
    triggerType: 'n8n_webhook',
    webhookProvider: 'n8n',
    n8nWorkflowName: 'WF-192_Interactive_PDF_Section_to_XLSX',
    inputType: 'pdf_file',
    outputType: 'interactive_selection',
    downloadFileNameTemplate: 'e-Worksheet_TitanX.xlsx',
    color: 'purple',
    icon: 'FileSpreadsheet',
    executionCount: 142,
    lastExecutedAt: 'Hace 2 min',
    avgDurationMs: 510,
    targetService: 'n8n (regex + Gemini + auditor + ExcelJS)',
    // En despliegue, las URLs reales vienen de las variables de entorno (ver README).
    webhookUrl: import.meta.env.VITE_N8N_PDF_STEP1_URL || 'https://n8n.tu-servidor.io/webhook/interactive-pdf-to-worksheet',
    webhookUrlStep2: import.meta.env.VITE_N8N_PDF_STEP2_URL || undefined,
    timeoutSeconds: 120,
    customCode: DEFAULT_CODE_TEMPLATES.interactivePdfToExcel,
    createdAt: '2025-02-18',
    logs: [
      {
        id: 'log-interactive-init',
        timestamp: 'Hoy, 12:44:10',
        status: 'requires_input',
        durationMs: 410,
        inputFileName: 'Ficha_Tecnica_TitanX_2025.pdf',
        responseSummary: 'PDF analizado: 4 secciones detectadas. Esperando selección del usuario para generar el e-Worksheet.',
        intermediateData: {
          titulo_ficha: 'Ficha de Homologación y Especificaciones - Modelo Titan X',
          secciones_detectadas: [
            '1. Parámetros Eléctricos y Consumo Energético',
            '2. Ensayos Térmicos y Límites de Temperatura',
            '3. Certificaciones de Seguridad CE / UL / ISO 9001',
            '4. Desglose de Componentes Críticos y Lista de Materiales (BOM)'
          ]
        },
        stepDetails: [
          'Archivo "Ficha_Tecnica_TitanX_2025.pdf" recibido',
          'n8n OCR segmentó 4 bloques de especificaciones',
          'Paso 1 completado: Selección requerida'
        ]
      }
    ]
  },
  {
    id: 'auto-n8n-pdf-excel',
    name: 'n8n: Factura PDF a Excel Binario',
    description: 'Webhook n8n que recibe un documento PDF (factura o extracto), ejecuta OCR/extracción de datos y genera una hoja Excel (.xlsx/.csv) lista para descargar.',
    category: 'Documentos & PDF',
    status: 'active',
    triggerType: 'n8n_webhook',
    webhookProvider: 'n8n',
    n8nWorkflowName: 'WF-089_PDF_Parser_to_Excel',
    inputType: 'pdf_file',
    outputType: 'excel_download',
    downloadFileNameTemplate: 'Factura_Procesada_n8n.xlsx',
    color: 'emerald',
    icon: 'FileText',
    executionCount: 284,
    lastExecutedAt: 'Hace 4 min',
    avgDurationMs: 650,
    targetService: 'n8n Workflow (OCR + Excel Builder)',
    webhookUrl: 'https://n8n.tu-servidor.io/webhook/pdf-to-excel-export',
    timeoutSeconds: 120,
    customCode: DEFAULT_CODE_TEMPLATES.pdfToExcel,
    createdAt: '2025-02-12',
    logs: [
      {
        id: 'log-pdf-1',
        timestamp: 'Hoy, 12:40:15',
        status: 'success',
        durationMs: 580,
        inputFileName: 'Factura_Proveedor_Acme.pdf',
        downloadFileName: 'Factura_Proveedor_Acme_Extraida.xlsx',
        downloadFileType: 'excel',
        responseSummary: 'PDF analizado: 3 conceptos extraídos y convertidos a Excel binario',
        stepDetails: [
          'Archivo "Factura_Proveedor_Acme.pdf" recibido en n8n webhook',
          'Nodo n8n OCR Read Binary Data completado',
          'Estructuración JSON de líneas de factura con IVA',
          'Hoja Excel generada y disponible para descarga'
        ]
      }
    ]
  },
  {
    id: 'auto-n8n-excel-sync',
    name: 'n8n: Procesar Planilla Excel (.xlsx)',
    description: 'Ingesta de archivo Excel (.xlsx / .xls), lectura de pestañas y hojas de cálculo, validación de columnas y transformación estructurada de filas para exportación.',
    category: 'Código & Scripts',
    status: 'active',
    triggerType: 'n8n_webhook',
    webhookProvider: 'n8n',
    n8nWorkflowName: 'WF-104_Excel_Reader_and_Sync',
    inputType: 'excel_file',
    outputType: 'excel_download',
    downloadFileNameTemplate: 'Reporte_Consolidado_Excel.xlsx',
    color: 'emerald',
    icon: 'FileSpreadsheet',
    executionCount: 168,
    lastExecutedAt: 'Hace 10 min',
    avgDurationMs: 420,
    targetService: 'n8n (Excel Reader & Sync)',
    webhookUrl: 'https://n8n.tu-servidor.io/webhook/excel-processing',
    timeoutSeconds: 120,
    customCode: DEFAULT_CODE_TEMPLATES.excelProcessor,
    createdAt: '2025-02-20',
    logs: []
  },
  {
    id: 'auto-n8n-csv-parser',
    name: 'n8n: Ingesta de Registros CSV (.csv)',
    description: 'Recepción y procesamiento masivo de archivos CSV delimitados por comas o punto y coma, normalización de campos y sincronización con bases de datos.',
    category: 'Código & Scripts',
    status: 'active',
    triggerType: 'n8n_webhook',
    webhookProvider: 'n8n',
    n8nWorkflowName: 'WF-105_CSV_Batch_Ingestion',
    inputType: 'csv_file',
    outputType: 'json_response',
    color: 'teal',
    icon: 'FileSpreadsheet',
    executionCount: 215,
    lastExecutedAt: 'Hace 15 min',
    avgDurationMs: 380,
    targetService: 'n8n (CSV Ingestion & Database)',
    webhookUrl: 'https://n8n.tu-servidor.io/webhook/csv-ingestion',
    timeoutSeconds: 120,
    customCode: DEFAULT_CODE_TEMPLATES.csvProcessor,
    createdAt: '2025-02-20',
    logs: []
  },
  {
    id: 'auto-n8n-leads',
    name: 'n8n: Lead Enriquecido con IA',
    description: 'Webhook de n8n que recibe nuevos contactos, investiga la empresa con Gemini y actualiza HubSpot CRM.',
    category: 'n8n Webhooks',
    status: 'active',
    triggerType: 'n8n_webhook',
    webhookProvider: 'n8n',
    n8nWorkflowName: 'WF-104_AI_Lead_Enrichment',
    inputType: 'json_payload',
    outputType: 'json_response',
    color: 'purple',
    icon: 'Sparkles',
    executionCount: 512,
    lastExecutedAt: 'Hace 15 min',
    avgDurationMs: 420,
    targetService: 'n8n -> Gemini Flash -> HubSpot',
    webhookUrl: 'https://n8n.tu-servidor.io/webhook/enrich-lead-ai',
    customCode: DEFAULT_CODE_TEMPLATES.aiPrompt,
    createdAt: '2025-01-15',
    logs: [
      {
        id: 'log-101',
        timestamp: 'Hoy, 12:28:10',
        status: 'success',
        durationMs: 390,
        triggerPayload: '{"leadEmail": "carlos@acmecorp.com", "company": "Acme Corp"}',
        responseSummary: 'Lead analizado con IA: Score 94/100, B2B SaaS, sincronizado en CRM.',
        stepDetails: [
          'Webhook n8n activado con datos de contacto',
          'Nodo HTTP Request a Gemini Flash ejecutado',
          'Score de oportunidad calculado (94%)',
          'Registro actualizado en HubSpot'
        ]
      }
    ]
  },
  {
    id: 'auto-script-ventas',
    name: 'Script: Resumen Ventas & Excel',
    description: 'Código JavaScript personalizado que agrupa transacciones, calcula totales de IVA e impuestos y descarga la tabla en Excel.',
    category: 'Código & Scripts',
    status: 'active',
    triggerType: 'code_script',
    color: 'cyan',
    icon: 'Cpu',
    executionCount: 142,
    lastExecutedAt: 'Hace 30 min',
    avgDurationMs: 180,
    targetService: 'JavaScript Runtime Local',
    customCode: DEFAULT_CODE_TEMPLATES.dataTransformer,
    createdAt: '2025-02-18',
    logs: [
      {
        id: 'log-script-1',
        timestamp: 'Hoy, 10:05:00',
        status: 'success',
        durationMs: 160,
        responseSummary: 'Script ejecutado: 3 pedidos agrupados y Excel descargado.',
        stepDetails: ['Cálculo de impuestos completado', 'Exportador CSV/Excel invocado']
      }
    ]
  },
  {
    id: 'auto-n8n-stripe',
    name: 'n8n: Stripe Cobro a Slack & Factura',
    description: 'Escucha eventos de pago de Stripe en n8n, genera comprobante y notifica al canal de ventas.',
    category: 'Finanzas',
    status: 'active',
    triggerType: 'n8n_webhook',
    webhookProvider: 'n8n',
    n8nWorkflowName: 'WF-042_Stripe_Payment_Sync',
    inputType: 'json_payload',
    outputType: 'notification',
    color: 'blue',
    icon: 'CreditCard',
    executionCount: 1240,
    lastExecutedAt: 'Hace 1 hora',
    avgDurationMs: 310,
    targetService: 'n8n -> Slack + Holded',
    webhookUrl: 'https://n8n.tu-servidor.io/webhook/stripe-events',
    customCode: DEFAULT_CODE_TEMPLATES.webhookApi,
    createdAt: '2025-01-08',
    logs: []
  },
  {
    id: 'auto-n8n-whatsapp',
    name: 'n8n: Mensaje WhatsApp Automático',
    description: 'Envía plantilla de WhatsApp mediante la API de Meta configurada en n8n al confirmar citas.',
    category: 'Notificaciones',
    status: 'active',
    triggerType: 'n8n_webhook',
    webhookProvider: 'n8n',
    n8nWorkflowName: 'WF-077_WhatsApp_Meta_API',
    inputType: 'json_payload',
    outputType: 'notification',
    color: 'teal',
    icon: 'MessageSquare',
    executionCount: 689,
    lastExecutedAt: 'Hace 2 horas',
    avgDurationMs: 480,
    targetService: 'n8n -> WhatsApp Cloud API',
    webhookUrl: 'https://n8n.tu-servidor.io/webhook/whatsapp-trigger',
    customCode: DEFAULT_CODE_TEMPLATES.webhookApi,
    createdAt: '2025-01-20',
    logs: []
  },
  {
    id: 'auto-sync-db',
    name: 'Sincronización Postgres a BigQuery',
    description: 'ETL nocturno que extrae pedidos modificados en Postgres y actualiza el Data Warehouse.',
    category: 'Datos',
    status: 'active',
    triggerType: 'schedule',
    cronSchedule: '0 2 * * *',
    color: 'amber',
    icon: 'Database',
    executionCount: 94,
    lastExecutedAt: 'Ayer, 02:00',
    avgDurationMs: 1420,
    targetService: 'PostgreSQL -> BigQuery',
    customCode: `// ETL Nocturno de Base de Datos
export default async function runAutomation({ helpers }) {
  helpers.log("Conectando con réplica PostgreSQL...");
  helpers.log("Consultando registros modificados (últimas 24h)...");
  helpers.log("142 registros sincronizados en BigQuery Data Warehouse.");
  return { status: "success", summary: "ETL completado: 142 filas actualizadas." };
}`,
    createdAt: '2025-01-01',
    logs: []
  }
];
