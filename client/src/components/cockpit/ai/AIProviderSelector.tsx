import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, Sparkles } from 'lucide-react';

export interface AIProviderInfo {
  id: string;
  name: string;
  badge: string;
  description: string;
  defaultBaseUrl: string;
  defaultModel: string;
  recommendedModels: string[];
  requiresApiKey: boolean;
}

export const AI_PROVIDERS: AIProviderInfo[] = [
  {
    id: 'none',
    name: '🚫 Disabled (Spintax Pool Only)',
    badge: 'OFFLINE',
    description:
      'Disable AI generation. The bot strictly uses Spintax templates and the JSON comment pool.',
    defaultBaseUrl: '',
    defaultModel: '',
    recommendedModels: [],
    requiresApiKey: false,
  },
  {
    id: '9router',
    name: '9router (Gateway & Router)',
    badge: 'RECOMMENDED · MULTI-MODEL',
    description:
      'Ultra-efficient multi-model gateway supporting GPT-4o, Claude, DeepSeek, and Llama in one unified API.',
    defaultBaseUrl: 'https://api.9router.com/v1',
    defaultModel: 'openai/gpt-4o-mini',
    recommendedModels: [
      'openai/gpt-4o-mini',
      'deepseek/deepseek-chat',
      'deepseek/deepseek-r1',
      'anthropic/claude-3.5-sonnet',
      'meta-llama/llama-3.3-70b-instruct',
      'google/gemini-2.0-flash',
    ],
    requiresApiKey: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter.ai',
    badge: 'MULTI-PROVIDER',
    description: 'Access hundreds of open-source and proprietary models through a single API endpoint.',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    recommendedModels: [
      'openai/gpt-4o-mini',
      'deepseek/deepseek-chat',
      'anthropic/claude-3.5-sonnet',
      'meta-llama/llama-3.3-70b-instruct',
    ],
    requiresApiKey: true,
  },
  {
    id: 'groq',
    name: 'Groq Cloud (LPU Inference)',
    badge: 'ULTRA FAST · <500MS',
    description: 'Ultra-fast inference at speeds exceeding 300 tokens/second.',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    recommendedModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
    requiresApiKey: true,
  },
  {
    id: 'openai',
    name: 'OpenAI Official',
    badge: 'OFFICIAL API',
    description: 'Official direct OpenAI API featuring GPT-4o and GPT-4o mini.',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    recommendedModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    requiresApiKey: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'GOOGLE AI',
    description: 'Official Google Generative AI API (Gemini 1.5 Flash / Gemini 2.0 Flash / Pro).',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-1.5-flash',
    recommendedModels: ['gemini-1.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro'],
    requiresApiKey: true,
  },
  {
    id: 'ollama',
    name: 'Local Ollama (Self-Hosted)',
    badge: 'LOCAL · 100% PRIVATE',
    description: 'Run LLMs locally on your own machine with zero external API fees.',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
    recommendedModels: ['llama3', 'mistral', 'deepseek-r1', 'qwen2.5'],
    requiresApiKey: false,
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-Compatible API',
    badge: 'CUSTOM ENDPOINT',
    description: 'Use any custom provider compatible with the OpenAI /chat/completions standard.',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    recommendedModels: ['gpt-4o-mini', 'default'],
    requiresApiKey: true,
  },
];

interface AIProviderSelectorProps {
  selectedProvider: string;
  onSelectProvider: (providerId: string) => void;
}

export const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({
  selectedProvider,
  onSelectProvider,
}) => {
  return (
    <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] font-bold tracking-wider text-purple-400 uppercase">
            ENGINE DISPATCHER
          </div>
          <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
            <Sparkles className="h-3 w-3 text-purple-400" />
            {AI_PROVIDERS.length} Supported Engines
          </span>
        </div>
        <CardTitle className="text-base font-heading">AI Providers</CardTitle>
        <CardDescription className="text-xs">
          Select which LLM engine or gateway powers automated contextual comments.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2">
        {AI_PROVIDERS.map((provider) => {
          const isSelected = provider.id === selectedProvider;
          return (
            <div
              key={provider.id}
              onClick={() => onSelectProvider(provider.id)}
              className={cn(
                'group relative flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 transition-all',
                isSelected
                  ? 'border-purple-500 bg-purple-500/10 text-white shadow-md shadow-purple-950/40'
                  : 'border-slate-800 bg-obsidian-950/80 text-slate-300 hover:border-slate-700 hover:bg-obsidian-950'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                      isSelected
                        ? 'border-purple-400 bg-purple-500 text-white'
                        : 'border-slate-700 bg-obsidian-950 text-transparent group-hover:border-slate-600'
                    )}
                  >
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                  <span className="font-heading text-xs font-bold">{provider.name}</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'px-1.5 py-0 font-mono text-[9px]',
                    isSelected
                      ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                      : 'text-slate-400 border-slate-800'
                  )}
                >
                  {provider.badge}
                </Badge>
              </div>
              <p className="line-clamp-2 pl-6 text-[11px] leading-snug text-slate-400">
                {provider.description}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
