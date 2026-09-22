import React from 'react';
import { 
  Layers, 
  Sparkles, 
  Webhook, 
  Mail, 
  Database, 
  Bell, 
  CreditCard,
  FileText,
  Workflow,
  Code2
} from 'lucide-react';
import { AutomationCategory } from '../types';
import { playPosBeep } from '../utils/audio';

interface CategoryFilterProps {
  categories: AutomationCategory[];
  activeCategory: AutomationCategory;
  onSelectCategory: (cat: AutomationCategory) => void;
  categoryCounts: Record<AutomationCategory, number>;
}

const CATEGORY_ICONS: Record<AutomationCategory, React.ComponentType<{ className?: string }>> = {
  'Todas': Layers,
  'n8n Webhooks': Workflow,
  'Documentos & PDF': FileText,
  'Código & Scripts': Code2,
  'IA & LLMs': Sparkles,
  'Datos': Database,
  'Marketing': Mail,
  'Notificaciones': Bell,
  'Finanzas': CreditCard,
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  categoryCounts,
}) => {
  const handleCategoryClick = (cat: AutomationCategory) => {
    playPosBeep('click');
    onSelectCategory(cat);
  };

  return (
    <nav aria-label="Filtro de Categorías" className="w-full bg-[#F8FAFC] border-b border-slate-200 px-4 sm:px-8 py-3.5 overflow-x-auto">
      <div className="max-w-7xl mx-auto flex items-center gap-2.5 min-w-max">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat] || Layers;
          const isActive = activeCategory === cat;
          const count = categoryCounts[cat] || 0;

          return (
            <button
              key={cat}
              id={`cat-btn-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              onClick={() => handleCategoryClick(cat)}
              className={`automation-btn flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all select-none cursor-pointer ${
                isActive
                  ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-900 shadow-2xs'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{cat}</span>
              <span
                className={`px-1.5 py-0.2 text-[11px] font-mono rounded-full ${
                  isActive
                    ? 'bg-emerald-800 text-emerald-100'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
