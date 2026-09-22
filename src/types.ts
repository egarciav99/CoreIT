export type AutomationCategory = 
  | 'Todas' 
  | 'n8n Webhooks'
  | 'Documentos & PDF'
  | 'Código & Scripts'
  | 'IA & LLMs' 
  | 'Datos' 
  | 'Marketing' 
  | 'Notificaciones' 
  | 'Finanzas';

export type TriggerType = 
  | 'n8n_webhook'
  | 'code_script'
  | 'webhook' 
  | 'schedule' 
  | 'database' 
  | 'event' 
  | 'ai_agent' 
  | 'form';

export type AutomationStatus = 'active' | 'paused';

export type ColorTheme = 
  | 'emerald' 
  | 'cyan' 
  | 'indigo' 
  | 'purple' 
  | 'amber' 
  | 'rose' 
  | 'orange' 
  | 'blue'
  | 'fuchsia'
  | 'teal';

export type WebhookInputType = 
  | 'excel_file'
  | 'csv_file'
  | 'generic_file'
  | 'pdf_file' 
  | 'json_payload' 
  | 'text_input' 
  | 'none';
export type WebhookOutputType = 
  | 'excel_download' 
  | 'interactive_selection' 
  | 'csv_download' 
  | 'json_response' 
  | 'notification' 
  | 'custom_code';

export interface IntermediateData {
  titulo_ficha?: string;
  secciones_detectadas?: string[];
  selectedSection?: string;
  todos_los_bloques?: Array<Record<string, unknown>> | string[];
  [key: string]: unknown;
}

export interface ExecuteAutomationPayload {
  inputFileName?: string;
  file?: File | null;
  step?: number;
  selectedSection?: string;
  intermediateData?: IntermediateData | null;
  webhookUrl?: string;
  payload?: unknown;
}

export interface ExecutionLog {
  id: string;
  timestamp: string;
  status: 'success' | 'failed' | 'running' | 'requires_input';
  durationMs: number;
  triggerPayload?: string;
  responseSummary?: string;
  stepDetails?: string[];
  inputFileName?: string;
  downloadUrl?: string;
  downloadFileName?: string;
  downloadFileType?: 'excel' | 'csv' | 'json';
  outputData?: unknown;
  intermediateData?: IntermediateData;
  error?: string;
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  category: Exclude<AutomationCategory, 'Todas'>;
  status: AutomationStatus;
  triggerType: TriggerType;
  color: ColorTheme;
  icon: string;
  executionCount: number;
  lastExecutedAt: string | null;
  avgDurationMs: number;
  
  // Custom Code / Script Execution
  customCode?: string;
  codeLanguage?: 'javascript' | 'typescript' | 'json';
  
  // Webhook / n8n details
  webhookUrl?: string;
  webhookProvider?: 'n8n' | 'make' | 'zapier' | 'custom';
  httpMethod?: 'POST' | 'GET' | 'PUT' | 'DELETE';
  httpHeaders?: string;
  n8nWorkflowName?: string;
  
  // Input / Output types
  inputType?: WebhookInputType;
  outputType?: WebhookOutputType;
  downloadFileNameTemplate?: string;
  
  // Scheduling, Target & Execution Timeout
  cronSchedule?: string;
  targetService?: string;
  timeoutSeconds?: number; // Tiempo de espera máximo (default: 120 segundos / 2 minutos para n8n)
  
  logs: ExecutionLog[];
  createdAt: string;
}

export interface POSStats {
  total: number;
  active: number;
  paused: number;
  totalExecutions: number;
  successRate: number;
}
