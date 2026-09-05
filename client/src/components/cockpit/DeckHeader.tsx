import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type DeckHeaderTagColor =
  | 'flame'
  | 'purple'
  | 'emerald'
  | 'cyan'
  | 'amber'
  | 'rose'
  | 'slate';

export type DeckHeaderIconAnimation =
  | 'reticle'
  | 'pulse'
  | 'spin'
  | 'none';

export interface DeckHeaderProps {
  /** Subsystem/over-title tag (e.g. 'CLUSTER TOPOLOGY', 'AI INTELLIGENCE SUITE') */
  tag: string;
  /** Accent color for indicator & tag text. Defaults to 'flame'. */
  tagColor?: DeckHeaderTagColor;
  /** Secondary pill text or badge beside tag (e.g. 'FLEET CONTROLS') */
  badge?: React.ReactNode;
  /** Custom icon overriding the default pulsing dot (optional) */
  icon?: React.ReactNode;
  /** Custom animation for icon. Defaults to 'reticle'. */
  iconAnimation?: DeckHeaderIconAnimation;
  /** Whether the deck is actively executing a task/operation. Activates continuous telemetry spin mode. */
  isActive?: boolean;
  /** Main deck heading text or node */
  title: React.ReactNode;
  /** Optional metric badges or chips displayed inline beside the title */
  titleBadges?: React.ReactNode;
  /** Explanatory description or subtitle */
  description?: React.ReactNode;
  /** Functional actions slot on the right side (toolbars, buttons, tabs) */
  actions?: React.ReactNode;
  /** Accent card theme/border gradient. Defaults to 'none'. */
  accent?: 'none' | 'flame' | 'purple' | 'emerald' | 'cyan' | 'rose';
  /** Rendering variant: 'card' (standard top banner card) or 'flat' (border-b divider). Defaults to 'card'. */
  variant?: 'card' | 'flat';
  /** Extra custom class names */
  className?: string;
  /** Optional nested children rendered inside the CardContent (or below flat header) */
  children?: React.ReactNode;
}

const TAG_COLORS: Record<
  DeckHeaderTagColor,
  { text: string; bg: string; border: string; glow: string }
> = {
  flame: {
    text: 'text-flame',
    bg: 'bg-flame',
    border: 'border-flame/40',
    glow: 'shadow-flame/20',
  },
  purple: {
    text: 'text-purple-400',
    bg: 'bg-purple-400',
    border: 'border-purple-500/40',
    glow: 'shadow-purple-500/20',
  },
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-400',
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-500/20',
  },
  cyan: {
    text: 'text-cyan-400',
    bg: 'bg-cyan-400',
    border: 'border-cyan-500/40',
    glow: 'shadow-cyan-500/20',
  },
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-400',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/20',
  },
  rose: {
    text: 'text-rose-400',
    bg: 'bg-rose-400',
    border: 'border-rose-500/40',
    glow: 'shadow-rose-500/20',
  },
  slate: {
    text: 'text-slate-400',
    bg: 'bg-slate-400',
    border: 'border-slate-500/40',
    glow: 'shadow-slate-500/20',
  },
};

const ACCENT_STYLES: Record<NonNullable<DeckHeaderProps['accent']>, string> = {
  none: 'border-border/80 bg-obsidian-900/90 shadow-xl',
  flame: 'border-flame/40 bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-flame-950/20 shadow-xl',
  purple:
    'border-purple-500/40 bg-gradient-to-br from-obsidian-850 via-obsidian-900 to-purple-950/20 shadow-2xl',
  emerald:
    'border-emerald-500/30 bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-emerald-950/20 shadow-xl',
  cyan: 'border-cyan-500/30 bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-cyan-950/20 shadow-xl',
  rose: 'border-rose-500/30 bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-rose-950/20 shadow-xl',
};

export const DeckHeader: React.FC<DeckHeaderProps> = ({
  tag,
  tagColor = 'flame',
  badge,
  icon,
  iconAnimation = 'reticle',
  isActive = false,
  title,
  titleBadges,
  description,
  actions,
  accent = 'none',
  variant = 'card',
  className,
  children,
}) => {
  const colorMap = TAG_COLORS[tagColor] || TAG_COLORS.flame;
  const accentClass = ACCENT_STYLES[accent] || ACCENT_STYLES.none;

  const headerContent = (
    <>
      <div className="flex items-start gap-4">
        {/* HUD Cyber Pod with State-Aware Rotating Reticle Ring */}
        {icon && (
          <div className="relative flex shrink-0 items-center justify-center pt-0.5">
            {/* Ambient Neon Backlight Aura */}
            <div
              className={cn(
                'absolute -inset-1 rounded-xl opacity-20 blur-md pointer-events-none transition-all duration-500',
                colorMap.bg,
                isActive
                  ? 'opacity-60 blur-lg animate-pulse'
                  : 'group-hover:opacity-45 group-hover:blur-md'
              )}
            />

            {/* Rotating Reticle Tech Ring (Outer Orbit) */}
            {iconAnimation !== 'none' && (
              <div
                className={cn(
                  'pointer-events-none absolute -inset-1.5 flex items-center justify-center transition-all duration-500',
                  isActive
                    ? 'opacity-85 animate-reticle-active'
                    : 'opacity-25 group-hover:opacity-75 group-hover:animate-reticle-spin'
                )}
              >
                <div
                  className={cn(
                    'h-full w-full rounded-xl border border-dashed transition-colors duration-300',
                    colorMap.border,
                    isActive ? 'border-current' : 'group-hover:border-current'
                  )}
                />
              </div>
            )}

            {/* Glassmorphism Capsule Box */}
            <div
              className={cn(
                'relative flex h-11 w-11 items-center justify-center rounded-lg border bg-gradient-to-b from-obsidian-800/90 to-obsidian-950/95 shadow-xl backdrop-blur-md transition-all duration-300',
                colorMap.border,
                isActive ? 'border-current/90 shadow-lg' : 'group-hover:border-current/70'
              )}
            >
              {/* Corner Tech Accents */}
              <span
                className={cn(
                  'absolute -top-[1px] -left-[1px] h-1.5 w-1.5 border-t-2 border-l-2 transition-all duration-300',
                  colorMap.text,
                  isActive ? 'h-2 w-2' : 'group-hover:h-2 group-hover:w-2'
                )}
              />
              <span
                className={cn(
                  'absolute -bottom-[1px] -right-[1px] h-1.5 w-1.5 border-b-2 border-r-2 transition-all duration-300',
                  colorMap.text,
                  isActive ? 'h-2 w-2' : 'group-hover:h-2 group-hover:w-2'
                )}
              />

              {/* Centered Sharp Icon */}
              <div
                className={cn(
                  'relative z-10 flex items-center justify-center [&_svg]:h-5 [&_svg]:w-5 transition-transform duration-300',
                  colorMap.text,
                  isActive ? 'scale-105' : 'group-hover:scale-110',
                  iconAnimation === 'spin' && 'animate-spin',
                  iconAnimation === 'pulse' && 'animate-pulse'
                )}
              >
                {icon}
              </div>
            </div>
          </div>
        )}

        {/* Text Details (Tag, Title, Description) */}
        <div className="space-y-1">
          {/* Top Tag Overline */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={cn(
                  'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                  colorMap.bg
                )}
              />
              <span className={cn('relative inline-flex h-2 w-2 rounded-full', colorMap.bg)} />
            </span>

            <span className={cn('font-mono text-[10px] font-bold tracking-widest uppercase', colorMap.text)}>
              {tag}
            </span>

            {badge &&
              (typeof badge === 'string' ? (
                <span className="rounded border border-slate-700/80 bg-obsidian-950 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-slate-400">
                  {badge}
                </span>
              ) : (
                badge
              ))}
          </div>

          {/* Title & Badges */}
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h2 className="font-heading text-xl font-bold tracking-tight text-white">{title}</h2>
            {titleBadges && <div className="flex items-center gap-1.5 font-mono text-xs">{titleBadges}</div>}
          </div>

          {/* Description */}
          {description && (
            <p className="max-w-3xl text-xs leading-relaxed text-slate-400">{description}</p>
          )}
        </div>
      </div>

      {/* Right Actions Slot (Guaranteed single line) */}
      {actions && (
        <div className="flex max-w-full shrink-0 flex-nowrap items-center gap-2 overflow-x-auto py-0.5">
          {actions}
        </div>
      )}
    </>
  );

  if (variant === 'flat') {
    return (
      <div className={cn('group flex flex-col gap-4 border-b border-border/70 pb-4', className)}>
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          {headerContent}
        </div>
        {children}
      </div>
    );
  }

  return (
    <Card className={cn('group', accentClass, className)}>
      <CardHeader
        className={cn(
          'flex flex-col items-start justify-between gap-4 md:flex-row md:items-center',
          children ? 'pb-3' : 'pb-4'
        )}
      >
        {headerContent}
      </CardHeader>
      {children && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
};
