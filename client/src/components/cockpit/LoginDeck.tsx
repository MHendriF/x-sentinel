import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TACTICAL_EASE, SPRING_SNAPPY } from '@/components/ui/motion';
import { useStore } from '@/store/useStore';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Terminal,
  ArrowRight,
  Loader2,
  AlertCircle,
  KeyRound,
  User,
  Smartphone,
} from 'lucide-react';

export const LoginDeck: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requireTotpStep, setRequireTotpStep] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { login } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setLocalError(null);

    try {
      const result = await login(
        password.trim(),
        username.trim() || undefined,
        totpCode.trim() || undefined
      );

      if (!result.success) {
        if (result.requireTotp) {
          setRequireTotpStep(true);
          setLocalError(null);
        } else {
          setLocalError(result.error || 'Authentication failed. Please verify your credentials.');
        }
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Network error encountered during cockpit handshake.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-obsidian-950 p-4 font-body text-slate-100 selection:bg-amber-500/20 selection:text-amber-300 sm:p-6">
      {/* Background HUD Ambience Grid & Radial Glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.15) 0%, transparent 65%), linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 32px 32px, 32px 32px',
        }}
      />

      {/* Cockpit Login Portal Card */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: TACTICAL_EASE }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Outer Glow Halo */}
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-b from-flame/25 via-slate-800/35 to-slate-900/10 blur-xl opacity-75" />

        <div className="relative rounded-2xl border border-white/[0.09] border-t-white/[0.16] bg-obsidian-900/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {/* Top Telemetry Header */}
          <div className="mb-6 flex items-center justify-between border-b border-slate-800/60 pb-4 font-mono text-[11px]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flame opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-flame" />
              </span>
              <span className="font-bold tracking-wider text-slate-300">SENTINEL-DEFENSE // V{__APP_VERSION__}</span>
            </div>
            <span className="rounded border border-flame/25 bg-flame/10 px-2 py-0.5 font-semibold text-flame">
              RUST ENGINE
            </span>
          </div>

          {/* Radar Shield Visual */}
          <div className="mb-6 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, ...SPRING_SNAPPY }}
              className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-flame/35 bg-flame/10 shadow-[inset_0_1px_0_rgba(251,191,36,0.25)]"
            >
              <Shield className="h-7 w-7 text-flame" />
              <div className="absolute -right-1 -top-1 rounded-full border border-slate-900 bg-emerald px-1 font-mono text-[9px] font-bold text-obsidian-950">
                AUTH
              </div>
            </motion.div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              X-SENTINEL Cockpit
            </h1>
            <p className="mt-1 font-mono text-xs text-slate-400">
              Autonomous Fleet Mission Control &amp; Growth Studio
            </p>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {localError && (
              <motion.div
                role="alert"
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ duration: 0.2, ease: TACTICAL_EASE }}
                className="mb-5 flex items-start gap-2.5 overflow-hidden rounded-lg border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div className="flex-1 font-mono">{localError}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Credentials Entry Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label
                htmlFor="sentinel-username-input"
                className="mb-1.5 flex items-center justify-between font-mono text-xs font-semibold text-slate-300"
              >
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-flame" />
                  OPERATOR USERNAME
                </span>
                <span className="text-[10px] text-slate-500">DEFAULT: ADMIN</span>
              </label>
              <input
                id="sentinel-username-input"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (localError) setLocalError(null);
                }}
                required
                placeholder="Enter operator username..."
                className="w-full rounded-lg border border-slate-700/80 bg-obsidian-950 px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-flame focus:outline-none focus:ring-1 focus:ring-flame"
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="sentinel-passcode-input"
                className="mb-1.5 flex items-center justify-between font-mono text-xs font-semibold text-slate-300"
              >
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-flame" />
                  MASTER PASSCODE
                </span>
                <span className="text-[10px] text-slate-500">CONFIG / DASHBOARD</span>
              </label>

              <div className="relative">
                <input
                  id="sentinel-passcode-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  autoFocus
                  required
                  placeholder="Enter administrator passcode..."
                  className="w-full rounded-lg border border-slate-700/80 bg-obsidian-950 px-3.5 py-2.5 pr-10 font-mono text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-flame focus:outline-none focus:ring-1 focus:ring-flame"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide passcode' : 'Show passcode'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-slate-200 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Optional 2FA TOTP Input Field */}
            <AnimatePresence>
              {requireTotpStep && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.22, ease: TACTICAL_EASE }}
                  className="overflow-hidden"
                >
                  <label
                    htmlFor="sentinel-totp-input"
                    className="mb-1.5 flex items-center justify-between font-mono text-xs font-semibold text-emerald"
                  >
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-emerald" />
                      2FA AUTHENTICATOR CODE (6-DIGIT)
                    </span>
                    <span className="text-[10px] text-emerald/80">REQUIRED</span>
                  </label>
                  <input
                    id="sentinel-totp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => {
                      setTotpCode(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    autoFocus
                    required
                    placeholder="e.g. 123456"
                    className="w-full tracking-widest text-center font-mono text-lg font-bold rounded-lg border border-emerald/50 bg-obsidian-950 px-3.5 py-2.5 text-emerald placeholder-slate-600 transition-colors focus:border-emerald focus:outline-none focus:ring-1 focus:ring-emerald"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              id="sentinel-login-submit"
              type="submit"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.985 }}
              transition={{ duration: 0.14 }}
              disabled={isSubmitting || !password.trim()}
              className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-flame to-flame-light px-4 py-2.5 font-mono text-xs font-bold text-obsidian-950 shadow-lg shadow-flame/15 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-obsidian-950" />
                  <span>INITIALIZING HANDSHAKE...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-obsidian-950 transition-transform group-hover:scale-110" />
                  <span>{requireTotpStep ? 'VERIFY 2FA & ENTER COCKPIT' : 'AUTHORIZE COCKPIT ACCESS'}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Security Assurance Footer */}
          <div className="mt-6 flex flex-col items-center gap-2 border-t border-slate-800/60 pt-4 font-mono text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <Terminal className="h-3 w-3 text-emerald" />
              <span>15m Inactivity Lock &amp; Epoch-Revocable Sessions</span>
            </div>
            <div className="text-[10px] text-slate-600">
              Credentials manageable inside Cockpit &gt; Defense Protocol
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
