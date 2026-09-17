import React, { useState, useMemo } from 'react';
import { PRESET_LIBRARY, PresetCategory } from '@/lib/presetLibrary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  X,
  Search,
  Sparkles,
  Check,
  Coins,
  Bot,
  Code2,
  MessageCircle,
  HelpCircle,
} from 'lucide-react';

interface TemplatePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: string) => void;
  globalTemplates?: string[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Coins: <Coins className="h-4 w-4 text-amber-400" />,
  Bot: <Bot className="h-4 w-4 text-purple-400" />,
  Code2: <Code2 className="h-4 w-4 text-blue-400" />,
  MessageCircle: <MessageCircle className="h-4 w-4 text-emerald-400" />,
};

export const TemplatePresetModal: React.FC<TemplatePresetModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  globalTemplates = [],
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Flatten templates with category context
  const allTemplates = [
    ...PRESET_LIBRARY.flatMap((cat) =>
      cat.templates.map((tpl) => ({
        categoryId: cat.id,
        categoryName: cat.name,
        badge: cat.badge,
        template: tpl,
      }))
    ),
    ...globalTemplates.map((tpl) => ({
      categoryId: 'saved-bank',
      categoryName: 'Global Payload Bank',
      badge: 'SAVED TEMPLATE',
      template: tpl,
    })),
  ];

  const filteredTemplates = allTemplates.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesSearch =
      !searchTerm.trim() ||
      item.template.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] max-h-[680px] w-full max-w-2xl flex-col rounded-xl border border-blue-500/40 bg-obsidian-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-400" />
            <h3 className="font-heading text-sm font-bold text-white">Preset Template Library</h3>
            <Badge variant="outline" className="border-blue-500/40 font-mono text-[10px] text-blue-300">
              {filteredTemplates.length} Templates
            </Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category Pills & Search Bar */}
        <div className="space-y-3 border-b border-border/50 bg-obsidian-950/60 p-3.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              type="text"
              placeholder="Search templates by keyword or syntax..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 font-mono text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`cursor-pointer rounded-md border px-2.5 py-1 transition-all ${
                selectedCategory === 'all'
                  ? 'border-blue-500/60 bg-blue-500/20 font-bold text-blue-300'
                  : 'border-border/60 bg-obsidian-950 text-slate-400 hover:border-slate-700'
              }`}
            >
              All Categories
            </button>
            {PRESET_LIBRARY.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-all ${
                  selectedCategory === cat.id
                    ? 'border-blue-500/60 bg-blue-500/20 font-bold text-blue-300'
                    : 'border-border/60 bg-obsidian-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                {CATEGORY_ICONS[cat.icon] || <Sparkles className="h-3 w-3" />}
                <span>{cat.name.split(',')[0]}</span>
              </button>
            ))}
            {globalTemplates.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategory('saved-bank')}
                className={`flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 transition-all ${
                  selectedCategory === 'saved-bank'
                    ? 'border-emerald-500/60 bg-emerald-500/20 font-bold text-emerald-300'
                    : 'border-border/60 bg-obsidian-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Sparkles className="h-3 w-3 text-emerald-400" />
                <span>Saved Bank ({globalTemplates.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Templates List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <BookOpen className="mb-2 h-8 w-8 text-slate-600" />
              <p className="font-mono text-xs">No templates found matching your filter.</p>
            </div>
          ) : (
            filteredTemplates.map((item, idx) => (
              <div
                key={idx}
                className="group flex flex-col justify-between gap-2.5 rounded-lg border border-border/70 bg-obsidian-950/70 p-3.5 transition-all hover:border-blue-500/50 hover:bg-obsidian-850"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold text-blue-400">
                    {item.categoryName}
                  </span>
                  <Badge variant="outline" className="border-slate-700 font-mono text-[9px] text-slate-400">
                    {item.badge}
                  </Badge>
                </div>
                <div className="font-mono text-xs leading-relaxed text-slate-200">
                  {item.template}
                </div>
                <div className="flex items-center justify-end border-t border-border/40 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onSelectTemplate(item.template);
                      onClose();
                    }}
                    className="h-7 border-blue-500/40 font-mono text-[11px] text-blue-300 hover:border-blue-400 hover:bg-blue-500/20"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Use This Template
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
