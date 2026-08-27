import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, X, Loader2 } from 'lucide-react';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleTitle: string;
  setScheduleTitle: (s: string) => void;
  scheduleDate: string;
  setScheduleDate: (d: string) => void;
  scheduleTime: string;
  setScheduleTime: (t: string) => void;
  scheduleDelay: number;
  setScheduleDelay: (n: number) => void;
  targetMode: 'single' | 'fleet';
  selectedAccountName?: string;
  activeAccountsCount: number;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  scheduleTitle,
  setScheduleTitle,
  scheduleDate,
  setScheduleDate,
  scheduleTime,
  setScheduleTime,
  scheduleDelay,
  setScheduleDelay,
  targetMode,
  selectedAccountName,
  activeAccountsCount,
  isSubmitting,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-amber-500/40 bg-obsidian-850 p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Calendar className="h-4 w-4 text-amber-400" />
            <span>Jadwalkan Publikasi Postingan</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <label className="font-mono text-xs text-slate-300">JUDUL JADWAL (LABEL)</label>
            <Input
              type="text"
              value={scheduleTitle}
              onChange={(e) => setScheduleTitle(e.target.value)}
              placeholder="Misal: Crypto Morning Insight #1"
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-mono text-xs text-slate-300">TANGGAL EKSEKUSI</label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-xs text-slate-300">WAKTU (JAM : MENIT)</label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-mono text-xs text-slate-300">JEDA ROTASI AKUN (DETIK)</label>
            <Input
              type="number"
              value={scheduleDelay}
              onChange={(e) => setScheduleDelay(Number(e.target.value))}
              min={5}
              max={300}
              className="font-mono text-xs"
            />
          </div>

          <div className="rounded-lg border border-border/80 bg-obsidian-900/60 p-3 font-mono text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span>Target:</span>
              <span className="font-bold text-white">
                {targetMode === 'single'
                  ? selectedAccountName || '1 Akun'
                  : `Seluruh Armada (${activeAccountsCount} Node)`}
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Status Scheduler:</span>
              <span className="text-emerald">Background Loop Aktif (15s)</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/60 pt-3">
          <Button size="sm" variant="outline" onClick={onClose} className="text-xs">
            Batal
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="gap-1.5 bg-amber-500 font-bold text-obsidian-950 hover:bg-amber-400"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
            <span>Simpan Jadwal</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
