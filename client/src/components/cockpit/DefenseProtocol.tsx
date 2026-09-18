import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient, Settings } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { DeckHeader } from './DeckHeader';
import { toast } from 'sonner';
import {
  ShieldAlert,
  ShieldCheck,
  Save,
  Clock,
  Cpu,
  MousePointer,
  Bot,
  ArrowRight,
  Sliders,
  Bell,
  Send,
  CheckCircle2,
  RefreshCw,
  Globe,
  Flame,
  Activity,
  Keyboard,
  Check,
  Zap,
} from 'lucide-react';
import { DefenseProfilePresets, DefenseProfile, DEFENSE_PROFILES } from './defense/DefenseProfilePresets';
import { DefensePostureHUD } from './defense/DefensePostureHUD';

export const DefenseProtocol: React.FC = () => {
  const { settings, setSettings, loadSettings, setActiveTab } = useStore();

  const [minDelay, setMinDelay] = useState(settings?.minDelaySeconds ?? 15);
  const [maxDelay, setMaxDelay] = useState(settings?.maxDelaySeconds ?? 35);
  const [switchDelay, setSwitchDelay] = useState(settings?.accountSwitchDelaySec ?? 10);
  const [hourlyLimit, setHourlyLimit] = useState(settings?.hourlyLimit ?? 25);
  const [dailyLimit, setDailyLimit] = useState(settings?.dailyLimit ?? 150);
  const [typingDelay, setTypingDelay] = useState(settings?.humanTypingDelayMs ?? 65);
  const [headless, setHeadless] = useState(Boolean(settings?.headless));
  const [scrollAction, setScrollAction] = useState(settings ? Boolean(settings.scrollBeforeAction) : true);
  const [browserEngine, setBrowserEngine] = useState<'chromium' | 'camoufox'>(
    (settings?.browserEngine as 'chromium' | 'camoufox') || 'chromium'
  );

  // Derive active profile dynamically from current settings values
  const activeProfileId = useMemo(() => {
    const matched = DEFENSE_PROFILES.find((prof) => {
      const s = prof.settings;
      const minMatch = Number(minDelay) === s.minDelay;
      const maxMatch = Number(maxDelay) === s.maxDelay;
      const switchMatch = Number(switchDelay) === s.switchDelay;
      const hourlyMatch = Number(hourlyLimit) === s.hourlyLimit;
      const dailyMatch = Number(dailyLimit) === s.dailyLimit;
      const typingMatch = Number(typingDelay) === s.typingDelay;
      const scrollMatch = Boolean(scrollAction) === Boolean(s.scrollAction);
      const engineMatch = s.browserEngine ? browserEngine === s.browserEngine : true;

      return (
        minMatch &&
        maxMatch &&
        switchMatch &&
        hourlyMatch &&
        dailyMatch &&
        typingMatch &&
        scrollMatch &&
        engineMatch
      );
    });
    return matched ? matched.id : null;
  }, [
    minDelay,
    maxDelay,
    switchDelay,
    hourlyLimit,
    dailyLimit,
    typingDelay,
    scrollAction,
    browserEngine,
  ]);

  // Webhooks state
  const [telegramEnabled, setTelegramEnabled] = useState(Boolean(settings?.telegramEnabled));
  const [telegramBotToken, setTelegramBotToken] = useState(settings?.telegramBotToken || '');
  const [telegramChatId, setTelegramChatId] = useState(settings?.telegramChatId || '');
  const [discordEnabled, setDiscordEnabled] = useState(Boolean(settings?.discordEnabled));
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(settings?.discordWebhookUrl || '');
  const [notifyOnTaskComplete, setNotifyOnTaskComplete] = useState(settings?.notifyOnTaskComplete !== false);
  const [notifyOnRateLimit, setNotifyOnRateLimit] = useState(settings?.notifyOnRateLimit !== false);
  const [notifyOnSessionExpire, setNotifyOnSessionExpire] = useState(settings?.notifyOnSessionExpire !== false);

  // Testing states
  const [isTestingWebhook, setIsTestingWebhook] = useState<'telegram' | 'discord' | null>(null);
  const [isTestingBrowser, setIsTestingBrowser] = useState(false);
  const [browserTestReport, setBrowserTestReport] = useState<{
    success: boolean;
    message: string;
    duration?: number;
    engine?: string;
    stealth?: { webdriverMasked: boolean; userAgent: string; hardwareConcurrency: number };
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings) {
      setMinDelay(settings.minDelaySeconds ?? 15);
      setMaxDelay(settings.maxDelaySeconds ?? 35);
      setSwitchDelay(settings.accountSwitchDelaySec ?? 10);
      setHourlyLimit(settings.hourlyLimit ?? 25);
      setDailyLimit(settings.dailyLimit ?? 150);
      setTypingDelay(settings.humanTypingDelayMs ?? 65);
      setHeadless(Boolean(settings.headless));
      setScrollAction(Boolean(settings.scrollBeforeAction));
      setBrowserEngine((settings.browserEngine as 'chromium' | 'camoufox') || 'chromium');
      setTelegramEnabled(Boolean(settings.telegramEnabled));
      setTelegramBotToken(settings.telegramBotToken || '');
      setTelegramChatId(settings.telegramChatId || '');
      setDiscordEnabled(Boolean(settings.discordEnabled));
      setDiscordWebhookUrl(settings.discordWebhookUrl || '');
      setNotifyOnTaskComplete(settings.notifyOnTaskComplete !== false);
      setNotifyOnRateLimit(settings.notifyOnRateLimit !== false);
      setNotifyOnSessionExpire(settings.notifyOnSessionExpire !== false);
    }
  }, [settings]);

  // Dirty state checking
  const isDirty = useMemo(() => {
    if (!settings) return false;
    return (
      minDelay !== (settings.minDelaySeconds ?? 15) ||
      maxDelay !== (settings.maxDelaySeconds ?? 35) ||
      switchDelay !== (settings.accountSwitchDelaySec ?? 10) ||
      hourlyLimit !== (settings.hourlyLimit ?? 25) ||
      dailyLimit !== (settings.dailyLimit ?? 150) ||
      typingDelay !== (settings.humanTypingDelayMs ?? 65) ||
      headless !== Boolean(settings.headless) ||
      scrollAction !== Boolean(settings.scrollBeforeAction) ||
      browserEngine !== ((settings.browserEngine as 'chromium' | 'camoufox') || 'chromium') ||
      telegramEnabled !== Boolean(settings.telegramEnabled) ||
      telegramBotToken !== (settings.telegramBotToken || '') ||
      telegramChatId !== (settings.telegramChatId || '') ||
      discordEnabled !== Boolean(settings.discordEnabled) ||
      discordWebhookUrl !== (settings.discordWebhookUrl || '') ||
      notifyOnTaskComplete !== (settings.notifyOnTaskComplete !== false) ||
      notifyOnRateLimit !== (settings.notifyOnRateLimit !== false) ||
      notifyOnSessionExpire !== (settings.notifyOnSessionExpire !== false)
    );
  }, [
    settings,
    minDelay,
    maxDelay,
    switchDelay,
    hourlyLimit,
    dailyLimit,
    typingDelay,
    headless,
    scrollAction,
    browserEngine,
    telegramEnabled,
    telegramBotToken,
    telegramChatId,
    discordEnabled,
    discordWebhookUrl,
    notifyOnTaskComplete,
    notifyOnRateLimit,
    notifyOnSessionExpire,
  ]);

  const handleApplyProfile = (profile: DefenseProfile) => {
    setMinDelay(profile.settings.minDelay);
    setMaxDelay(profile.settings.maxDelay);
    setSwitchDelay(profile.settings.switchDelay);
    setHourlyLimit(profile.settings.hourlyLimit);
    setDailyLimit(profile.settings.dailyLimit);
    setTypingDelay(profile.settings.typingDelay);
    setScrollAction(profile.settings.scrollAction);
    if (profile.settings.browserEngine) {
      setBrowserEngine(profile.settings.browserEngine);
    }
    toast.success(`Applied "${profile.title}" defense profile.`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payload: Partial<Settings> = {
      minDelaySeconds: Number(minDelay),
      maxDelaySeconds: Number(maxDelay),
      accountSwitchDelaySec: Number(switchDelay),
      hourlyLimit: Number(hourlyLimit),
      dailyLimit: Number(dailyLimit),
      humanTypingDelayMs: Number(typingDelay),
      headless,
      scrollBeforeAction: scrollAction,
      browserEngine,
      telegramEnabled,
      telegramBotToken: telegramBotToken.trim(),
      telegramChatId: telegramChatId.trim(),
      discordEnabled,
      discordWebhookUrl: discordWebhookUrl.trim(),
      notifyOnTaskComplete,
      notifyOnRateLimit,
      notifyOnSessionExpire,
    };

    try {
      const res = await apiClient.saveSettings(payload);
      if (res.success) {
        setSettings(res.settings);
        toast.success('Security protocol & webhook settings saved successfully.');
      }
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestBrowser = async () => {
    setIsTestingBrowser(true);
    setBrowserTestReport(null);
    try {
      const res = await apiClient.testBrowser(browserEngine);
      setBrowserTestReport(res);
      if (res.success) {
        toast.success(`⚡ ${res.message}`);
      } else {
        toast.error(`Test failed: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error testing browser: ${err.message}`);
      setBrowserTestReport({
        success: false,
        message: err.message,
      });
    } finally {
      setIsTestingBrowser(false);
    }
  };

  const handleTestWebhook = async (type: 'telegram' | 'discord') => {
    setIsTestingWebhook(type);
    try {
      const res = await apiClient.testWebhook({
        type,
        telegramBotToken: telegramBotToken.trim(),
        telegramChatId: telegramChatId.trim(),
        discordWebhookUrl: discordWebhookUrl.trim(),
      });

      if (res.success) {
        toast.success(
          `🔔 Test alert sent successfully to ${type === 'telegram' ? 'Telegram Bot' : 'Discord Webhook'}!`
        );
      } else {
        toast.error(`Failed to send test alert: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsTestingWebhook(null);
    }
  };

  return (
    <div className="animate-in fade-in space-y-6">
      {/* Quick AI Link Banner */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-obsidian-900 to-obsidian-950 p-3.5 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-purple-500/40 bg-purple-500/20 text-purple-400">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="font-heading text-xs font-bold text-white">
              AI Provider &amp; Model Configuration
            </div>
            <div className="text-[11px] text-slate-400">
              Konfigurasi 9router, OpenRouter, Groq, model LLM, dan persona sistem terpusat di AI Studio.
            </div>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setActiveTab('tab-ai')}
          className="shrink-0 gap-1.5 border-purple-500/40 font-mono text-xs text-purple-300 hover:bg-purple-500/10"
        >
          <span>Open AI Studio</span>
          <ArrowRight className="h-3 w-3 text-purple-400" />
        </Button>
      </div>

      {/* Main Deck Header with Dirty State & Sticky Save Action */}
      <DeckHeader
        tag="EVASION &amp; DEFENSE PROTOCOL"
        tagColor="emerald"
        icon={<ShieldAlert className="h-5 w-5 text-emerald-400" />}
        title="Stealth &amp; Rate Limit Protection"
        description="Konfigurasi parameter evasif, jeda acak jitter, proteksi kuota 2-tingkat, dan browser anti-deteksi."
        actions={
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-950/40 px-2.5 py-1 font-mono text-[10px] font-bold text-amber-400">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-400" />
                Unsaved Changes
              </span>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className={`font-heading text-xs font-bold transition-all ${
                isDirty
                  ? 'bg-flame text-white shadow-lg shadow-flame/30 hover:bg-flame/90'
                  : 'border border-border/80 bg-obsidian-850 text-slate-400'
              }`}
            >
              <Save className={`mr-1.5 h-3.5 w-3.5 ${isSaving ? 'animate-spin' : ''}`} />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        }
      />

      {/* 1. Quick Evasion Presets */}
      <DefenseProfilePresets
        onApplyProfile={handleApplyProfile}
        activeProfileId={activeProfileId}
      />

      {/* 2. Defensive Posture HUD */}
      <DefensePostureHUD
        minDelay={minDelay}
        maxDelay={maxDelay}
        switchDelay={switchDelay}
        hourlyLimit={hourlyLimit}
        dailyLimit={dailyLimit}
        browserEngine={browserEngine}
        scrollAction={scrollAction}
        typingDelay={typingDelay}
      />

      {/* 3. Action Timing & Rate Limit Protection Card */}
      <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-flame">
            <Clock className="h-3.5 w-3.5" />
            TIMING JITTER &amp; RATE LIMIT QUOTAS
          </div>
          <CardTitle className="text-lg">Jeda Aksi &amp; Batas Kuota Interaksi</CardTitle>
          <CardDescription>
            Menetapkan variasi waktu jeda humanized dan kuota 2-tingkat (per jam &amp; per hari) untuk mencegah pembatasan HTTP 429.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Delays Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="flex items-center justify-between font-mono text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-flame" />
                  MIN DELAY (SEC)
                </span>
                <span className="text-slate-400 font-normal">{minDelay}s</span>
              </label>
              <Input
                type="number"
                value={minDelay}
                onChange={(e) => setMinDelay(Number(e.target.value))}
                min={3}
                max={300}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center justify-between font-mono text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-flame" />
                  MAX DELAY (SEC)
                </span>
                <span className="text-slate-400 font-normal">{maxDelay}s</span>
              </label>
              <Input
                type="number"
                value={maxDelay}
                onChange={(e) => setMaxDelay(Number(e.target.value))}
                min={5}
                max={600}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center justify-between font-mono text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-cyan-400" />
                  NODE SWITCH COOLDOWN
                </span>
                <span className="text-slate-400 font-normal">{switchDelay}s</span>
              </label>
              <Input
                type="number"
                value={switchDelay}
                onChange={(e) => setSwitchDelay(Number(e.target.value))}
                min={2}
                max={180}
                className="font-mono text-xs"
              />
            </div>
          </div>

          {/* 2-Tier Quotas Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 rounded-lg border border-border/70 bg-obsidian-950/70 p-3">
              <label className="flex items-center justify-between font-mono text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-emerald-400" />
                  HOURLY MAX QUOTA / NODE
                </span>
                <span className="rounded bg-emerald-950/40 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
                  {hourlyLimit} aksi / jam
                </span>
              </label>
              <Input
                type="number"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                min={1}
                max={200}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-slate-400">
                Membatasi eksekusi pada rolling window 1 jam untuk mencegah trigger rate limit X.
              </p>
            </div>

            <div className="space-y-1.5 rounded-lg border border-border/70 bg-obsidian-950/70 p-3">
              <label className="flex items-center justify-between font-mono text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-blue-400" />
                  DAILY MAX QUOTA / NODE
                </span>
                <span className="rounded bg-blue-950/40 px-1.5 py-0.5 font-mono text-[10px] text-blue-400">
                  {dailyLimit} aksi / hari
                </span>
              </label>
              <Input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                min={5}
                max={1000}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-slate-400">
                Batas akumulasi aksi maksimal per node dalam 24 jam sebelum node diistirahatkan.
              </p>
            </div>
          </div>

          {/* Keystroke Typing Latency Slider */}
          <div className="rounded-lg border border-border/70 bg-obsidian-950/70 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-300">
                <Keyboard className="h-3.5 w-3.5 text-amber-400" />
                HUMAN KEYSTROKE JITTER (TYPING LATENCY)
              </label>
              <span className="font-mono text-xs font-bold text-amber-400">
                {typingDelay} ms / char
              </span>
            </div>
            <input
              type="range"
              min={25}
              max={150}
              step={5}
              value={typingDelay}
              onChange={(e) => setTypingDelay(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>⚡ Fast (25ms)</span>
              <span>⚖️ Human Natural (~65ms)</span>
              <span>🐢 Casual Stealth (150ms)</span>
            </div>
          </div>

          {/* Behavior Toggles */}
          <div className="space-y-2.5 border-t border-border/60 pt-3">
            <label className="flex cursor-pointer items-center justify-between rounded-md border border-border/80 bg-obsidian-950 p-3 hover:border-slate-700">
              <div className="flex items-center gap-3">
                <Cpu className="h-4 w-4 text-blue-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Headless Mode (Background)</div>
                  <div className="text-[10px] text-muted-foreground">
                    Jalankan browser tanpa jendela grafis GUI untuk menghemat RAM dan CPU.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={headless}
                onChange={(e) => setHeadless(e.target.checked)}
                className="checkbox-flame"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-md border border-border/80 bg-obsidian-950 p-3 hover:border-slate-700">
              <div className="flex items-center gap-3">
                <MousePointer className="h-4 w-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Humanized Scroll &amp; Mouse Simulation
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Simulasikan scrolling acak dan gerak kurva mouse sebelum berinteraksi dengan tweet target.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={scrollAction}
                onChange={(e) => setScrollAction(e.target.checked)}
                className="checkbox-flame"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 4. Browser Engine Selection & Live Verification Tool */}
      <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-blue-400">
              <Globe className="h-3.5 w-3.5" />
              BROWSER ENGINE &amp; ANTI-DETECT RUNTIME
            </div>

            {/* Test Browser Launch Button */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleTestBrowser}
              disabled={isTestingBrowser}
              className="h-8 border-cyan-500/40 bg-cyan-950/20 font-mono text-xs text-cyan-300 hover:bg-cyan-950/40"
            >
              {isTestingBrowser ? (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin text-cyan-400" />
              ) : (
                <Zap className="mr-1.5 h-3.5 w-3.5 text-cyan-400" />
              )}
              {isTestingBrowser ? 'Launching Browser Test...' : 'Test Browser Launch & Ping'}
            </Button>
          </div>
          <CardTitle className="text-lg">Engine Browser &amp; Evasion Fingerprinting</CardTitle>
          <CardDescription>
            Pilih runtime browser untuk armada bot dan verifikasi integritas spoofing hardware secara instan.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setBrowserEngine('chromium');
                setBrowserTestReport(null);
              }}
              className={`flex flex-col justify-between rounded-md border p-3.5 text-left transition-all ${
                browserEngine === 'chromium'
                  ? 'border-blue-500/80 bg-blue-950/20 shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/50'
                  : 'border-border/80 bg-obsidian-950/60 opacity-70 hover:border-slate-700 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Globe className={`h-4 w-4 ${browserEngine === 'chromium' ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-white">Chromium Core</span>
                </div>
                <span className="rounded bg-blue-500/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-blue-300">
                  DEFAULT
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                Engine Playwright standar dilengkapi skrip penyamaran navigator.webdriver, hardware concurrency, dan WebGL mocking.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setBrowserEngine('camoufox');
                setBrowserTestReport(null);
              }}
              className={`flex flex-col justify-between rounded-md border p-3.5 text-left transition-all ${
                browserEngine === 'camoufox'
                  ? 'border-amber-500/80 bg-amber-950/20 shadow-sm shadow-amber-500/10 ring-1 ring-amber-500/50'
                  : 'border-border/80 bg-obsidian-950/60 opacity-70 hover:border-slate-700 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Flame className={`h-4 w-4 ${browserEngine === 'camoufox' ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-white">Camoufox Stealth (Anti-Detect)</span>
                </div>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-amber-300">
                  ANTI-DETECT
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                Build C++ Firefox khusus anti-deteksi dengan hardware spoofing sejati, kurva gerak mouse Bezier, dan proteksi WebRTC leak.
              </p>
            </button>
          </div>

          {/* Browser Test Report Box */}
          {browserTestReport && (
            <div
              className={`rounded-lg border p-3 font-mono text-xs ${
                browserTestReport.success
                  ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                  : 'border-rose-500/40 bg-rose-950/20 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {browserTestReport.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                )}
                <span>{browserTestReport.message}</span>
              </div>

              {browserTestReport.stealth && (
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-emerald-500/20 pt-2 text-[11px] text-slate-300 sm:grid-cols-4">
                  <div>
                    <span className="text-slate-500">Engine:</span>{' '}
                    <span className="text-white font-bold">{browserTestReport.engine}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Latency:</span>{' '}
                    <span className="text-emerald-400 font-bold">{browserTestReport.duration}ms</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Webdriver Mask:</span>{' '}
                    <span className="text-emerald-400 font-bold">
                      {browserTestReport.stealth.webdriverMasked ? 'MASKED ✅' : 'DETECTED ❌'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">CPU Cores:</span>{' '}
                    <span className="text-white font-bold">
                      {browserTestReport.stealth.hardwareConcurrency} Cores
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Webhook & Instant Notifications Card */}
      <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-cyan-400">
            <Bell className="h-3.5 w-3.5 text-cyan-400" />
            REALTIME ALERT &amp; NOTIFICATIONS
          </div>
          <CardTitle className="text-xl">Telegram &amp; Discord Webhooks</CardTitle>
          <CardDescription>
            Kirimkan notifikasi real-time ke bot Telegram atau server Discord saat misi selesai atau terjadi anomali akun.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Granular Event Filter Checkboxes */}
          <div className="space-y-2 rounded-lg border border-border/80 bg-obsidian-950 p-3.5">
            <label className="font-mono text-xs font-bold text-slate-300">
              FILTER KEJADIAN NOTIFIKASI (EVENT SUBSCRIPTION)
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={notifyOnTaskComplete}
                  onChange={(e) => setNotifyOnTaskComplete(e.target.checked)}
                  className="checkbox-flame"
                />
                <span>Task Completed / Failed</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={notifyOnRateLimit}
                  onChange={(e) => setNotifyOnRateLimit(e.target.checked)}
                  className="checkbox-flame"
                />
                <span className="text-amber-300">Rate Limit Warning (429)</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={notifyOnSessionExpire}
                  onChange={(e) => setNotifyOnSessionExpire(e.target.checked)}
                  className="checkbox-flame"
                />
                <span className="text-rose-300">Session Expired / Auth Error</span>
              </label>
            </div>
          </div>

          {/* Telegram Config */}
          <div className="space-y-3 rounded-lg border border-border/80 bg-obsidian-950 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-bold text-white">Telegram Bot Notification</span>
              </div>
              <input
                type="checkbox"
                checked={telegramEnabled}
                onChange={(e) => setTelegramEnabled(e.target.checked)}
                className="checkbox-flame"
              />
            </div>

            {telegramEnabled && (
              <div className="animate-in fade-in grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="font-mono text-[11px] text-slate-400">TELEGRAM BOT TOKEN</label>
                  <Input
                    type="password"
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRs"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[11px] text-slate-400">CHAT ID / USER ID</label>
                  <Input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="e.g. 987654321"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="flex justify-end sm:col-span-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestWebhook('telegram')}
                    disabled={
                      isTestingWebhook === 'telegram' || !telegramBotToken || !telegramChatId
                    }
                    className="gap-1.5 border-blue-500/40 font-mono text-xs text-blue-300 hover:bg-blue-500/10"
                  >
                    {isTestingWebhook === 'telegram' ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>Test Telegram Alert</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Discord Config */}
          <div className="space-y-3 rounded-lg border border-border/80 bg-obsidian-950 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-bold text-white">Discord Channel Webhook</span>
              </div>
              <input
                type="checkbox"
                checked={discordEnabled}
                onChange={(e) => setDiscordEnabled(e.target.checked)}
                className="checkbox-flame"
              />
            </div>

            {discordEnabled && (
              <div className="animate-in fade-in space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="font-mono text-[11px] text-slate-400">
                    DISCORD WEBHOOK URL
                  </label>
                  <Input
                    type="password"
                    value={discordWebhookUrl}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/12345/abcdef..."
                    className="font-mono text-xs"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestWebhook('discord')}
                    disabled={isTestingWebhook === 'discord' || !discordWebhookUrl}
                    className="gap-1.5 border-purple-500/40 font-mono text-xs text-purple-300 hover:bg-purple-500/10"
                  >
                    {isTestingWebhook === 'discord' ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                    <span>Test Discord Alert</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Save Action */}
          <Button
            variant="default"
            size="lg"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className={`mt-4 w-full font-heading text-sm font-bold transition-all ${
              isDirty
                ? 'bg-flame text-white shadow-xl shadow-flame/20 hover:bg-flame/90'
                : 'border border-border/80 bg-obsidian-850 text-slate-400'
            }`}
          >
            <Save className={`mr-1.5 h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Saving Protocol Changes...' : isDirty ? 'Save All Protocol & Webhook Settings' : 'Settings Saved (Up to Date)'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
