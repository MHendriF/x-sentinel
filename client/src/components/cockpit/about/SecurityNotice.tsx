import React from 'react';
import { Lock } from 'lucide-react';

export const SecurityNotice: React.FC = () => {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 font-mono text-xs text-slate-300">
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-flame" />
      <div className="space-y-1">
        <strong className="block font-bold text-amber-300">
          Prinsip Keamanan &amp; Kedaulatan Data:
        </strong>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Seluruh data akun, cookie autentikasi, dan catatan interaksi disimpan secara eksklusif
          pada komputer lokal Anda di folder <code>data/</code>. X-SENTINEL tidak mengirimkan
          kredensial atau riwayat bot Anda ke server pihak ketiga mana pun.
        </p>
      </div>
    </div>
  );
};
