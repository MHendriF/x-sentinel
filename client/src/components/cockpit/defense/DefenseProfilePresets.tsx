import React from 'react';
import { Zap, ShieldCheck, Ghost, Sparkles, Check } from 'lucide-react';

export interface DefenseProfile {
  id: 'turbo' | 'balanced' | 'ghost' | 'warmup';
  title: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  description: string;
  settings: {
    minDelay: number;
    maxDelay: number;
    switchDelay: number;
    hourlyLimit: number;
    dailyLimit: number;
    typingDelay: number;
    scrollAction: boolean;
    browserEngine?: 'chromium' | 'camoufox';
  };
}

export const DEFENSE_PROFILES: DefenseProfile[] = [
  {
    id: 'turbo',
    title: 'Turbo Velocity',
    badge: 'HIGH VOLUME',
    badgeColor: 'border-amber-500/40 bg-amber-950/40 text-amber-400',
    icon: <Zap className="h-4 w-4 text-amber-400" />,
    description: 'Jeda cepat untuk akun matang (aged). Mengutamakan kecepatan dan kuota interaksi tinggi.',
    settings: {
      minDelay: 10,
      maxDelay: 20,
      switchDelay: 5,
      hourlyLimit: 35,
      dailyLimit: 250,
      typingDelay: 45,
      scrollAction: true,
      browserEngine: 'chromium',
    },
  },
  {
    id: 'balanced',
    title: 'Balanced Standard',
    badge: 'RECOMMENDED',
    badgeColor: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400',
    icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
    description: 'Keseimbangan optimal antara kecepatan sekuensial dan keamanan akun anti-ban.',
    settings: {
      minDelay: 15,
      maxDelay: 35,
      switchDelay: 10,
      hourlyLimit: 25,
      dailyLimit: 150,
      typingDelay: 65,
      scrollAction: true,
      browserEngine: 'chromium',
    },
  },
  {
    id: 'ghost',
    title: 'Ghost Ultra-Stealth',
    badge: 'MAX EVASION',
    badgeColor: 'border-purple-500/40 bg-purple-950/40 text-purple-400',
    icon: <Ghost className="h-4 w-4 text-purple-400" />,
    description: 'Evasion maksimal untuk akun bernilai tinggi. Memanfaatkan Camoufox C++ dan jeda acak panjang.',
    settings: {
      minDelay: 30,
      maxDelay: 90,
      switchDelay: 25,
      hourlyLimit: 12,
      dailyLimit: 60,
      typingDelay: 90,
      scrollAction: true,
      browserEngine: 'camoufox',
    },
  },
  {
    id: 'warmup',
    title: 'Account Warmup',
    badge: 'FRESH NODES',
    badgeColor: 'border-blue-500/40 bg-blue-950/40 text-blue-400',
    icon: <Sparkles className="h-4 w-4 text-blue-400" />,
    description: 'Pengkondisian bertahap untuk akun baru agar terhindar dari trigger algoritma anti-bot X.',
    settings: {
      minDelay: 45,
      maxDelay: 120,
      switchDelay: 30,
      hourlyLimit: 8,
      dailyLimit: 30,
      typingDelay: 80,
      scrollAction: true,
      browserEngine: 'chromium',
    },
  },
];

interface DefenseProfilePresetsProps {
  onApplyProfile: (profile: DefenseProfile) => void;
  activeProfileId?: string | null;
}

export const DefenseProfilePresets: React.FC<DefenseProfilePresetsProps> = ({
  onApplyProfile,
  activeProfileId,
}) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="font-mono text-xs font-bold text-slate-300">
          ⚡ QUICK EVASION &amp; DEFENSE PROFILES
        </label>
        <span className="font-mono text-[10px] text-slate-400">
          1-Klik menerapkan kombinasi delay, kuota, dan engine optimal
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {DEFENSE_PROFILES.map((prof) => {
          const isActive = activeProfileId === prof.id;
          return (
            <button
              key={prof.id}
              type="button"
              onClick={() => onApplyProfile(prof)}
              className={`flex flex-col justify-between rounded-lg border p-3 text-left transition-all ${
                isActive
                  ? 'border-flame/80 bg-flame/10 shadow-md shadow-flame/10 ring-1 ring-flame/50'
                  : 'border-border/80 bg-obsidian-950/70 hover:border-slate-700 hover:bg-obsidian-900'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {prof.icon}
                    <span className="text-xs font-bold text-white">{prof.title}</span>
                  </div>
                  {isActive ? (
                    <span className="flex items-center rounded bg-flame/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-flame">
                      <Check className="mr-0.5 h-2.5 w-2.5" /> ACTIVE
                    </span>
                  ) : (
                    <span
                      className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold ${prof.badgeColor}`}
                    >
                      {prof.badge}
                    </span>
                  )}
                </div>

                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                  {prof.description}
                </p>
              </div>

              <div className="mt-3 border-t border-border/50 pt-2 font-mono text-[10px] text-slate-400">
                <div className="flex justify-between">
                  <span>Delay:</span>
                  <span className="text-slate-200">
                    {prof.settings.minDelay}s - {prof.settings.maxDelay}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Limit:</span>
                  <span className="text-slate-200">
                    {prof.settings.hourlyLimit}/hr • {prof.settings.dailyLimit}/day
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
