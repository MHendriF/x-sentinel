import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient, Settings } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    description: 'Nonaktifkan AI. Bot hanya akan menggunakan template Spintax dan JSON comment pool.',
    defaultBaseUrl: '',
    defaultModel: '',
    recommendedModels: [],
    requiresApiKey: false,
  },
  {
    id: '9router',
    name: '9router (AI Gateway & Router)',
    badge: 'RECOMMENDED · MULTI-MODEL',
    description: 'Gateway multi-model ultra-efisien yang mendukung GPT-4o, Claude, DeepSeek, dan Llama dalam satu API.',
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
    description: 'Akses ke ratusan model open-source dan proprietary melalui satu API endpoint.',
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
    description: 'Inference ultra-cepat dengan kecepatan lebih dari 300 token/detik.',
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
    description: 'API resmi langsung dari OpenAI dengan model GPT-4o dan GPT-4o mini.',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    recommendedModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    requiresApiKey: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'GOOGLE AI',
    description: 'API resmi Google Generative AI (Gemini 1.5 Flash / Gemini 1.5 Pro).',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-1.5-flash',
    recommendedModels: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
    requiresApiKey: true,
  },
  {
    id: 'ollama',
    name: 'Local Ollama (Self-Hosted)',
    badge: 'LOCAL · 100% PRIVATE',
    description: 'Jalankan LLM secara lokal di komputer Anda tanpa biaya API eksternal.',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
    recommendedModels: ['llama3', 'mistral', 'deepseek-r1', 'qwen2.5'],
    requiresApiKey: false,
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-Compatible API',
    badge: 'CUSTOM ENDPOINT',
    description: 'Gunakan provider kustom apa pun yang mematuhi standar format OpenAI /chat/completions.',
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
    prompt: 'Write a sharp, context-aware 1-sentence English reply as a crypto native on market dynamics, rails, or ecosystem shifts. Conversational, zero generic praise, max 20 words.',
  },
  {
    id: 'tech-builder',
    name: '💻 Tech Builder & Systems Dev',
    prompt: 'Write a concise 1-sentence English observation as a software engineer on architecture tradeoffs, latency, or velocity. Direct, peer-to-peer, no fluff.',
  },
  {
    id: 'signal-contrarian',
    name: '🎯 High-Signal Curator / Second-Order',
    prompt: 'Write a clever, high-signal 1-sentence English response highlighting the second-order implication of the tweet. Keep it casual and authentic.',
  },
  {
    id: 'punchy-hook',
    name: '🚀 Punchy Micro-Hook (Under 15 words)',
    prompt: 'Write a witty, short 1-sentence English punchline (under 15 words) reacting naturally to the tweet. No hashtags, no quotes, no bot phrases.',
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
    }
  }, [settings]);

  const selectedProviderInfo =
    AI_PROVIDERS.find((p) => p.id === aiProvider) || AI_PROVIDERS[0];

  const handleSelectProvider = (providerId: string) => {
    setAiProvider(providerId);
    const info = AI_PROVIDERS.find((p) => p.id === providerId);
    if (info && info.id !== 'none') {
      if (!aiModel || aiModel === 'gpt-4o-mini') {
        setAiModel(info.defaultModel);
      }
      if (!aiBaseUrl || aiBaseUrl.includes('api.openai.com')) {
        setAiBaseUrl(info.defaultBaseUrl);
      }
    }
  };

  const handleSave = async () => {
    const payload: Partial<Settings> = {
      aiProvider,
      aiApiKey: aiApiKey.trim(),
      aiModel: aiModel.trim(),
      aiBaseUrl: aiBaseUrl.trim(),
      aiPrompt: aiPrompt.trim(),
    };

    try {
      const res = await apiClient.saveSettings(payload);
      if (res.success) {
        setSettings(res.settings);
        toast.success(`Konfigurasi AI (${aiProvider.toUpperCase()}) berhasil disimpan!`);
      }
    } catch (err: any) {
      toast.error(`Gagal menyimpan: ${err.message}`);
    }
  };

  // Test 1: Quick Ping & Credentials Check
  const handleTestConnection = async () => {
    if (aiProvider === 'none') {
      toast.error('Pilih provider AI selain "Disabled" untuk menguji.');
      return;
    }
    if (selectedProviderInfo.requiresApiKey && !aiApiKey.trim()) {
      toast.error('Masukkan API Key terlebih dahulu untuk menguji koneksi.');
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
      toast.error(`Gagal uji koneksi AI: ${err.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Test 2: Live Contextual Generation on Sample Tweet
  const handleRunLiveGeneration = async () => {
    if (aiProvider === 'none') {
      toast.error('Pilih provider AI selain "Disabled" untuk menguji.');
      return;
    }
    if (selectedProviderInfo.requiresApiKey && !aiApiKey.trim()) {
      toast.error('Masukkan API Key terlebih dahulu untuk menguji.');
      return;
    }
    if (!testTweetInput.trim()) {
      toast.error('Masukkan teks tweet target pada kolom sample.');
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
        toast.success(`🤖 AI Reply Berhasil (${duration}ms)!`);
      } else {
        toast.error(`AI Error: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Gagal meracik balasan AI: ${err.message}`);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8 animate-in fade-in">
      {/* Top Banner Card */}
      <Card className="border-purple-500/40 bg-gradient-to-br from-obsidian-850 via-obsidian-900 to-purple-950/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <CardContent className="p-6 relative z-10 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="purple" className="gap-1.5 px-3 py-1 font-mono text-[11px] font-bold">
                <Bot className="w-3.5 h-3.5" />
                AI INTELLIGENCE SUITE
              </Badge>
              <Badge
                variant="outline"
                className={`font-mono text-[11px] ${
                  aiProvider !== 'none'
                    ? 'border-purple-500/60 bg-purple-500/10 text-purple-300'
                    : 'border-slate-700 text-slate-400'
                }`}
              >
                STATUS: {aiProvider !== 'none' ? `ACTIVE · ${aiProvider.toUpperCase()}` : 'DISABLED'}
              </Badge>
            </div>

            <Button
              onClick={handleSave}
              className="bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold gap-1.5 shadow-md shadow-purple-900/40"
            >
              <Save className="w-3.5 h-3.5" />
              Save AI Settings
            </Button>
          </div>

          <div>
            <h2 className="text-2xl font-heading font-black text-white tracking-tight">
              AI Provider &amp; Autonomous Replies Studio
            </h2>
            <p className="text-slate-300 text-xs mt-1 leading-relaxed max-w-3xl">
              Konfigurasikan model bahasa besar (LLM) untuk menghasilkan balasan tweet yang 100% kontekstual, cerdas, dan alami (No AI Slop).
              Mendukung <strong>9router</strong>, <strong>OpenRouter</strong>, <strong>Groq</strong>, <strong>OpenAI</strong>, <strong>Gemini</strong>, dan <strong>Local Ollama</strong>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Provider Selection & Config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Col: Provider Selection Cards */}
        <Card className="lg:col-span-1 border-border/80">
          <CardHeader className="pb-3">
            <div className="font-mono text-[10px] font-bold text-purple-400 tracking-wider">
              SELECT ENGINE
            </div>
            <CardTitle className="text-base">AI Providers</CardTitle>
            <CardDescription className="text-xs">
              Pilih provider yang ingin digunakan untuk otomasi komentar.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2">
            {AI_PROVIDERS.map((provider) => {
              const isSelected = provider.id === aiProvider;
              return (
                <div
                  key={provider.id}
                  onClick={() => handleSelectProvider(provider.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/10 shadow-md shadow-purple-950/40 text-white'
                      : 'border-slate-800 bg-obsidian-950/80 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-xs">
                      {provider.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono px-1.5 py-0 ${
                        isSelected ? 'border-purple-400 text-purple-300' : 'text-slate-400'
                      }`}
                    >
                      {provider.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                    {provider.description}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Right Col: Detailed Configuration Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card: API Credentials & Endpoints */}
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="font-mono text-[10px] font-bold text-purple-400 tracking-wider">
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
                <div className="p-6 rounded-lg border border-dashed border-slate-800 text-center space-y-2 bg-obsidian-950/50">
                  <div className="w-10 h-10 rounded-full bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
                    <Bot className="w-5 h-5" />
                  </div>
                  <h4 className="font-heading font-bold text-sm text-slate-300">
                    AI Mode Dinonaktifkan
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Pilih salah satu provider di sebelah kiri (misal: <strong>9router</strong>, <strong>OpenRouter</strong>, atau <strong>Groq</strong>) untuk mengaktifkan balasan cerdas otomatis.
                  </p>
                </div>
              ) : (
                <>
                  {/* API Key */}
                  {selectedProviderInfo.requiresApiKey && (
                    <div className="space-y-1.5">
                      <label className="font-mono text-xs font-bold text-slate-300 flex items-center justify-between">
                        <span>
                          API KEY ({aiProvider.toUpperCase()}) <span className="text-flame">*</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {showApiKey ? 'Sembunyikan' : 'Tampilkan'}
                        </button>
                      </label>
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        placeholder={`Paste API key ${selectedProviderInfo.name}...`}
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey(e.target.value)}
                        className="font-mono text-xs bg-obsidian-950"
                      />
                    </div>
                  )}

                  {/* Base URL & Model Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-mono text-xs font-bold text-slate-300">
                        BASE URL ENDPOINT
                      </label>
                      <Input
                        type="text"
                        placeholder={selectedProviderInfo.defaultBaseUrl || 'https://api.openai.com/v1'}
                        value={aiBaseUrl}
                        onChange={(e) => setAiBaseUrl(e.target.value)}
                        className="font-mono text-xs bg-obsidian-950"
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
                        className="font-mono text-xs bg-obsidian-950"
                      />
                    </div>
                  </div>

                  {/* Recommended Models Chips */}
                  {selectedProviderInfo.recommendedModels.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-mono text-slate-400 font-bold">
                        RECOMMENDED MODELS FOR {aiProvider.toUpperCase()}:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProviderInfo.recommendedModels.map((modelName) => (
                          <button
                            key={modelName}
                            type="button"
                            onClick={() => setAiModel(modelName)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                              aiModel === modelName
                                ? 'bg-purple-500/20 border-purple-500 text-purple-200'
                                : 'bg-obsidian-950 border-slate-800 hover:border-slate-700 text-slate-400'
                            }`}
                          >
                            {modelName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Persona Prompt & Presets */}
                  <div className="space-y-2 pt-2 border-t border-border/80">
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
                            toast.info(`Persona "${preset.name}" diterapkan!`);
                          }}
                          className="px-2.5 py-1 rounded text-[10px] font-mono bg-obsidian-950 border border-slate-800 hover:border-purple-500/50 text-slate-300 hover:text-purple-300 transition-colors cursor-pointer"
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
                      className="font-mono text-xs bg-obsidian-950 leading-relaxed"
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
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-amber-400 tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  INTERACTIVE AI SANDBOX &amp; DIAGNOSTICS
                </div>
                {testLatency && (
                  <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/40 text-emerald-300">
                    ⚡ {testLatency}ms LATENCY
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base">Live Response &amp; Ping Tester</CardTitle>
              <CardDescription className="text-xs">
                Uji konektivitas gateway dan simulasikan peracikan balasan alami pada teks tweet target secara live.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Extended Target Tweet Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs font-bold text-slate-300">
                    SAMPLE TARGET TWEET CONTENT
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    {testTweetInput.length} characters
                  </span>
                </div>
                <Textarea
                  rows={5}
                  value={testTweetInput}
                  onChange={(e) => setTestTweetInput(e.target.value)}
                  className="font-mono text-xs bg-obsidian-950 min-h-[120px] leading-relaxed resize-y"
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
                    className="font-mono text-xs border-purple-500/40 text-purple-300 hover:bg-purple-500/10 gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    {isTestingConnection ? 'Pinging Gateway...' : '⚡ Test AI Connection'}
                  </Button>

                  {/* Button 2: Generate Contextual Reply */}
                  <Button
                    type="button"
                    onClick={handleRunLiveGeneration}
                    disabled={isTestingConnection || isGeneratingReply || aiProvider === 'none'}
                    className="font-mono text-xs font-bold bg-amber-500 hover:bg-amber-600 text-obsidian-950 gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    {isGeneratingReply ? 'Generating Reply...' : '🤖 Test AI Reply Generation'}
                  </Button>
                </div>

                {testResult && (
                  <span className={`text-xs font-mono font-semibold ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {testResult.success ? '● Status: ONLINE' : '● Status: ERROR'}
                  </span>
                )}
              </div>

              {/* Result Preview Box */}
              {testResult && (
                <div className={`p-3.5 rounded-lg border text-xs font-mono space-y-2 animate-in fade-in ${
                  testResult.success
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-200'
                    : 'border-red-500/30 bg-red-500/5 text-red-300'
                }`}>
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="flex items-center gap-1.5">
                      {testResult.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
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
                          toast.success('Disalin ke clipboard!');
                        }}
                        className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px] cursor-pointer"
                      >
                        <Copy className="w-3 h-3" /> Salin
                      </button>
                    )}
                  </div>
                  <div className="p-3 rounded bg-obsidian-950/90 border border-slate-800 text-xs leading-relaxed select-all">
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
