import React from 'react';
import { Lock } from 'lucide-react';

export const SecurityNotice: React.FC = () => {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 font-mono text-xs text-slate-300">
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-flame" />
      <div className="space-y-1">
        <strong className="block font-bold text-amber-300">
          Security &amp; Data Sovereignty Principles:
        </strong>
        <p className="text-[11px] leading-relaxed text-slate-400">
          All account data, authentication cookies, and engagement logs are stored exclusively
          on your local machine in the <code>data/</code> folder. X-SENTINEL never transmits
          your credentials or bot activity history to any external third-party server.
        </p>
      </div>
    </div>
  );
};
