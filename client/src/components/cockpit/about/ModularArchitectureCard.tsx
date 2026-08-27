import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FolderKanban, Bot, FileCode2, Code2 } from 'lucide-react';

export const ModularArchitectureCard: React.FC = () => {
  return (
    <Card className="border-border/80 bg-obsidian-850">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-flame">
          <FolderKanban className="h-4 w-4" />
          MODULAR CODEBASE ARCHITECTURE
        </div>
        <CardTitle className="text-lg">Sub-Modules &amp; Separation of Concerns</CardTitle>
        <CardDescription>
          Arsitektur kode refaktor yang bersih, sangat mudah di-maintain, dan terisolasi per domain
          tanggung jawab.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Backend Bot Subsystem */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-obsidian-900/60 p-3.5">
            <div className="flex items-center gap-2 font-heading text-xs font-bold text-amber-400">
              <Bot className="h-4 w-4" />
              <span>Backend Core Bot (`server/automation/bot/`)</span>
            </div>
            <ul className="space-y-1 font-mono text-[11px] text-slate-400">
              <li>
                • <code>humanCadence.js</code>: Jitter, scrolling, typing delays
              </li>
              <li>
                • <code>browserFactory.js</code>: Playwright context &amp; stealth
              </li>
              <li>
                • <code>tweetComposer.js</code>: Tweet publisher &amp; media attachments
              </li>
              <li>
                • <code>interactionEngine.js</code>: Like, Repost, Reply pipelines
              </li>
              <li>
                • <code>healthRunner.js</code>: Fleet health &amp; warmup protocols
              </li>
            </ul>
          </div>

          {/* Express Sub-Routers */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-obsidian-900/60 p-3.5">
            <div className="flex items-center gap-2 font-heading text-xs font-bold text-blue-400">
              <FileCode2 className="h-4 w-4" />
              <span>Express API Routers (`server/routes/`)</span>
            </div>
            <ul className="space-y-1 font-mono text-[11px] text-slate-400">
              <li>
                • <code>accountsRouter.js</code>: Fleet CRUD &amp; bulk operations
              </li>
              <li>
                • <code>tasksRouter.js</code>: Multi-post, batch, &amp; hunter tasks
              </li>
              <li>
                • <code>aiRouter.js</code>: AI post generator &amp; connectivity
              </li>
              <li>
                • <code>schedulesRouter.js</code>: Automated post queues
              </li>
              <li>
                • <code>historyRouter.js</code>: Audit history &amp; pruning
              </li>
            </ul>
          </div>

          {/* Frontend Sub-Components */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-obsidian-900/60 p-3.5">
            <div className="flex items-center gap-2 font-heading text-xs font-bold text-emerald-400">
              <Code2 className="h-4 w-4" />
              <span>Frontend Surfaces (`client/src/components/`)</span>
            </div>
            <ul className="space-y-1 font-mono text-[11px] text-slate-400">
              <li>
                • <code>postStudio/</code>: Mockup, dropzone, schedule modal
              </li>
              <li>
                • <code>analytics/</code>: Hook, velocity, share charts
              </li>
              <li>
                • <code>audit/</code>: Filters, table, pagination, maintenance
              </li>
              <li>
                • <code>ui/</code>: Reusable atomic Tailwind &amp; Radix UI components
              </li>
              <li>
                • <code>store/useStore.ts</code>: Global reactive state hydration
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
