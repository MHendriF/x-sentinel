import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ShieldCheck,
  KeyRound,
  User,
  Lock,
  Smartphone,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  Clock,
} from 'lucide-react';

export const CockpitAccessSecurityCard: React.FC = () => {
  const { autoLockMinutes, setAutoLockMinutes } = useStore();

  // Credentials state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);

  // Session revocation state
  const [isRevoking, setIsRevoking] = useState(false);

  // 2FA state
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [isLoading2fa, setIsLoading2fa] = useState(false);
  const [showSetup2fa, setShowSetup2fa] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    load2faStatus();
  }, []);

  const load2faStatus = async () => {
    try {
      const res = await apiClient.get2faStatus();
      if (res.success) {
        setIs2faEnabled(res.enabled);
      }
    } catch {
      // ignore
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Current password is required to update credentials.');
      return;
    }

    if (!newUsername.trim() && !newPassword) {
      toast.info('Please specify a new username or new password.');
      return;
    }

    setIsUpdatingCreds(true);
    try {
      const res = await apiClient.updateCredentials(
        currentPassword,
        newUsername.trim() || undefined,
        newPassword || undefined
      );

      if (res.success) {
        toast.success(res.message || 'Credentials updated successfully. Sessions refreshed.');
        setCurrentPassword('');
        setNewPassword('');
        setNewUsername('');
      } else {
        toast.error(res.message || res.error || 'Failed to update credentials.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error communicating with cockpit auth server.');
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!window.confirm('Revoke all other active sessions across every browser/device?')) {
      return;
    }

    setIsRevoking(true);
    try {
      const res = await apiClient.revokeAllSessions();
      if (res.success) {
        toast.success(res.message || 'All other active sessions revoked.');
      } else {
        toast.error('Failed to revoke sessions.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error revoking sessions.');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleStart2faSetup = async () => {
    setIsLoading2fa(true);
    try {
      const res = await apiClient.setup2fa();
      if (res.success) {
        setSetupData({ secret: res.secret, otpauthUrl: res.otpauthUrl });
        setShowSetup2fa(true);
        setTotpVerifyCode('');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate 2FA key.');
    } finally {
      setIsLoading2fa(false);
    }
  };

  const handleConfirm2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData?.secret || !totpVerifyCode.trim()) return;

    setIsLoading2fa(true);
    try {
      const res = await apiClient.enable2fa(setupData.secret, totpVerifyCode.trim());
      if (res.success) {
        toast.success('Two-factor authentication enabled successfully!');
        setIs2faEnabled(true);
        setShowSetup2fa(false);
        setSetupData(null);
      } else {
        toast.error(res.message || res.error || 'Invalid 2FA code.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to verify 2FA code.');
    } finally {
      setIsLoading2fa(false);
    }
  };

  const handleDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) {
      toast.error('Current password is required to disable 2FA.');
      return;
    }

    setIsLoading2fa(true);
    try {
      const res = await apiClient.disable2fa(disablePassword);
      if (res.success) {
        toast.success('Two-factor authentication disabled.');
        setIs2faEnabled(false);
        setShowDisableDialog(false);
        setDisablePassword('');
      } else {
        toast.error(res.message || res.error || 'Failed to disable 2FA.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error disabling 2FA.');
    } finally {
      setIsLoading2fa(false);
    }
  };

  const copySecretToClipboard = () => {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast.success('2FA Secret key copied to clipboard.');
  };

  return (
    <Card className="border-border/60 bg-obsidian-900 shadow-md">
      <CardHeader className="border-b border-border/40 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-flame/30 bg-flame/10">
              <KeyRound className="h-4 w-4 text-flame" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold tracking-wide text-white">
                Cockpit Clearance &amp; Access Protocol
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Manage operator credentials, session revocation epochs, and Two-Factor Authentication.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                is2faEnabled
                  ? 'border border-emerald/40 bg-emerald/10 text-emerald'
                  : 'border border-slate-700 bg-obsidian-950 text-slate-400'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${is2faEnabled ? 'bg-emerald' : 'bg-slate-500'}`} />
              {is2faEnabled ? '2FA ACTIVE' : '2FA DISABLED'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Section 1: Change Credentials */}
          <div className="rounded-lg border border-slate-800 bg-obsidian-950/60 p-4">
            <div className="mb-3 flex items-center gap-2 font-mono text-xs font-bold text-slate-200">
              <User className="h-3.5 w-3.5 text-flame" />
              <span>UPDATE OPERATOR CREDENTIALS</span>
            </div>
            <p className="mb-4 text-xs text-slate-400">
              Change your login username or master passcode. Updating credentials automatically invalidates all other active browser sessions.
            </p>

            <form onSubmit={handleUpdateCredentials} className="space-y-3 font-mono text-xs">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-400">
                  CURRENT PASSWORD <span className="text-flame">*</span>
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Required for any security change"
                  required
                  className="border-slate-800 bg-obsidian-900 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">
                    NEW USERNAME (OPTIONAL)
                  </label>
                  <Input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. sentinel_commander"
                    className="border-slate-800 bg-obsidian-900 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">
                    NEW PASSWORD (OPTIONAL)
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="border-slate-800 bg-obsidian-900 text-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isUpdatingCreds || !currentPassword}
                className="mt-2 w-full gap-2 border border-flame/30 bg-flame/10 font-mono text-xs font-semibold text-flame hover:bg-flame hover:text-obsidian-950"
              >
                {isUpdatingCreds ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    UPDATING CREDENTIALS...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    APPLY NEW CREDENTIALS
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Section 2: Session Security & 2FA */}
          <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-obsidian-950/60 p-4">
            <div>
              <div className="mb-3 flex items-center justify-between font-mono text-xs font-bold text-slate-200">
                <span className="flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 text-emerald" />
                  TWO-FACTOR AUTHENTICATION (2FA)
                </span>
              </div>
              <p className="mb-4 text-xs text-slate-400">
                Enforce standard RFC 6238 TOTP 6-digit verification codes using Google Authenticator, Authy, or 1Password.
              </p>

              {/* 2FA Status Box */}
              {!showSetup2fa && !showDisableDialog && (
                <div className="rounded-md border border-slate-800/80 bg-obsidian-900 p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs font-semibold text-white">
                        {is2faEnabled ? 'Authenticator Enforced' : 'Authenticator Disabled'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {is2faEnabled
                          ? 'Login requires your password AND 6-digit TOTP code.'
                          : 'Login requires username and master passcode only.'}
                      </div>
                    </div>
                    {is2faEnabled ? (
                      <Button
                        type="button"
                        onClick={() => setShowDisableDialog(true)}
                        variant="destructive"
                        size="sm"
                        className="font-mono text-[11px]"
                      >
                        DEACTIVATE
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleStart2faSetup}
                        disabled={isLoading2fa}
                        size="sm"
                        className="border border-emerald/40 bg-emerald/10 font-mono text-[11px] text-emerald hover:bg-emerald hover:text-obsidian-950"
                      >
                        {isLoading2fa ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'CONFIGURE 2FA'}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* 2FA Setup Flow */}
              {showSetup2fa && setupData && (
                <form
                  onSubmit={handleConfirm2fa}
                  className="rounded-md border border-emerald/40 bg-obsidian-900 p-3.5 space-y-3 font-mono text-xs"
                >
                  <div className="text-[11px] text-emerald font-semibold">
                    1. Scan or manually enter secret in Google Authenticator:
                  </div>

                  <div className="flex items-center justify-between rounded border border-slate-700 bg-obsidian-950 px-2.5 py-1.5">
                    <span className="font-mono text-xs tracking-wider text-slate-200">
                      {setupData.secret}
                    </span>
                    <button
                      type="button"
                      onClick={copySecretToClipboard}
                      className="text-slate-400 hover:text-white"
                      title="Copy secret"
                    >
                      {copiedSecret ? <Check className="h-3.5 w-3.5 text-emerald" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">
                      2. Enter 6-digit code from app to verify:
                    </label>
                    <Input
                      type="text"
                      maxLength={6}
                      value={totpVerifyCode}
                      onChange={(e) => setTotpVerifyCode(e.target.value)}
                      placeholder="e.g. 123456"
                      className="border-slate-700 bg-obsidian-950 text-center tracking-widest text-emerald font-bold"
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={isLoading2fa || totpVerifyCode.trim().length !== 6}
                      size="sm"
                      className="flex-1 bg-emerald font-mono text-xs font-bold text-obsidian-950 hover:bg-emerald/90"
                    >
                      {isLoading2fa ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'VERIFY & ENABLE'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowSetup2fa(false)}
                      variant="ghost"
                      size="sm"
                      className="font-mono text-xs text-slate-400"
                    >
                      CANCEL
                    </Button>
                  </div>
                </form>
              )}

              {/* 2FA Disable Flow */}
              {showDisableDialog && (
                <form
                  onSubmit={handleDisable2fa}
                  className="rounded-md border border-red-500/30 bg-obsidian-900 p-3.5 space-y-3 font-mono text-xs"
                >
                  <div className="text-[11px] text-red-300 font-semibold">
                    Confirm your master password to deactivate 2FA:
                  </div>
                  <Input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Enter current password"
                    className="border-slate-800 bg-obsidian-950 text-xs"
                    required
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={isLoading2fa || !disablePassword}
                      variant="destructive"
                      size="sm"
                      className="flex-1 font-mono text-xs"
                    >
                      {isLoading2fa ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'CONFIRM DEACTIVATION'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowDisableDialog(false);
                        setDisablePassword('');
                      }}
                      variant="ghost"
                      size="sm"
                      className="font-mono text-xs text-slate-400"
                    >
                      CANCEL
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Inactivity Auto-Lock Configurator */}
            <div className="mt-5 border-t border-slate-800/80 pt-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-200">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    <span>Inactivity Screen Auto-Lock</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Automatically lock cockpit when idle (select 0 to disable).
                  </div>
                </div>

                <select
                  id="sentinel-autolock-select"
                  value={autoLockMinutes}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setAutoLockMinutes(val);
                    if (val <= 0) {
                      toast.info('Inactivity auto-lock disabled.');
                    } else {
                      toast.success(`Inactivity auto-lock set to ${val} minutes.`);
                    }
                  }}
                  className="rounded-md border border-slate-700 bg-obsidian-950 px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:border-flame focus:outline-none focus:ring-1 focus:ring-flame"
                >
                  <option value={5}>5 Minutes (High Security)</option>
                  <option value={15}>15 Minutes (Default)</option>
                  <option value={30}>30 Minutes (Relaxed)</option>
                  <option value={60}>60 Minutes (Extended)</option>
                  <option value={0}>Disabled (Never Lock)</option>
                </select>
              </div>
            </div>

            {/* Session Invalidation Action */}
            <div className="mt-4 border-t border-slate-800/80 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-semibold text-slate-200">
                    Emergency Session Revocation
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Bumps session epoch to instantly disconnect all other devices.
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleRevokeAllSessions}
                  disabled={isRevoking}
                  variant="outline"
                  size="sm"
                  className="border-red-500/40 bg-red-950/20 font-mono text-[11px] text-red-300 hover:border-red-500 hover:bg-red-900/40"
                >
                  {isRevoking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="mr-1.5 h-3.5 w-3.5 text-red-400" />
                      REVOKE ALL
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
