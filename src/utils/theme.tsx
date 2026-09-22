import React from 'react';
import { 
  Sparkles, 
  CreditCard, 
  Database, 
  Mail, 
  Bell, 
  MessageSquare, 
  Webhook, 
  Zap, 
  Cloud, 
  Cpu, 
  Layers, 
  Bot, 
  FileText, 
  CheckCircle, 
  Server, 
  Send, 
  Terminal, 
  Workflow, 
  DollarSign, 
  Flame,
  Radio,
  Share2,
  ShieldCheck,
  RefreshCw,
  GitBranch,
  Search,
  LucideProps
} from 'lucide-react';
import { ColorTheme } from '../types';

export const ICON_OPTIONS: { name: string; label: string; icon: React.ComponentType<LucideProps> }[] = [
  { name: 'Sparkles', label: 'IA / Inteligencia', icon: Sparkles },
  { name: 'Webhook', label: 'Webhook / API', icon: Webhook },
  { name: 'CreditCard', label: 'Pagos / Tarjeta', icon: CreditCard },
  { name: 'Database', label: 'Base de Datos', icon: Database },
  { name: 'Mail', label: 'Email', icon: Mail },
  { name: 'MessageSquare', label: 'Mensajería / Chat', icon: MessageSquare },
  { name: 'Bell', label: 'Notificaciones', icon: Bell },
  { name: 'Zap', label: 'Disparo Rápido', icon: Zap },
  { name: 'Cloud', label: 'Nube / Cloud', icon: Cloud },
  { name: 'Cpu', label: 'Procesamiento', icon: Cpu },
  { name: 'Layers', label: 'Flujo / Multi-paso', icon: Layers },
  { name: 'Bot', label: 'Agente Bot', icon: Bot },
  { name: 'FileText', label: 'Documentos / PDF', icon: FileText },
  { name: 'Server', label: 'Servidor / Backend', icon: Server },
  { name: 'Send', label: 'Envíos / Dispatcher', icon: Send },
  { name: 'DollarSign', label: 'Finanzas / Facturas', icon: DollarSign },
  { name: 'ShieldCheck', label: 'Seguridad / Auth', icon: ShieldCheck },
  { name: 'RefreshCw', label: 'Sincronización', icon: RefreshCw }
];

export function renderAutomationIcon(iconName: string, className = "w-5 h-5") {
  switch (iconName) {
    case 'Sparkles': return <Sparkles className={className} />;
    case 'CreditCard': return <CreditCard className={className} />;
    case 'Database': return <Database className={className} />;
    case 'Mail': return <Mail className={className} />;
    case 'Bell': return <Bell className={className} />;
    case 'MessageSquare': return <MessageSquare className={className} />;
    case 'Webhook': return <Webhook className={className} />;
    case 'Zap': return <Zap className={className} />;
    case 'Cloud': return <Cloud className={className} />;
    case 'Cpu': return <Cpu className={className} />;
    case 'Layers': return <Layers className={className} />;
    case 'Bot': return <Bot className={className} />;
    case 'FileText': return <FileText className={className} />;
    case 'Server': return <Server className={className} />;
    case 'Send': return <Send className={className} />;
    case 'DollarSign': return <DollarSign className={className} />;
    case 'ShieldCheck': return <ShieldCheck className={className} />;
    case 'RefreshCw': return <RefreshCw className={className} />;
    case 'Terminal': return <Terminal className={className} />;
    case 'Workflow': return <Workflow className={className} />;
    case 'Flame': return <Flame className={className} />;
    case 'Radio': return <Radio className={className} />;
    case 'Share2': return <Share2 className={className} />;
    case 'GitBranch': return <GitBranch className={className} />;
    case 'CheckCircle': return <CheckCircle className={className} />;
    default: return <Zap className={className} />;
  }
}

export interface ColorScheme {
  id: ColorTheme;
  label: string;
  // Clean Minimalism pastel icon box & badges
  iconBg: string;
  iconColor: string;
  cardBg: string;
  cardBorder: string;
  cardHoverBorder: string;
  badgeBg: string;
  badgeText: string;
  accentBg: string;
  accentText: string;
}

export const COLOR_SCHEMES: Record<ColorTheme, ColorScheme> = {
  blue: {
    id: 'blue',
    label: 'Azul',
    iconBg: 'bg-blue-100/90 text-blue-600',
    iconColor: 'text-blue-600',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardHoverBorder: 'hover:border-blue-300 hover:shadow-md',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeText: 'text-blue-600',
    accentBg: 'bg-blue-500',
    accentText: 'text-blue-600',
  },
  emerald: {
    id: 'emerald',
    label: 'Verde / Esmeralda',
    iconBg: 'bg-emerald-100/90 text-emerald-600',
    iconColor: 'text-emerald-600',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardHoverBorder: 'hover:border-emerald-300 hover:shadow-md',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'text-emerald-600',
    accentBg: 'bg-emerald-500',
    accentText: 'text-emerald-600',
  },
  cyan: {
    id: 'cyan',
    label: 'Cian',
    iconBg: 'bg-cyan-100/90 text-cyan-600',
    iconColor: 'text-cyan-600',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardHoverBorder: 'hover:border-cyan-300 hover:shadow-md',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    badgeText: 'text-cyan-600',
    accentBg: 'bg-cyan-500',
    accentText: 'text-cyan-600',
  },
  indigo: {
    id: 'indigo',
    label: 'Índigo',
    iconBg: 'bg-indigo-100/90 text-indigo-600',
    iconColor: 'text-indigo-600',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardHoverBorder: 'hover:border-indigo-300 hover:shadow-md',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    badgeText: 'text-indigo-600',
    accentBg: 'bg-indigo-500',
    accentText: 'text-indigo-600',
  },
  purple: {
    id: 'purple',
    label: 'Púrpura',
    iconBg: 'bg-purple-100/90 text-purple-600',
    iconColor: 'text-purple-600',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardHoverBorder: 'hover:border-purple-300 hover:shadow-md',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeText: 'text-purple-600',
    accentBg: 'bg-purple-500',
    accentText: 'text-purple-600',
  },
  amber: {
    id: 'amber',
    label: 'Ámbar',
    iconBg: 'bg-amber-100/90 text-amber-600',
    iconColor: 'text-amber-600',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardHoverBorder: 'hover:border-amber-300 hover:shadow-md',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeText: 'text-amber-600',
    accentBg: 'bg-amber-500',
    accentText: 'text-amber-600',
  },
  rose: {
    id: 'rose',
    label: 'Rojo / Coral',
    iconBg: 'bg-rose-100/90 text-rose-600',
    iconColor: 'text-rose-600',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardHoverBorder: 'hover:border-rose-300 hover:shadow-md',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeText: 'text-rose-600',
    accentBg: 'bg-rose-500',
    accentText: 'text-rose-600',
  },
  orange: {
    id: 'orange',
    label: 'Naranja',
    iconBg: 'bg-orange-100/90 text-orange-600',
    iconColor: 'text-orange-600',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardHoverBorder: 'hover:border-orange-300 hover:shadow-md',
    badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
    badgeText: 'text-orange-600',
    accentBg: 'bg-orange-500',
    accentText: 'text-orange-600',
  },
  fuchsia: {
    id: 'fuchsia',
    label: 'Fucsia',
    iconBg: 'bg-fuchsia-100/90 text-fuchsia-600',
    iconColor: 'text-fuchsia-600',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardHoverBorder: 'hover:border-fuchsia-300 hover:shadow-md',
    badgeBg: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    badgeText: 'text-fuchsia-600',
    accentBg: 'bg-fuchsia-500',
    accentText: 'text-fuchsia-600',
  },
  teal: {
    id: 'teal',
    label: 'Turquesa',
    iconBg: 'bg-teal-100/90 text-teal-600',
    iconColor: 'text-teal-600',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    cardHoverBorder: 'hover:border-teal-300 hover:shadow-md',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
    badgeText: 'text-teal-600',
    accentBg: 'bg-teal-500',
    accentText: 'text-teal-600',
  }
};
