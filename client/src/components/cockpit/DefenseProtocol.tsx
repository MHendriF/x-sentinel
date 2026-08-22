import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient, Settings } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ShieldCheck, Save, Clock, Cpu, MousePointer } from 'lucide-react';

export const DefenseProtocol: React.FC = () => {
  const { settings, setSettings, loadSettings } = useStore();

  const [minDelay, setMinDelay] = useState(15);
  const [maxDelay, setMaxDelay] = useState(35);
  const [switchDelay, setSwitchDelay] = useState(10);
  const [dailyLimit, setDailyLimit] = useState(150);
  const [headless, setHeadless] = useState(false);
  const [scrollAction, setScrollAction] = useState(true);

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
    };

    try {
      const res = await apiClient.saveSettings(payload);
      if (res.success) {
        setSettings(res.settings);
        toast.success('Pengaturan protokol anti-ban berhasil diperbarui.');
      }
    } catch (err: any) {
      toast.error(`Gagal menyimpan: ${err.message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
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

          <Button
            variant="default"
            size="lg"
            onClick={handleSave}
            className="w-full mt-4 font-heading font-bold text-sm"
          >
            <Save className="w-4 h-4 mr-1.5" />
            SAVE DEFENSE SETTINGS
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
