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
  ShieldCheck,
  Save,
  Clock,
  Cpu,
  MousePointer,
  Bot,
  Sparkles,
  Zap,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const DefenseProtocol: React.FC = () => {
  const { settings, setSettings, loadSettings } = useStore();

  // Defense state
  const [minDelay, setMinDelay] = useState(15);
  const [maxDelay, setMaxDelay] = useState(35);
  const [switchDelay, setSwitchDelay] = useState(10);
  const [dailyLimit, setDailyLimit] = useState(150);
  const [headless, setHeadless] = useState(false);
  const [scrollAction, setScrollAction] = useState(true);

  // AI state
  const [aiProvider, setAiProvider] = useState('none');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<any | null>(null);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings) {
      setMinDelay(settings.minDelaySeconds ?? 15);
      setMaxDelay(settings.maxDelaySeconds ?? 35);
      setSwitchDelay(settings.accountSwitchDelaySec ?? 10);
      setDailyLimit(settings.dailyLimit ?? 150);
      setHeadless(Boolean(settings.headless));
      setScrollAction(Boolean(settings.scrollBeforeAction));
      setAiProvider(settings.aiProvider || 'none');
      setAiApiKey(settings.aiApiKey || '');
      setAiModel(settings.aiModel || '');
      setAiBaseUrl((settings as any).aiBaseUrl || '');
      setAiPrompt(settings.aiPrompt || 'Tulis 1 balasan singkat, santai, alami, relevan, dan menarik untuk tweet berikut. Jangan gunakan tanda petik atau hashtag berlebihan.');
    }
  }, [settings]);

  const handleSave = async () => {
    const payload: Partial<Settings> & { aiBaseUrl?: string } = {
      minDelaySeconds: Number(minDelay),
      maxDelaySeconds: Number(maxDelay),
      accountSwitchDelaySec: Number(switchDelay),
      dailyLimit: Number(dailyLimit),
      headless,
      scrollBeforeAction: scrollAction,
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
        toast.success('Pengaturan protokol dan AI berhasil diperbarui!');
      }
    } catch (err: any) {
      toast.error(`Gagal menyimpan: ${err.message}`);
    }
  };

  const handleTestAI = async () => {
    if (aiProvider === 'none') {
      toast.error('Pilih salah satu provider AI terlebih dahulu.');
      return;
    }
    if (aiProvider !== 'ollama' && !aiApiKey.trim()) {
      toast.error('Masukkan API Key untuk menguji koneksi.');
      return;
    }

    setIsTestingAI(true);
    setAiTestResult(null);
    try {
      const res = await apiClient.testAISettings({
        aiProvider,
        aiApiKey: aiApiKey.trim(),
        aiModel: aiModel.trim(),
        aiBaseUrl: aiBaseUrl.trim()
      } as any);

      setAiTestResult(res);
      if (res.success) {
        toast.success(`AI Online: ${res.message}`);
      } else {
        toast.error(`AI Error: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Gagal menguji koneksi AI: ${err.message}`);
    } finally {
      setIsTestingAI(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* CARD 1: Anti-Ban Timing & Evasion */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-flame tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            EVASION & DEFENSE PROTOCOL
          </div>
          <CardTitle className="text-xl">Anti-Ban & Stealth Engine</CardTitle>
          <CardDescription>
            Konfigurasikan interval penundaan acak manusia (*human-like randomized intervals*) dan batasan kuota untuk mencegah rate-limit X.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Delays Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-flame" />
                MIN ACTION DELAY (DETIK)
              </label>
              <Input
                type="number"
                value={minDelay}
                onChange={(e) => setMinDelay(Number(e.target.value))}
                min={5}
                max={120}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-flame" />
                MAX ACTION DELAY (DETIK)
              </label>
              <Input
                type="number"
                value={maxDelay}
                onChange={(e) => setMaxDelay(Number(e.target.value))}
                min={10}
                max={300}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold text-slate-300">
                NODE SWITCH COOLDOWN (DETIK)
              </label>
              <Input
                type="number"
                value={switchDelay}
                onChange={(e) => setSwitchDelay(Number(e.target.value))}
                min={2}
                max={60}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold text-slate-300">
                DAILY MAX QUOTA / NODE
              </label>
              <Input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                min={10}
                max={500}
                className="font-mono text-xs"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2.5 pt-2 border-t border-border/60">
            <label className="flex items-center justify-between p-3 rounded-md border border-border/80 bg-obsidian-950 cursor-pointer hover:border-slate-700">
              <div className="flex items-center gap-3">
                <Cpu className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Mode Headless (Background)</div>
                  <div className="text-[10px] text-muted-foreground">Jalankan browser tanpa jendela GUI untuk menghemat RAM.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={headless}
                onChange={(e) => setHeadless(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-obsidian-900 text-flame focus:ring-flame accent-amber-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-md border border-border/80 bg-obsidian-950 cursor-pointer hover:border-slate-700">
              <div className="flex items-center gap-3">
                <MousePointer className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Humanized Scroll Simulation</div>
                  <div className="text-[10px] text-muted-foreground">Lakukan scrolling acak sebelum klik tombol Like/Repost untuk meniru manusia.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={scrollAction}
                onChange={(e) => setScrollAction(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-obsidian-900 text-flame focus:ring-flame accent-amber-500"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: AI-Powered Contextual Replies Engine */}
      <Card className="border-purple-500/30 shadow-lg shadow-purple-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-purple-400 tracking-wider">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              INTELLIGENCE LAYER · CONTEXTUAL LLM
            </div>
            {aiProvider !== 'none' && (
              <Badge variant="outline" className="font-mono text-[9px] border-purple-500/50 bg-purple-500/10 text-purple-300">
                ACTIVE: {aiProvider.toUpperCase()}
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl">AI Contextual Auto-Replies</CardTitle>
          <CardDescription>
            Bot akan membaca isi teks tweet target secara cerdas lalu menghasilkan balasan kontekstual dan alami menggunakan AI.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-bold text-slate-300">
              AI PROVIDER ENGINE
            </label>
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-700 bg-obsidian-950 px-3 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="none">🚫 Disabled (Gunakan Template Spintax / JSON Pool Saja)</option>
              <option value="openrouter">🌐 OpenRouter (Multi-Model: GPT-4o, Claude, DeepSeek, Llama)</option>
              <option value="groq">⚡ Groq (Ultra Fast Inference: Llama-3.3 70B / Mixtral)</option>
              <option value="openai">🤖 OpenAI Official (GPT-4o / GPT-4o-mini)</option>
              <option value="gemini">✨ Google Gemini (Gemini 1.5 Flash / Pro)</option>
              <option value="ollama">🏠 Local Ollama (Self-Hosted on localhost:11434)</option>
              <option value="custom">⚙️ Custom OpenAI-Compatible Endpoint</option>
            </select>
          </div>

          {aiProvider !== 'none' && (
            <div className="space-y-3.5 pt-2 border-t border-purple-500/20 animate-in fade-in">
              {/* API Key (if not local ollama) */}
              {aiProvider !== 'ollama' && (
                <div className="space-y-1.5">
                  <label className="font-mono text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>API KEY ({aiProvider.toUpperCase()}) <span className="text-flame">*</span></span>
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </label>
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder={`Paste ${aiProvider.toUpperCase()} API key...`}
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    className="font-mono text-xs bg-obsidian-950"
                  />
                </div>
              )}

              {/* Custom Model & Base URL Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-mono text-xs font-bold text-slate-300">
                    MODEL IDENTIFIER (OPTIONAL)
                  </label>
                  <Input
                    type="text"
                    placeholder={
                      aiProvider === 'groq'
                        ? 'llama-3.3-70b-versatile'
                        : aiProvider === 'openrouter'
                        ? 'openai/gpt-4o-mini'
                        : aiProvider === 'gemini'
                        ? 'gemini-1.5-flash'
                        : 'gpt-4o-mini'
                    }
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="font-mono text-xs bg-obsidian-950"
                  />
                </div>

                {(aiProvider === 'ollama' || aiProvider === 'custom') && (
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs font-bold text-slate-300">
                      CUSTOM BASE URL
                    </label>
                    <Input
                      type="text"
                      placeholder="http://localhost:11434/v1"
                      value={aiBaseUrl}
                      onChange={(e) => setAiBaseUrl(e.target.value)}
                      className="font-mono text-xs bg-obsidian-950"
                    />
                  </div>
                )}
              </div>

              {/* Persona / System Prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs font-bold text-slate-300">
                    AI PERSONA & REPLY INSTRUCTIONS
                  </label>
                  <span className="text-[10px] text-slate-400">Instruksi gaya bahasa balasan</span>
                </div>
                <Textarea
                  rows={2}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Tulis 1 balasan santai, alami, relevan dalam bahasa Inggris/Indonesia untuk tweet target..."
                  className="font-mono text-xs bg-obsidian-950"
                />
              </div>

              {/* Test Connection Button & Result */}
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestAI}
                  disabled={isTestingAI}
                  className="font-mono text-xs border-purple-500/40 text-purple-300 hover:bg-purple-500/10 gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  {isTestingAI ? 'Menghubungi AI...' : '⚡ Test AI Connection'}
                </Button>

                {aiTestResult && (
                  <div className={`p-2 rounded text-xs font-mono flex items-center gap-1.5 ${
                    aiTestResult.success ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/10 text-red-300 border border-red-500/30'
                  }`}>
                    {aiTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate max-w-[280px]">{aiTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Global Save Button */}
      <Button
        variant="default"
        size="lg"
        onClick={handleSave}
        className="w-full font-heading font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-950/40"
      >
        <Save className="w-4 h-4 mr-1.5" />
        SAVE ALL CONFIGURATIONS & DEFENSE SETTINGS
      </Button>
    </div>
  );
};

