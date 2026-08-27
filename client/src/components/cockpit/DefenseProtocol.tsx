import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient, Settings } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Save,
  Clock,
  Cpu,
  MousePointer,
  Bot,
  ArrowRight,
  Shield,
  Sliders,
  Bell,
  Send,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export const DefenseProtocol: React.FC = () => {
  const { settings, setSettings, loadSettings, setActiveTab } = useStore();

  const [minDelay, setMinDelay] = useState(15);
  const [maxDelay, setMaxDelay] = useState(35);
  const [switchDelay, setSwitchDelay] = useState(10);
  const [dailyLimit, setDailyLimit] = useState(150);
  const [headless, setHeadless] = useState(false);
  const [scrollAction, setScrollAction] = useState(true);

  // Webhooks state
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [isTestingWebhook, setIsTestingWebhook] = useState<'telegram' | 'discord' | null>(null);

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
      setTelegramEnabled(Boolean(settings.telegramEnabled));
      setTelegramBotToken(settings.telegramBotToken || '');
      setTelegramChatId(settings.telegramChatId || '');
      setDiscordEnabled(Boolean(settings.discordEnabled));
      setDiscordWebhookUrl(settings.discordWebhookUrl || '');
    }
  }, [settings]);

  const handleSave = async () => {
    const payload: Partial<Settings> = {
      minDelaySeconds: Number(minDelay),
      maxDelaySeconds: Number(maxDelay),
      accountSwitchDelaySec: Number(switchDelay),
      dailyLimit: Number(dailyLimit),
      headless,
      scrollBeforeAction: scrollAction,
      telegramEnabled,
      telegramBotToken: telegramBotToken.trim(),
      telegramChatId: telegramChatId.trim(),
      discordEnabled,
      discordWebhookUrl: discordWebhookUrl.trim(),
    };

    try {
      const res = await apiClient.saveSettings(payload);
      if (res.success) {
        setSettings(res.settings);
        toast.success('Pengaturan protokol keamanan & webhook berhasil disimpan.');
      }
    } catch (err: any) {
      toast.error(`Gagal menyimpan: ${err.message}`);
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
          `🔔 Pesan uji coba berhasil dikirim ke ${type === 'telegram' ? 'Telegram Bot' : 'Discord Webhook'}!`
        );
      } else {
        toast.error(`Gagal mengirim alert uji coba: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsTestingWebhook(null);
    }
  };

  return (
    <div className="animate-in fade-in mx-auto max-w-2xl space-y-5">
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
              Konfigurasi 9router, OpenRouter, Groq, model, dan persona kini dipusatkan di tab
              khusus.
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
          <span>Buka AI Studio</span>
          <ArrowRight className="h-3 w-3 text-purple-400" />
        </Button>
      </div>

      {/* Main Defense Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-flame">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            EVASION &amp; DEFENSE PROTOCOL
          </div>
          <CardTitle className="text-xl">Anti-Ban &amp; Stealth Engine</CardTitle>
          <CardDescription>
            Konfigurasikan interval penundaan acak manusia (*human-like randomized intervals*) dan
            batasan kuota untuk mencegah rate-limit X.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Delays Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-300">
                <Clock className="h-3.5 w-3.5 text-flame" />
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
              <label className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-300">
                <Clock className="h-3.5 w-3.5 text-flame" />
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
          <div className="space-y-2.5 border-t border-border/60 pt-2">
            <label className="flex cursor-pointer items-center justify-between rounded-md border border-border/80 bg-obsidian-950 p-3 hover:border-slate-700">
              <div className="flex items-center gap-3">
                <Cpu className="h-4 w-4 text-blue-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Mode Headless (Background)</div>
                  <div className="text-[10px] text-muted-foreground">
                    Jalankan browser tanpa jendela GUI untuk menghemat RAM.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={headless}
                onChange={(e) => setHeadless(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-obsidian-900 text-flame accent-amber-500 focus:ring-flame"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-md border border-border/80 bg-obsidian-950 p-3 hover:border-slate-700">
              <div className="flex items-center gap-3">
                <MousePointer className="h-4 w-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Humanized Scroll Simulation
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Lakukan scrolling acak sebelum klik tombol Like/Repost untuk meniru manusia.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={scrollAction}
                onChange={(e) => setScrollAction(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-obsidian-900 text-flame accent-amber-500 focus:ring-flame"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Webhook & Instant Notifications Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-cyan-400">
            <Bell className="h-3.5 w-3.5 text-cyan-400" />
            REALTIME ALERT &amp; NOTIFICATIONS
          </div>
          <CardTitle className="text-xl">Telegram &amp; Discord Webhooks</CardTitle>
          <CardDescription>
            Kirimkan alert real-time ke bot Telegram atau server Discord saat tweet diposting, sesi
            kedaluwarsa, atau tugas selesai.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
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
                className="h-4 w-4 rounded border-slate-700 bg-obsidian-900 text-blue-500 accent-blue-500 focus:ring-blue-500"
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
                    placeholder="Misal: 987654321"
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
                className="h-4 w-4 rounded border-slate-700 bg-obsidian-900 text-purple-500 accent-purple-500 focus:ring-purple-500"
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

          <Button
            variant="default"
            size="lg"
            onClick={handleSave}
            className="mt-4 w-full bg-gradient-to-r from-blue-600 via-flame to-amber-500 font-heading text-sm font-bold text-obsidian-950 hover:brightness-110"
          >
            <Save className="mr-1.5 h-4 w-4" />
            SIMPAN SEMUA PENGATURAN PROTOKOL &amp; WEBHOOK
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
