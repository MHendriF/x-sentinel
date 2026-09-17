import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  ShieldCheck,
  Bookmark,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Flame,
} from 'lucide-react';
import { toast } from 'sonner';

export interface PersonaPreset {
  id: string;
  name: string;
  category?: string;
  prompt: string;
}

export const BUILTIN_PERSONAS: PersonaPreset[] = [
  {
    id: 'web3-alpha',
    name: '🌐 Web3 & Crypto Native',
    category: 'Crypto',
    prompt:
      'Write a sharp, context-aware 1-sentence English reply as a crypto native on market dynamics, rails, or ecosystem shifts. Conversational, zero generic praise, max 20 words.',
  },
  {
    id: 'tech-builder',
    name: '💻 Tech Builder & Systems Dev',
    category: 'Engineering',
    prompt:
      'Write a concise 1-sentence English observation as a software engineer on architecture tradeoffs, latency, or velocity. Direct, peer-to-peer, no fluff.',
  },
  {
    id: 'signal-contrarian',
    name: '🎯 High-Signal Curator',
    category: 'Thought Leadership',
    prompt:
      'Write a clever, high-signal 1-sentence English response highlighting the second-order implication of the tweet. Keep it casual, thoughtful, and authentic.',
  },
  {
    id: 'punchy-hook',
    name: '🚀 Punchy Micro-Hook (<15 words)',
    category: 'Shortform',
    prompt:
      'Write a witty, short 1-sentence English punchline (under 15 words) reacting naturally to the tweet. No hashtags, no quotes, no bot phrases.',
  },
  {
    id: 'indo-native',
    name: '🇮🇩 Indonesian Tech & Crypto Native',
    category: 'Indonesian',
    prompt:
      'Tulis balasan 1 kalimat dalam bahasa santai anak tech/crypto Indo (campur ID-EN natural, to the point, gaya obrolan X). Hindari pujian klise, maksimal 20 kata, tanpa hashtag.',
  },
  {
    id: 'vc-skeptic',
    name: '📈 VC & Traction Skeptic',
    category: 'Startup',
    prompt:
      'Write a sharp 1-sentence observation questioning unit economics, retention, or organic moat. Insightful, analytical, zero fluff, peer-to-peer.',
  },
  {
    id: 'degen-banter',
    name: '⚡ Degen Banter & Irony',
    category: 'Meme/Culture',
    prompt:
      'write a casual, witty 1-sentence reply in all lowercase with dry humor and crypto twitter cadence. no hashtags, no quotes, no bot phrases, keep it raw.',
  },
];

export interface AntiSlopGuardrails {
  noHashtags: boolean;
  noQuotes: boolean;
  banGenericPraise: boolean;
  banBuzzwords: boolean;
  strictShort: boolean;
}

const CUSTOM_PERSONAS_STORAGE_KEY = 'x_sentinel_custom_personas';

interface AIPersonaStudioProps {
  prompt: string;
  setPrompt: (p: string) => void;
  guardrails: AntiSlopGuardrails;
  setGuardrails: React.Dispatch<React.SetStateAction<AntiSlopGuardrails>>;
}

export const AIPersonaStudio: React.FC<AIPersonaStudioProps> = ({
  prompt,
  setPrompt,
  guardrails,
  setGuardrails,
}) => {
  const [customPersonas, setCustomPersonas] = useState<PersonaPreset[]>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_PERSONAS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  });

  const [newPersonaName, setNewPersonaName] = useState('');
  const [isSavingCustom, setIsSavingCustom] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_PERSONAS_STORAGE_KEY, JSON.stringify(customPersonas));
    } catch {
      // ignore
    }
  }, [customPersonas]);

  const handleSaveCustomPersona = () => {
    const name = newPersonaName.trim();
    if (!name) {
      toast.error('Please enter a name for your custom persona.');
      return;
    }
    if (!prompt.trim()) {
      toast.error('Prompt content cannot be empty.');
      return;
    }

    const newPersona: PersonaPreset = {
      id: `custom-${Date.now()}`,
      name: `✨ ${name}`,
      category: 'Custom',
      prompt: prompt.trim(),
    };

    setCustomPersonas((prev) => [newPersona, ...prev]);
    setNewPersonaName('');
    setIsSavingCustom(false);
    toast.success(`Custom persona "${name}" saved to local library!`);
  };

  const handleDeleteCustomPersona = (id: string, name: string) => {
    setCustomPersonas((prev) => prev.filter((p) => p.id !== id));
    toast.success(`Removed custom persona "${name}".`);
  };

  const handleToggleGuardrail = (key: keyof AntiSlopGuardrails) => {
    setGuardrails((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-5">
      <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-purple-400 uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              SYSTEM PERSONA &amp; REPLY PROMPT
            </div>
            <Badge variant="outline" className="border-purple-500/40 bg-purple-500/10 font-mono text-[10px] text-purple-300">
              ANTI-AI SLOP ENGINE
            </Badge>
          </div>
          <CardTitle className="text-base font-heading">Persona Studio</CardTitle>
          <CardDescription className="text-xs">
            Formulate high-signal, context-aware prompt instructions that mimic authentic, peer-to-peer Twitter/X voices.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Preset Persona Library */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs font-bold text-slate-300">
                RECOMMENDED PERSONAS · 1-CLICK APPLY:
              </label>
              <span className="text-[10px] text-slate-400">Click to apply instructions</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {BUILTIN_PERSONAS.map((preset) => {
                const isSelected = prompt === preset.prompt;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setPrompt(preset.prompt);
                      toast.info(`Persona "${preset.name}" applied!`);
                    }}
                    className={`cursor-pointer rounded border px-2.5 py-1 font-mono text-xs transition-colors ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/20 font-bold text-purple-200 shadow-sm'
                        : 'border-slate-800 bg-obsidian-950 text-slate-300 hover:border-purple-500/50 hover:text-white'
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Personas */}
          {customPersonas.length > 0 && (
            <div className="space-y-2 border-t border-border/60 pt-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 font-mono text-xs font-bold text-purple-300">
                  <Bookmark className="h-3.5 w-3.5" />
                  SAVED CUSTOM PERSONAS ({customPersonas.length}):
                </label>
                <span className="text-[10px] text-slate-400">Local Browser Storage</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {customPersonas.map((cp) => {
                  const isSelected = prompt === cp.prompt;
                  return (
                    <div
                      key={cp.id}
                      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-xs transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/20 text-purple-200'
                          : 'border-slate-800 bg-obsidian-950 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setPrompt(cp.prompt);
                          toast.info(`Custom persona "${cp.name}" applied!`);
                        }}
                        className="cursor-pointer"
                      >
                        {cp.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomPersona(cp.id, cp.name)}
                        className="text-slate-500 hover:text-red-400"
                        title="Delete custom persona"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prompt Textarea */}
          <div className="space-y-1.5 border-t border-border/60 pt-3">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs font-bold text-slate-300">
                ACTIVE SYSTEM PROMPT
              </label>
              <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400">
                <span>{wordCount} words</span>
                <span>{prompt.length} chars</span>
              </div>
            </div>

            <Textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter system prompt instructions in detail..."
              className="bg-obsidian-950 font-mono text-xs leading-relaxed"
            />
          </div>

          {/* Custom Persona Saver Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
            {!isSavingCustom ? (
              <button
                type="button"
                onClick={() => setIsSavingCustom(true)}
                className="flex items-center gap-1.5 text-xs font-mono text-purple-400 hover:text-purple-300"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Save this prompt as custom persona</span>
              </button>
            ) : (
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Input
                  type="text"
                  placeholder="Persona name (e.g. Sarcastic DeFi Dev)..."
                  value={newPersonaName}
                  onChange={(e) => setNewPersonaName(e.target.value)}
                  className="h-7 w-64 bg-obsidian-950 font-mono text-xs"
                />
                <Button
                  size="sm"
                  onClick={handleSaveCustomPersona}
                  className="h-7 px-2.5 font-mono text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Save
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSavingCustom(false);
                    setNewPersonaName('');
                  }}
                  className="font-mono text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Anti-AI Slop Guardrails Card */}
      <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
              <ShieldCheck className="h-3.5 w-3.5" />
              HUMAN-PASSING DEFENSE
            </div>
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 font-mono text-[10px] text-emerald-300">
              ACTIVE FILTER
            </Badge>
          </div>
          <CardTitle className="text-base font-heading">Anti-AI Slop Guardrails</CardTitle>
          <CardDescription className="text-xs">
            Automated constraints injected into generation requests to prevent typical dead giveaways of AI bot activity.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 font-mono text-xs">
            {/* Rule 1: No Hashtags */}
            <div
              onClick={() => handleToggleGuardrail('noHashtags')}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                guardrails.noHashtags
                  ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-200'
                  : 'border-slate-800 bg-obsidian-950 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  guardrails.noHashtags
                    ? 'border-emerald-400 bg-emerald-500 text-obsidian-950'
                    : 'border-slate-700 bg-obsidian-900'
                }`}
              >
                {guardrails.noHashtags && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <div>
                <div className="font-bold text-white">Strictly No Hashtags (#)</div>
                <div className="text-[10px] text-slate-400 leading-snug">
                  Never include hashtags in comment replies.
                </div>
              </div>
            </div>

            {/* Rule 2: No Quotes */}
            <div
              onClick={() => handleToggleGuardrail('noQuotes')}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                guardrails.noQuotes
                  ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-200'
                  : 'border-slate-800 bg-obsidian-950 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  guardrails.noQuotes
                    ? 'border-emerald-400 bg-emerald-500 text-obsidian-950'
                    : 'border-slate-700 bg-obsidian-900'
                }`}
              >
                {guardrails.noQuotes && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <div>
                <div className="font-bold text-white">No Quotation Marks ("...")</div>
                <div className="text-[10px] text-slate-400 leading-snug">
                  Prevent quotes around the reply payload.
                </div>
              </div>
            </div>

            {/* Rule 3: Ban Generic Praise */}
            <div
              onClick={() => handleToggleGuardrail('banGenericPraise')}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                guardrails.banGenericPraise
                  ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-200'
                  : 'border-slate-800 bg-obsidian-950 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  guardrails.banGenericPraise
                    ? 'border-emerald-400 bg-emerald-500 text-obsidian-950'
                    : 'border-slate-700 bg-obsidian-900'
                }`}
              >
                {guardrails.banGenericPraise && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <div>
                <div className="font-bold text-white">Ban Generic Praise</div>
                <div className="text-[10px] text-slate-400 leading-snug">
                  Disallow "Great point!", "Totally agree!", "Nice share!".
                </div>
              </div>
            </div>

            {/* Rule 4: Ban AI Buzzwords */}
            <div
              onClick={() => handleToggleGuardrail('banBuzzwords')}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                guardrails.banBuzzwords
                  ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-200'
                  : 'border-slate-800 bg-obsidian-950 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  guardrails.banBuzzwords
                    ? 'border-emerald-400 bg-emerald-500 text-obsidian-950'
                    : 'border-slate-700 bg-obsidian-900'
                }`}
              >
                {guardrails.banBuzzwords && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <div>
                <div className="font-bold text-white">Ban AI Hallmarks / Buzzwords</div>
                <div className="text-[10px] text-slate-400 leading-snug">
                  Ban "delve", "tapestry", "beacon", "testament to".
                </div>
              </div>
            </div>

            {/* Rule 5: Strict 1-2 Sentences Max */}
            <div
              onClick={() => handleToggleGuardrail('strictShort')}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                guardrails.strictShort
                  ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-200'
                  : 'border-slate-800 bg-obsidian-950 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  guardrails.strictShort
                    ? 'border-emerald-400 bg-emerald-500 text-obsidian-950'
                    : 'border-slate-700 bg-obsidian-900'
                }`}
              >
                {guardrails.strictShort && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <div>
                <div className="font-bold text-white">Strict 1-2 Sentences Limit</div>
                <div className="text-[10px] text-slate-400 leading-snug">
                  Keep under 25 words for authentic native replies.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
