import React from 'react';
import { cn } from '@/lib/utils';
import { Zap, Lightbulb, Globe, Sliders, Sparkles, RefreshCw, Check, Layers } from 'lucide-react';

export const PRESET_KEYWORDS = [
  { label: '🔥 Solana Ecosystem', kw: 'Solana DeFi, high throughput, and ecosystem momentum' },
  {
    label: '🤖 Autonomous AI Agents',
    kw: 'Autonomous AI agents changing the future of work, intelligence, and crypto',
  },
  { label: '📈 Base Layer-2', kw: 'Base L2 liquidity growth, consumer crypto onchain adoption' },
  {
    label: '🛠️ SaaS & Indie Hacking',
    kw: 'Building Micro-SaaS in public, shipping velocity and product market fit',
  },
  {
    label: '🌐 Global Crypto Trends',
    kw: 'Crypto ecosystem dynamics, community engagement, and market momentum',
  },
  {
    label: '🇮🇩 Indo Tech Community',
    kw: 'Perkembangan adopsi Web3, AI, dan komunitas tech developer di Indonesia',
  },
];

export const STYLE_OPTIONS = [
  {
    id: 'viral_hook',
    label: '🔥 Viral Hook / Hot Take',
    desc: 'Curiosity-inducing opening statement, daring, punchy, high-retention.',
    color: 'border-amber-500 bg-amber-500/10 text-amber-300',
  },
  {
    id: 'alpha_insight',
    label: '💡 Alpha Insight / Analyst',
    desc: 'Sharp data-driven analysis, logical reasoning, and industry wisdom.',
    color: 'border-blue-500 bg-blue-500/10 text-blue-300',
  },
  {
    id: 'mini_value_drop',
    label: '📊 Mini Value-Drop',
    desc: '1 High-impact takeaway, actionable framework, concise breakdown.',
    color: 'border-emerald-500 bg-emerald-500/10 text-emerald-300',
  },
  {
    id: 'founder_story',
    label: '🛠️ Founder / Builder Raw',
    desc: 'Authentic building lessons, technical hurdles, transparent execution.',
    color: 'border-purple-500 bg-purple-500/10 text-purple-300',
  },
  {
    id: 'indo_community',
    label: '🇮🇩 Indo Tech & Crypto Community',
    desc: 'Casual, conversational Indonesian crypto/tech niche style (Bahasa Indonesia).',
    color: 'border-rose-500 bg-rose-500/10 text-rose-300',
  },
];

interface PostGeneratorFormProps {
  keyword: string;
  setKeyword: (kw: string) => void;
  selectedStyle: string;
  setSelectedStyle: (s: string) => void;
  language: 'en' | 'id';
  setLanguage: (l: 'en' | 'id') => void;
  variationCount: number;
  setVariationCount: (n: number) => void;
  postMode: 'single' | 'thread';
  setPostMode: (m: 'single' | 'thread') => void;
  customPrompt: string;
  setCustomPrompt: (p: string) => void;
  showAdvanced: boolean;
  setShowAdvanced: (b: boolean) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}

export const PostGeneratorForm: React.FC<PostGeneratorFormProps> = ({
  keyword,
  setKeyword,
  selectedStyle,
  setSelectedStyle,
  language,
  setLanguage,
  variationCount,
  setVariationCount,
  postMode,
  setPostMode,
  customPrompt,
  setCustomPrompt,
  showAdvanced,
  setShowAdvanced,
  isGenerating,
  onGenerate,
}) => {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-obsidian-900/90 p-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 font-heading text-sm font-bold text-white">
          <Zap className="h-4 w-4 text-flame" />
          <span>1. Topic &amp; AI Directives</span>
        </div>
        <span className="rounded bg-flame/10 px-2 py-0.5 font-mono text-[9px] font-bold text-flame">
          STEP 1
        </span>
      </div>

      {/* Keyword Input */}
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center justify-between font-mono text-xs font-semibold text-slate-200">
          <span>KEYWORD / POST TOPIC:</span>
          <span className="text-[10px] text-flame">*Required</span>
        </label>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onGenerate()}
          placeholder="e.g. Solana Layer 2, AI Agents, React 19, Memecoin alpha..."
          className="w-full rounded-lg border border-slate-800 bg-obsidian-950 px-3.5 py-2.5 font-mono text-xs text-white placeholder:text-slate-500 focus:border-flame focus:outline-none focus:ring-1 focus:ring-flame"
        />
      </div>

      {/* Quick Keyword Presets */}
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-400">
          <Lightbulb className="h-3 w-3 text-amber-400" />
          QUICK TOPIC PRESETS:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_KEYWORDS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setKeyword(item.kw);
                if (item.label.includes('Indo')) {
                  setSelectedStyle('indo_community');
                  setLanguage('id');
                }
              }}
              className="rounded border border-slate-800 bg-obsidian-950 px-2.5 py-1 font-mono text-[10px] text-slate-300 transition-colors hover:border-flame/40 hover:bg-flame/10 hover:text-white"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Writing Persona & Tone */}
      <div className="flex flex-col gap-2 pt-1">
        <label className="font-mono text-xs font-semibold text-slate-200">
          WRITING STYLE &amp; PERSONA:
        </label>
        <div className="grid grid-cols-1 gap-2">
          {STYLE_OPTIONS.map((style) => {
            const isSelected = selectedStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => {
                  setSelectedStyle(style.id);
                  if (style.id === 'indo_community') setLanguage('id');
                }}
                className={cn(
                  'flex flex-col rounded-lg border p-2.5 text-left transition-all',
                  isSelected
                    ? cn('border-l-4 shadow-sm', style.color)
                    : 'border-slate-800/80 bg-obsidian-950 text-slate-400 hover:border-slate-700 hover:bg-obsidian-900 hover:text-slate-200'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{style.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-flame" />}
                </div>
                <span className="mt-0.5 text-[10px] text-slate-400">{style.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Post Format & Language */}
      <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
        {/* Post Format Mode: Single vs Mini-Thread */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-300">
            <Layers className="h-3 w-3 text-slate-400" />
            CONTENT FORMAT:
          </label>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-obsidian-950 p-1 text-[11px]">
            <button
              type="button"
              onClick={() => setPostMode('single')}
              className={cn(
                'rounded py-1 font-mono font-medium transition-all',
                postMode === 'single'
                  ? 'bg-flame font-bold text-obsidian-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Single Tweet
            </button>
            <button
              type="button"
              onClick={() => setPostMode('thread')}
              className={cn(
                'rounded py-1 font-mono font-medium transition-all',
                postMode === 'thread'
                  ? 'bg-purple-600 font-bold text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Mini-Thread
            </button>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-300">
            <Globe className="h-3 w-3 text-slate-400" />
            LANGUAGE:
          </label>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-obsidian-950 p-1 text-[11px]">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={cn(
                'rounded py-1 font-mono font-medium transition-all',
                language === 'en'
                  ? 'bg-flame font-bold text-obsidian-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              🇺🇸 English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('id')}
              className={cn(
                'rounded py-1 font-mono font-medium transition-all',
                language === 'id'
                  ? 'bg-flame font-bold text-obsidian-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              🇮🇩 Indonesia
            </button>
          </div>
        </div>
      </div>

      {/* Variation Count */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between font-mono text-[11px] font-semibold text-slate-300">
          <span>VARIATION COUNT:</span>
          <span className="font-bold text-flame">{variationCount}x drafts</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 3, 5].map((cnt) => (
            <button
              key={cnt}
              type="button"
              onClick={() => setVariationCount(cnt)}
              className={cn(
                'rounded-lg border py-1.5 font-mono text-xs font-bold transition-all',
                variationCount === cnt
                  ? 'border-flame bg-flame/20 text-white shadow-sm'
                  : 'border-slate-800 bg-obsidian-950 text-slate-400 hover:border-slate-700 hover:text-white'
              )}
            >
              {cnt}x Variations
            </button>
          ))}
        </div>
      </div>

      {/* Custom Prompt Toggle */}
      <div className="border-t border-border/60 pt-2">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-400 transition-colors hover:text-flame"
        >
          <Sliders className="h-3 w-3 text-flame" />
          <span>
            {showAdvanced ? 'Hide Custom Prompt' : '+ Additional Prompt Customization'}
          </span>
        </button>

        {showAdvanced && (
          <div className="mt-2 space-y-1">
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Additional directives (e.g. 'Use an F1 racing analogy' or 'Adopt a slightly contrarian perspective')..."
              rows={2}
              className="w-full rounded-lg border border-slate-800 bg-obsidian-950 p-2.5 font-mono text-xs text-white placeholder:text-slate-500 focus:border-flame focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating || !keyword.trim()}
        className={cn(
          'mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-3 font-heading text-xs font-bold shadow-lg transition-all',
          isGenerating || !keyword.trim()
            ? 'cursor-not-allowed border border-border/50 bg-obsidian-800 text-slate-500'
            : 'bg-gradient-to-r from-flame via-amber-500 to-flame text-obsidian-950 shadow-flame/20 hover:brightness-110 active:scale-[0.99]'
        )}
      >
        {isGenerating ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin text-obsidian-950" />
            <span>Crafting Content Drafts with AI...</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 text-obsidian-950" />
            <span>
              ⚡ Generate {variationCount} AI Post {postMode === 'thread' ? 'Threads' : 'Drafts'}
            </span>
          </>
        )}
      </button>
    </div>
  );
};
