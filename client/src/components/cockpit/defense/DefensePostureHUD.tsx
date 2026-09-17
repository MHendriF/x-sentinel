import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Activity, Flame, Shield } from 'lucide-react';

interface DefensePostureHUDProps {
  minDelay: number;
  maxDelay: number;
  switchDelay: number;
  hourlyLimit: number;
  dailyLimit: number;
  browserEngine: 'chromium' | 'camoufox';
  scrollAction: boolean;
  typingDelay: number;
}

export const DefensePostureHUD: React.FC<DefensePostureHUDProps> = ({
  minDelay,
  maxDelay,
  switchDelay,
  hourlyLimit,
  dailyLimit,
  browserEngine,
  scrollAction,
  typingDelay,
}) => {
  // Compute Defense Posture Score (0 - 100)
  let score = 0;

  // 1. Min Delay score (max 25)
  if (minDelay >= 30) score += 25;
  else if (minDelay >= 20) score += 20;
  else if (minDelay >= 15) score += 15;
  else if (minDelay >= 10) score += 8;
  else score += 2;

  // 2. Randomization Variance (max 15)
  const variance = maxDelay - minDelay;
  if (variance >= 25) score += 15;
  else if (variance >= 15) score += 12;
  else if (variance >= 8) score += 8;
  else if (variance > 0) score += 4;

  // 3. Hourly Quota (max 20)
  if (hourlyLimit <= 10) score += 20;
  else if (hourlyLimit <= 20) score += 16;
  else if (hourlyLimit <= 30) score += 12;
  else if (hourlyLimit <= 45) score += 6;
  else score += 2;

  // 4. Daily Limit (max 15)
  if (dailyLimit <= 60) score += 15;
  else if (dailyLimit <= 120) score += 12;
  else if (dailyLimit <= 200) score += 8;
  else if (dailyLimit <= 350) score += 4;
  else score += 1;

  // 5. Anti-Detect Engine (max 15)
  if (browserEngine === 'camoufox') score += 15;
  else score += 8;

  // 6. Human Behaviors (Typing & Scroll) (max 10)
  if (scrollAction) score += 5;
  if (typingDelay >= 55) score += 5;
  else if (typingDelay >= 40) score += 3;

  score = Math.min(Math.max(score, 10), 100);

  const isOptimal = score >= 85;
  const isBalanced = score >= 65 && score < 85;
  const isRisky = score < 65;

  // Warnings collection
  const warnings: string[] = [];
  if (minDelay >= maxDelay) {
    warnings.push('Min Action Delay tidak boleh lebih besar atau sama dengan Max Action Delay.');
  }
  if (minDelay < 10) {
    warnings.push('Jeda aksi di bawah 10 detik meningkatkan risiko suspensi atau pembatasan rate limit (429).');
  }
  if (hourlyLimit > 40) {
    warnings.push('Batas lebih dari 40 aksi/jam dapat memicu bot detection pada IP residensial biasa.');
  }
  if (dailyLimit > 300 && browserEngine !== 'camoufox') {
    warnings.push('Kuota harian > 300 pada engine Chromium standar disarankan menggunakan proxy rotasi.');
  }

  return (
    <div className="rounded-xl border border-border/70 bg-obsidian-900/90 p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Defense Score Gauge */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border font-mono text-lg font-black shadow-inner ${
              isOptimal
                ? 'border-purple-500/40 bg-purple-950/40 text-purple-300'
                : isBalanced
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                  : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
            }`}
          >
            {score}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-wider text-slate-300">
                DEFENSIVE POSTURE INDEX
              </span>
              <span
                className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${
                  isOptimal
                    ? 'border-purple-500/40 bg-purple-950/40 text-purple-300'
                    : isBalanced
                      ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                      : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
                }`}
              >
                {isOptimal ? 'GHOST LEVEL (ULTRA STEALTH)' : isBalanced ? 'BALANCED DEFENSE' : 'ELEVATED RISK'}
              </span>
            </div>

            <div className="mt-1 text-xs text-slate-400">
              {isOptimal && 'Parameter pertahanan sangat evasif. Peluang deteksi bot sangat minim.'}
              {isBalanced && 'Konfigurasi seimbang untuk output konsisten dengan risiko aman.'}
              {isRisky && 'Pola aksi agresif. Rentan terhadap X rate limit cooldown (HTTP 429).'}
            </div>
          </div>
        </div>

        {/* Right: Quick Spec Badges */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <div className="flex items-center gap-1 rounded-md border border-border/70 bg-obsidian-950 px-2.5 py-1 text-slate-300">
            <Activity className="h-3 w-3 text-cyan-400" />
            <span>Jitter:</span>
            <span className="font-bold text-white">±{variance}s</span>
          </div>

          <div className="flex items-center gap-1 rounded-md border border-border/70 bg-obsidian-950 px-2.5 py-1 text-slate-300">
            <Flame className="h-3 w-3 text-amber-400" />
            <span>Engine:</span>
            <span className="font-bold text-white">
              {browserEngine === 'camoufox' ? 'Camoufox C++' : 'Chromium Core'}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Warnings Bar */}
      {warnings.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-border/50 pt-2.5">
          {warnings.map((w, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-950/20 px-2.5 py-1.5 font-mono text-xs text-amber-300"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
