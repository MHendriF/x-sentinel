import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient, Settings } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeckHeader } from './DeckHeader';
import { toast } from 'sonner';
import {
  Bot,
  Sparkles,
  Zap,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  Globe,
  Sliders,
  Cpu,
  RefreshCw,
  MessageSquare,
  Copy,
  Terminal,
  HelpCircle,
  ChevronRight,
  Radio,
  Layers,
  Plus,
  Trash2,
  Check,
  RotateCcw,
} from 'lucide-react';

interface AIProviderInfo {
  id: string;
  name: string;
  badge: string;
  description: string;
  defaultBaseUrl: string;
  defaultModel: string;
  recommendedModels: string[];
  requiresApiKey: boolean;
}

const AI_PROVIDERS: AIProviderInfo[] = [
  {
    id: 'none',
    name: '🚫 Disabled (Spintax / JSON Pool Only)',
    badge: 'OFFLINE',
    description:
      'Disable AI. The bot will strictly use Spintax templates and the JSON comment pool.',
    defaultBaseUrl: '',
    defaultModel: '',
    recommendedModels: [],
    requiresApiKey: false,
  },
  {
    id: '9router',
    name: '9router (AI Gateway & Router)',
    badge: 'RECOMMENDED · MULTI-MODEL',
    description:
      'Ultra-efficient multi-model gateway supporting GPT-4o, Claude, DeepSeek, and Llama in one unified API.',
    defaultBaseUrl: 'https://api.9router.com/v1',
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
    description: 'Official Google Generative AI API (Gemini 1.5 Flash / Gemini 1.5 Pro).',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-1.5-flash',
    recommendedModels: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
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
    description:
      'Use any custom provider compatible with the OpenAI /chat/completions standard.',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    recommendedModels: ['gpt-4o-mini', 'default'],
    requiresApiKey: true,
  },
];

const PERSONA_PRESETS = [
  {
    id: 'web3-alpha',
    name: '🌐 Web3 & Crypto Native (No Slop)',
    prompt:
      'Write a sharp, context-aware 1-sentence English reply as a crypto native on market dynamics, rails, or ecosystem shifts. Conversational, zero generic praise, max 20 words.',
  },
  {
    id: 'tech-builder',
    name: '💻 Tech Builder & Systems Dev',
    prompt:
      'Write a concise 1-sentence English observation as a software engineer on architecture tradeoffs, latency, or velocity. Direct, peer-to-peer, no fluff.',
  },
  {
    id: 'signal-contrarian',
    name: '🎯 High-Signal Curator / Second-Order',
    prompt:
      'Write a clever, high-signal 1-sentence English response highlighting the second-order implication of the tweet. Keep it casual and authentic.',
  },
  {
    id: 'punchy-hook',
    name: '🚀 Punchy Micro-Hook (Under 15 words)',
    prompt:
      'Write a witty, short 1-sentence English punchline (under 15 words) reacting naturally to the tweet. No hashtags, no quotes, no bot phrases.',
  },
];

export const AISettingsDeck: React.FC = () => {
  const { settings, setSettings, loadSettings } = useStore();

  const [aiProvider, setAiProvider] = useState('none');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // 9router Multi-Model Registry State
  const [nineRouterModels, setNineRouterModels] = useState<string[]>([
    'openai/gpt-4o-mini',
    'deepseek/deepseek-chat',
    'anthropic/claude-3.5-sonnet',
    'meta-llama/llama-3.3-70b-instruct',
  ]);
  const [newModelInput, setNewModelInput] = useState('');

  // Live Sandbox state
  const [testTweetInput, setTestTweetInput] = useState(
    'Base chain TVL hits new all time high as agentic workflows and automated trading nodes dominate transaction volume on decentralized rails.'
  );
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings) {
      setAiProvider(settings.aiProvider || 'none');
      setAiApiKey(settings.aiApiKey || '');
      setAiModel(settings.aiModel || '');
      setAiBaseUrl(settings.aiBaseUrl || '');
      setAiPrompt(
        settings.aiPrompt ||
          'Write a sharp, authentic, and context-aware 1-sentence English reply as a crypto/tech native. Be insightful, peer-to-peer, and zero generic praise.'
      );

      const defaultModels = [
        'openai/gpt-4o-mini',
        'deepseek/deepseek-chat',
        'anthropic/claude-3.5-sonnet',
        'meta-llama/llama-3.3-70b-instruct',
      ];
      const initialModels =
        Array.isArray(settings.nineRouterModels) && settings.nineRouterModels.length > 0
          ? settings.nineRouterModels
          : defaultModels;

      if (settings.aiModel && !initialModels.includes(settings.aiModel)) {
        setNineRouterModels([settings.aiModel, ...initialModels]);
      } else {
        setNineRouterModels(initialModels);
      }
    }
  }, [settings]);

  const selectedProviderInfo = AI_PROVIDERS.find((p) => p.id === aiProvider) || AI_PROVIDERS[0];

  const handleSelectProvider = (providerId: string) => {
    setAiProvider(providerId);
    const info = AI_PROVIDERS.find((p) => p.id === providerId);
    if (info && info.id !== 'none') {
      if (providerId === '9router') {
        if (!aiModel || aiModel === 'gpt-4o-mini') {
          setAiModel(nineRouterModels[0] || info.defaultModel);
        }
      } else if (!aiModel || aiModel === 'gpt-4o-mini') {
        setAiModel(info.defaultModel);
      }
      if (!aiBaseUrl || aiBaseUrl.includes('api.openai.com')) {
        setAiBaseUrl(info.defaultBaseUrl);
      }
    }
  };

  // 9router Multi-Model Handlers
  const handleSelectActiveModel = (modelName: string) => {
    setAiModel(modelName);
    toast.info(`Active 9router model set to: ${modelName}`);
  };

  const handleAddCustomModel = () => {
    const trimmed = newModelInput.trim();
    if (!trimmed) {
      toast.error('Please enter a model identifier (e.g. deepseek/deepseek-r1).');
      return;
    }
    if (nineRouterModels.includes(trimmed)) {
      setAiModel(trimmed);
      toast.info(`"${trimmed}" is already saved. Set as active!`);
      setNewModelInput('');
      return;
    }

    const updated = [trimmed, ...nineRouterModels];
    setNineRouterModels(updated);
    setAiModel(trimmed);
    setNewModelInput('');
    toast.success(`Model "${trimmed}" added to registry and set as active!`);
  };

  const handleDeleteModel = (modelToDelete: string) => {
    if (nineRouterModels.length <= 1) {
      toast.error('You must keep at least one model in your 9router registry.');
      return;
    }
    const updated = nineRouterModels.filter((m) => m !== modelToDelete);
    setNineRouterModels(updated);
    if (aiModel === modelToDelete) {
      setAiModel(updated[0]);
      toast.warning(`Deleted active model. Switched active to "${updated[0]}".`);
    } else {
      toast.success(`Removed "${modelToDelete}" from 9router registry.`);
    }
  };

  const handleResetDefaultModels = () => {
    const defaults = [
      'openai/gpt-4o-mini',
      'deepseek/deepseek-chat',
      'anthropic/claude-3.5-sonnet',
      'meta-llama/llama-3.3-70b-instruct',
    ];
    setNineRouterModels(defaults);
    if (!defaults.includes(aiModel)) {
      setAiModel(defaults[0]);
    }
    toast.info('9router models reset to recommended defaults.');
  };

  const handleSave = async () => {
    let finalNineRouterModels = [...nineRouterModels];
    if (
      aiProvider === '9router' &&
      aiModel.trim() &&
      !finalNineRouterModels.includes(aiModel.trim())
    ) {
      finalNineRouterModels = [aiModel.trim(), ...finalNineRouterModels];
      setNineRouterModels(finalNineRouterModels);
    }

    const payload: Partial<Settings> = {
      aiProvider,
      aiApiKey: aiApiKey.trim(),
      aiModel: aiModel.trim(),
      aiBaseUrl: aiBaseUrl.trim(),
      aiPrompt: aiPrompt.trim(),
      nineRouterModels: finalNineRouterModels,
    };

    try {
      const res = await apiClient.saveSettings(payload);
      if (res.success) {
        setSettings(res.settings);
        toast.success(`AI configuration (${aiProvider.toUpperCase()}) saved successfully!`);
      }
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    }
  };

  // Test 1: Quick Ping & Credentials Check
  const handleTestConnection = async () => {
    if (aiProvider === 'none') {
      toast.error('Select an active AI provider other than "Disabled" to test.');
      return;
    }
    if (selectedProviderInfo.requiresApiKey && !aiApiKey.trim()) {
      toast.error('Please enter an API Key first to test connection.');
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);
    setTestLatency(null);
    const startTime = Date.now();

    try {
      const res = await apiClient.testAISettings({
        aiProvider,
        aiApiKey: aiApiKey.trim(),
        aiModel: aiModel.trim(),
        aiBaseUrl: aiBaseUrl.trim(),
      });

      const duration = Date.now() - startTime;
      setTestLatency(duration);
      setTestResult({
        ...res,
        testType: 'connection',
      });

      if (res.success) {
        toast.success(`⚡ AI Connection OK (${duration}ms): ${res.message}`);
      } else {
        toast.error(`AI Error: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`AI connection test failed: ${err.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Test 2: Live Contextual Generation on Sample Tweet
  const handleRunLiveGeneration = async () => {
    if (aiProvider === 'none') {
      toast.error('Select an active AI provider other than "Disabled" to test.');
      return;
    }
    if (selectedProviderInfo.requiresApiKey && !aiApiKey.trim()) {
      toast.error('Please enter an API Key first to test.');
      return;
    }
    if (!testTweetInput.trim()) {
      toast.error('Please enter target tweet text in the sample input.');
      return;
    }

    setIsGeneratingReply(true);
    setTestResult(null);
    setTestLatency(null);
    const startTime = Date.now();

    try {
      const res = await apiClient.generateAITest({
        tweetText: testTweetInput.trim(),
        aiProvider,
        aiApiKey: aiApiKey.trim(),
        aiModel: aiModel.trim(),
        aiBaseUrl: aiBaseUrl.trim(),
        aiPrompt: aiPrompt.trim(),
      });

      const duration = Date.now() - startTime;
      setTestLatency(duration);
      setTestResult({
        ...res,
        testType: 'generation',
      });

      if (res.success) {
        toast.success(`🤖 AI Reply Generated Successfully (${duration}ms)!`);
      } else {
        toast.error(`AI Error: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Failed to generate AI reply: ${err.message}`);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  return (
    <div className="animate-in fade-in space-y-6 pb-8">
      {/* Top Banner Card */}
      <DeckHeader
        tag="AI INTELLIGENCE SUITE"
        tagColor="purple"
        accent="purple"
        icon={<Bot className="h-5 w-5 text-purple-400" />}
        badge={
          <Badge
            variant="outline"
            className={`font-mono text-[10px] ${
              aiProvider !== 'none'
                ? 'border-purple-500/60 bg-purple-500/10 text-purple-300'
                : 'border-slate-700 text-slate-400'
            }`}
          >
            STATUS: {aiProvider !== 'none' ? `ACTIVE · ${aiProvider.toUpperCase()}` : 'DISABLED'}
          </Badge>
        }
        title="AI Gateway & Engine Configuration"
        description={
          <>
            Configure large language models (LLMs) to formulate 100% contextual, authentic, and
            natural tweet replies (No AI Slop). Supports <strong>9router</strong>,{' '}
            <strong>OpenRouter</strong>, <strong>Groq</strong>, <strong>OpenAI</strong>,{' '}
            <strong>Gemini</strong>, and <strong>Local Ollama</strong>.
          </>
        }
        actions={
          <Button onClick={handleSave} className="gap-1.5 font-mono text-xs font-bold">
            <Save className="h-3.5 w-3.5" />
            Save AI Settings
          </Button>
        }
      />

      {/* Main Grid: Provider Selection & Config */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left Col: Provider Selection Cards */}
        <Card className="border-border/80 lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="font-mono text-[10px] font-bold tracking-wider text-purple-400">
              SELECT ENGINE
            </div>
            <CardTitle className="text-base">AI Providers</CardTitle>
            <CardDescription className="text-xs">
              Select the engine provider to power automated comment generation.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2">
            {AI_PROVIDERS.map((provider) => {
              const isSelected = provider.id === aiProvider;
              return (
                <div
                  key={provider.id}
                  onClick={() => handleSelectProvider(provider.id)}
                  className={`flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/10 text-white shadow-md shadow-purple-950/40'
                      : 'border-slate-800 bg-obsidian-950/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-xs font-bold">{provider.name}</span>
                    <Badge
                      variant="outline"
                      className={`px-1.5 py-0 font-mono text-[9px] ${
                        isSelected ? 'border-purple-400 text-purple-300' : 'text-slate-400'
                      }`}
                    >
                      {provider.badge}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-[11px] leading-snug text-slate-400">
                    {provider.description}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Right Col: Detailed Configuration Form */}
        <div className="space-y-5 lg:col-span-2">
          {/* Card: API Credentials & Endpoints */}
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="font-mono text-[10px] font-bold tracking-wider text-purple-400">
                  CREDENTIALS &amp; MODEL IDENTIFIER
                </div>
                <Badge variant="outline" className="font-mono text-[10px] text-purple-300">
                  {selectedProviderInfo.name}
                </Badge>
              </div>
              <CardTitle className="text-base">Engine Configuration</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {aiProvider === 'none' ? (
                <div className="space-y-2 rounded-lg border border-dashed border-slate-800 bg-obsidian-950/50 p-6 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                    <Bot className="h-5 w-5" />
                  </div>
                  <h4 className="font-heading text-sm font-bold text-slate-300">
                    AI Engine Disabled
                  </h4>
                  <p className="mx-auto max-w-sm text-xs text-slate-400">
                    Select a provider on the left (e.g. <strong>9router</strong>,{' '}
                    <strong>OpenRouter</strong>, or <strong>Groq</strong>) to activate
                    contextual auto-replies.
                  </p>
                </div>
              ) : (
                <>
                  {/* API Key */}
                  {selectedProviderInfo.requiresApiKey && (
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-between font-mono text-xs font-bold text-slate-300">
                        <span>
                          API KEY ({aiProvider.toUpperCase()}) <span className="text-flame">*</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="flex cursor-pointer items-center gap-1 text-[10px] text-slate-400 hover:text-white"
                        >
                          {showApiKey ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                          {showApiKey ? 'Hide' : 'Show'}
                        </button>
                      </label>
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        placeholder={`Paste API key for ${selectedProviderInfo.name}...`}
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey(e.target.value)}
                        className="bg-obsidian-950 font-mono text-xs"
                      />
                    </div>
                  )}

                  {/* Provider Engine Endpoints & Model Configuration */}
                  {aiProvider === '9router' ? (
                    <div className="space-y-4">
                      {/* Base URL Endpoint */}
                      <div className="space-y-1.5">
                        <label className="font-mono text-xs font-bold text-slate-300">
                          BASE URL ENDPOINT (GATEWAY)
                        </label>
                        <Input
                          type="text"
                          placeholder={
                            selectedProviderInfo.defaultBaseUrl || 'https://api.9router.com/v1'
                          }
                          value={aiBaseUrl}
                          onChange={(e) => setAiBaseUrl(e.target.value)}
                          className="bg-obsidian-950 font-mono text-xs"
                        />
                      </div>

                      {/* 9router Multi-Model Registry Deck */}
                      <div className="space-y-4 rounded-xl border border-purple-500/30 bg-obsidian-950/70 p-4 shadow-inner">
                        {/* Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                              <Layers className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-purple-200">
                                9router Multi-Model Registry
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                Store multiple model identifiers and manually select which one is active.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleResetDefaultModels}
                              className="h-7 cursor-pointer gap-1 border-slate-800 bg-obsidian-900 px-2.5 font-mono text-[10px] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                              title="Reset registry to recommended default models"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Reset Defaults
                            </Button>
                          </div>
                        </div>

                        {/* Active Model Spotlight */}
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 via-obsidian-900 to-obsidian-950 p-3 shadow-md">
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/20 opacity-75"></span>
                              <Radio className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                                  ACTIVE MODEL (DISPATCHED)
                                </span>
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0 font-mono text-[9px] text-emerald-300"
                                >
                                  ONLINE
                                </Badge>
                              </div>
                              <div className="font-mono text-xs font-bold text-slate-100">
                                {aiModel || 'No model selected'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right font-mono text-[10px] text-slate-400">
                            {nineRouterModels.length} models stored in registry
                          </div>
                        </div>

                        {/* Stored Models Grid */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="font-mono text-xs font-bold text-slate-300">
                              SAVED MODELS ({nineRouterModels.length}) · CLICK TO SET ACTIVE
                            </label>
                            <span className="text-[10px] text-slate-500">Manual selector</span>
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {nineRouterModels.map((modelName) => {
                              const isActive = aiModel === modelName;
                              return (
                                <div
                                  key={modelName}
                                  className={`group flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-all ${
                                    isActive
                                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100 shadow-sm shadow-emerald-950/50'
                                      : 'border-slate-800/80 bg-obsidian-900/60 text-slate-300 hover:border-purple-500/40 hover:bg-obsidian-900'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleSelectActiveModel(modelName)}
                                    className="flex flex-1 cursor-pointer items-center gap-2.5 text-left"
                                  >
                                    <div
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                        isActive
                                          ? 'border-emerald-400 bg-emerald-500 text-obsidian-950'
                                          : 'border-slate-700 bg-obsidian-950 text-transparent group-hover:border-purple-400'
                                      }`}
                                    >
                                      <Check className="h-3 w-3 stroke-[3]" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-mono text-xs font-medium">
                                        {modelName}
                                      </div>
                                      <div className="font-mono text-[9px]">
                                        {isActive ? (
                                          <span className="font-bold text-emerald-400">● ACTIVE</span>
                                        ) : (
                                          <span className="text-slate-500 group-hover:text-slate-400">
                                            Click to activate
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteModel(modelName);
                                    }}
                                    className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-slate-500 transition-colors hover:bg-red-500/20 hover:text-red-300"
                                    title={`Delete "${modelName}" from registry`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Add Custom Model Input */}
                        <div className="space-y-1.5 border-t border-purple-500/20 pt-3">
                          <label className="font-mono text-xs font-bold text-slate-300">
                            ADD NEW MODEL TO REGISTRY
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              placeholder="e.g. deepseek/deepseek-r1 or google/gemini-2.0-flash..."
                              value={newModelInput}
                              onChange={(e) => setNewModelInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCustomModel();
                                }
                              }}
                              className="bg-obsidian-950 font-mono text-xs"
                            />
                            <Button
                              type="button"
                              onClick={handleAddCustomModel}
                              className="shrink-0 cursor-pointer gap-1.5 bg-purple-600 font-mono text-xs font-bold text-white hover:bg-purple-700"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Model
                            </Button>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="space-y-1.5 pt-1">
                          <span className="font-mono text-[10px] font-bold tracking-wider text-slate-400">
                            QUICK PRESETS · 1-CLICK ADD &amp; ACTIVATE:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              'openai/gpt-4o-mini',
                              'openai/gpt-4o',
                              'deepseek/deepseek-chat',
                              'deepseek/deepseek-r1',
                              'anthropic/claude-3.5-sonnet',
                              'anthropic/claude-3.5-haiku',
                              'meta-llama/llama-3.3-70b-instruct',
                              'google/gemini-2.0-flash',
                              'qwen/qwen-2.5-72b-instruct',
                            ].map((preset) => {
                              const isStored = nineRouterModels.includes(preset);
                              const isActive = aiModel === preset;
                              return (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => {
                                    if (!isStored) {
                                      setNineRouterModels((prev) => [...prev, preset]);
                                    }
                                    setAiModel(preset);
                                    toast.success(`Active model switched to ${preset}`);
                                  }}
                                  className={`flex cursor-pointer items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] transition-colors ${
                                    isActive
                                      ? 'border-emerald-500 bg-emerald-500/20 font-bold text-emerald-200'
                                      : isStored
                                      ? 'border-purple-500/50 bg-purple-500/10 text-purple-200 hover:border-purple-400'
                                      : 'border-slate-800 bg-obsidian-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                  }`}
                                >
                                  {isActive && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                  {preset}
                                  {!isStored && (
                                    <span className="text-[9px] text-purple-400">+add</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Direct Model Override */}
                        <div className="space-y-1 border-t border-purple-500/10 pt-2.5">
                          <div className="flex items-center justify-between">
                            <label className="font-mono text-[11px] font-bold text-slate-400">
                              DIRECT ACTIVE IDENTIFIER OVERRIDE
                            </label>
                            <span className="text-[10px] text-slate-500">Manual input field</span>
                          </div>
                          <Input
                            type="text"
                            placeholder="Model identifier string..."
                            value={aiModel}
                            onChange={(e) => setAiModel(e.target.value)}
                            className="bg-obsidian-950 font-mono text-xs text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Base URL & Model Grid */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="font-mono text-xs font-bold text-slate-300">
                            BASE URL ENDPOINT
                          </label>
                          <Input
                            type="text"
                            placeholder={
                              selectedProviderInfo.defaultBaseUrl || 'https://api.openai.com/v1'
                            }
                            value={aiBaseUrl}
                            onChange={(e) => setAiBaseUrl(e.target.value)}
                            className="bg-obsidian-950 font-mono text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-mono text-xs font-bold text-slate-300">
                            MODEL IDENTIFIER
                          </label>
                          <Input
                            type="text"
                            placeholder={selectedProviderInfo.defaultModel || 'openai/gpt-4o-mini'}
                            value={aiModel}
                            onChange={(e) => setAiModel(e.target.value)}
                            className="bg-obsidian-950 font-mono text-xs"
                          />
                        </div>
                      </div>

                      {/* Recommended Models Chips */}
                      {selectedProviderInfo.recommendedModels.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="font-mono text-[10px] font-bold text-slate-400">
                            RECOMMENDED MODELS FOR {aiProvider.toUpperCase()}:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedProviderInfo.recommendedModels.map((modelName) => (
                              <button
                                key={modelName}
                                type="button"
                                onClick={() => setAiModel(modelName)}
                                className={`cursor-pointer rounded border px-2 py-0.5 font-mono text-[10px] transition-colors ${
                                  aiModel === modelName
                                    ? 'border-purple-500 bg-purple-500/20 text-purple-200'
                                    : 'border-slate-800 bg-obsidian-950 text-slate-400 hover:border-slate-700'
                                }`}
                              >
                                {modelName}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Persona Prompt & Presets */}
                  <div className="space-y-2 border-t border-border/80 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="font-mono text-xs font-bold text-slate-300">
                        SYSTEM PERSONA &amp; REPLY PROMPT (NO AI SLOP)
                      </label>
                      <span className="text-[10px] text-slate-400">English Native Cadence</span>
                    </div>

                    {/* Persona Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {PERSONA_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setAiPrompt(preset.prompt);
                            toast.info(`Persona "${preset.name}" applied!`);
                          }}
                          className="cursor-pointer rounded border border-slate-800 bg-obsidian-950 px-2.5 py-1 font-mono text-[10px] text-slate-300 transition-colors hover:border-purple-500/50 hover:text-purple-300"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      rows={3}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Enter system persona prompt in English (e.g. Write a sharp, context-aware 1-sentence English reply as a crypto/tech native)..."
                      className="bg-obsidian-950 font-mono text-xs leading-relaxed"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card: Live AI Sandbox & Tester */}
          <Card className="border-purple-500/30 bg-obsidian-900/90 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-amber-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  INTERACTIVE AI SANDBOX &amp; DIAGNOSTICS
                </div>
                {testLatency && (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 font-mono text-[10px] text-emerald-300"
                  >
                    ⚡ {testLatency}ms LATENCY
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base">Live Response &amp; Ping Tester</CardTitle>
              <CardDescription className="text-xs">
                Test gateway connectivity and simulate natural reply formulation on sample tweet
                text in real time.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Extended Target Tweet Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs font-bold text-slate-300">
                    SAMPLE TARGET TWEET CONTENT
                  </label>
                  <span className="font-mono text-[10px] text-slate-400">
                    {testTweetInput.length} characters
                  </span>
                </div>
                <Textarea
                  rows={5}
                  value={testTweetInput}
                  onChange={(e) => setTestTweetInput(e.target.value)}
                  className="min-h-[120px] resize-y bg-obsidian-950 font-mono text-xs leading-relaxed"
                  placeholder="Paste or type sample tweet content here..."
                />
              </div>

              {/* Action Buttons: Test Connection & Test Reply Generation */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Button 1: Quick Ping Test */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection || isGeneratingReply || aiProvider === 'none'}
                    className="cursor-pointer gap-1.5 border-purple-500/40 font-mono text-xs text-purple-300 shadow-sm hover:bg-purple-500/10"
                  >
                    <Zap className="h-3.5 w-3.5 text-purple-400" />
                    {isTestingConnection ? 'Pinging Gateway...' : '⚡ Test AI Connection'}
                  </Button>

                  {/* Button 2: Generate Contextual Reply */}
                  <Button
                    type="button"
                    onClick={handleRunLiveGeneration}
                    disabled={isTestingConnection || isGeneratingReply || aiProvider === 'none'}
                    className="cursor-pointer gap-1.5 bg-amber-500 font-mono text-xs font-bold text-obsidian-950 shadow-md shadow-amber-950/40 hover:bg-amber-600"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    {isGeneratingReply ? 'Generating Reply...' : '🤖 Test AI Reply Generation'}
                  </Button>
                </div>

                {testResult && (
                  <span
                    className={`font-mono text-xs font-semibold ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {testResult.success ? '● Status: ONLINE' : '● Status: ERROR'}
                  </span>
                )}
              </div>

              {/* Result Preview Box */}
              {testResult && (
                <div
                  className={`animate-in fade-in space-y-2 rounded-lg border p-3.5 font-mono text-xs ${
                    testResult.success
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-200'
                      : 'border-red-500/30 bg-red-500/5 text-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="flex items-center gap-1.5">
                      {testResult.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                      )}
                      {testResult.testType === 'connection'
                        ? `AI PING RESULT (${testResult.model || aiModel})`
                        : `GENERATED CONTEXTUAL REPLY (${testResult.model || aiModel})`}
                    </span>
                    {testResult.sampleOutput && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(testResult.sampleOutput);
                          toast.success('Copied to clipboard!');
                        }}
                        className="flex cursor-pointer items-center gap-1 text-[10px] text-slate-400 hover:text-white"
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    )}
                  </div>
                  <div className="select-all rounded border border-slate-800 bg-obsidian-950/90 p-3 text-xs leading-relaxed">
                    {testResult.sampleOutput ? `"${testResult.sampleOutput}"` : testResult.message}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
