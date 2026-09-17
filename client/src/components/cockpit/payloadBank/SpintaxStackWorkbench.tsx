import React, { useState, useMemo } from 'react';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Save,
  Sparkles,
  Trash2,
  Sliders,
  Check,
  Copy,
  AlertTriangle,
  Layers,
  Calculator,
} from 'lucide-react';

interface SpintaxStackWorkbenchProps {
  templates: string[];
  setTemplates: React.Dispatch<React.SetStateAction<string[]>>;
  testInput: string;
  setTestInput: React.Dispatch<React.SetStateAction<string>>;
}

export const SpintaxStackWorkbench: React.FC<SpintaxStackWorkbenchProps> = ({
  templates,
  setTemplates,
  testInput,
  setTestInput,
}) => {
  const [variations, setVariations] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Spintax Linter & Entropy Calculation
  const spintaxStats = useMemo(() => {
    const text = testInput || '';
    const openBraces = (text.match(/\{/g) || []).length;
    const closeBraces = (text.match(/\}/g) || []).length;
    const isBalanced = openBraces === closeBraces;

    // Extract group options /{([^{}]+)}/g
    const groups = text.match(/\{([^{}]+)\}/g) || [];
    let combinations = 1;

    if (groups.length > 0 && isBalanced) {
      for (const grp of groups) {
        // remove outer { and }
        const inner = grp.slice(1, -1);
        const options = inner.split('|').filter(Boolean);
        combinations *= Math.max(1, options.length);
      }
    } else {
      combinations = groups.length > 0 ? 0 : 1;
    }

    return {
      openBraces,
      closeBraces,
      isBalanced,
      groupCount: groups.length,
      combinations,
    };
  }, [testInput]);

  const handleAddTemplate = () => {
    setTemplates(['{Option 1|Option 2} new contextual message...', ...templates]);
  };

  const handleUpdateTemplate = (index: number, val: string) => {
    const updated = [...templates];
    updated[index] = val;
    setTemplates(updated);
  };

  const handleRemoveTemplate = (index: number) => {
    setTemplates(templates.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const clean = templates.map((t) => t.trim()).filter(Boolean);
    setIsSaving(true);
    try {
      const res = await apiClient.saveTemplates(clean);
      if (res.success) {
        toast.success(`Global template bank saved successfully (${clean.length} templates).`);
      } else {
        toast.error('Failed to save template bank.');
      }
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSpintax = async () => {
    if (!testInput.trim()) return;
    if (!spintaxStats.isBalanced) {
      toast.error('Cannot parse: Syntax error in spintax braces { }');
      return;
    }

    setIsTesting(true);
    try {
      const res = await apiClient.previewSpintax(testInput, 5);
      if (res.success && res.variations) {
        setVariations(res.variations);
        toast.success(`Generated ${res.variations.length} distinct permutations!`);
      } else {
        toast.error('Failed to evaluate spintax permutations.');
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyVariation = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success('Permutation copied!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left Column: Global Template Stack */}
        <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-flame">
                <Layers className="h-3.5 w-3.5" />
                GLOBAL FALLBACK POOL
              </div>
              <CardTitle className="text-base">Spintax Payload Stack</CardTitle>
              <CardDescription className="text-xs">
                Global comment templates utilized when a node has no dedicated comments JSON file.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddTemplate}
              className="gap-1 border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Row
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
              {templates.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No templates in global fallback bank yet. Add rows or apply presets from the Vault!
                </div>
              ) : (
                templates.map((tmpl, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="mt-2 font-mono text-[10px] text-slate-500">{idx + 1}.</span>
                    <Textarea
                      rows={2}
                      value={tmpl}
                      onChange={(e) => handleUpdateTemplate(idx, e.target.value)}
                      className="border-slate-800 bg-obsidian-950 font-mono text-xs text-slate-200 focus-visible:border-flame/50"
                      placeholder="Spintax format {Option 1|Option 2}..."
                    />
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 px-2"
                        onClick={() => handleRemoveTemplate(idx)}
                        title="Delete row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-slate-800 px-2 text-slate-400 hover:text-amber-300"
                        onClick={() => {
                          setTestInput(tmpl);
                          toast.info('Template loaded into Permutation Tester!');
                        }}
                        title="Test in tester"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-flame font-heading text-xs font-bold text-white hover:bg-flame/90"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {isSaving ? 'Saving Bank...' : `Save Fallback Bank (${templates.length} items)`}
            </Button>
          </CardContent>
        </Card>

        {/* Right Column: Interactive Spintax Tester & Entropy Linter */}
        <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-flame">
                <Sliders className="h-3.5 w-3.5" />
                SYNTAX &amp; ENTROPY VALIDATOR
              </div>
              <Badge
                variant="outline"
                className={`font-mono text-[9px] ${
                  spintaxStats.isBalanced
                    ? 'border-emerald-500/50 text-emerald-300'
                    : 'border-red-500/50 text-red-300'
                }`}
              >
                {spintaxStats.isBalanced ? '✓ SYNTAX OK' : '⚠ BRACE MISMATCH'}
              </Badge>
            </div>
            <CardTitle className="text-base">Spintax Permutation Tester</CardTitle>
            <CardDescription className="text-xs">
              Lint brace syntax, analyze variation entropy, and sample live outputs.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs font-bold text-slate-300">
                  SAMPLE SPINTAX PATTERN
                </label>
                <span className="font-mono text-[10px] text-slate-500">
                  {testInput.length} chars
                </span>
              </div>
              <Textarea
                rows={3}
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className={`font-mono text-xs text-slate-200 focus-visible:border-flame/50 ${
                  !spintaxStats.isBalanced
                    ? 'border-red-500/70 bg-red-950/20'
                    : 'border-slate-800 bg-obsidian-950'
                }`}
              />
            </div>

            {/* Linter & Capacity Barometer */}
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-obsidian-950 p-2.5 sm:grid-cols-3">
              <div className="space-y-0.5">
                <span className="font-mono text-[9px] uppercase text-slate-500">Syntax Check</span>
                <div className="flex items-center gap-1 font-mono text-xs font-semibold">
                  {spintaxStats.isBalanced ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Check className="h-3 w-3" /> Balanced
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-400">
                      <AlertTriangle className="h-3 w-3" /> {spintaxStats.openBraces} open vs{' '}
                      {spintaxStats.closeBraces} close
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="font-mono text-[9px] uppercase text-slate-500">
                  Variable Slots
                </span>
                <div className="font-mono text-xs font-semibold text-amber-300">
                  {spintaxStats.groupCount} slots
                </div>
              </div>

              <div className="col-span-2 space-y-0.5 sm:col-span-1">
                <span className="font-mono text-[9px] uppercase text-slate-500">Total Entropy</span>
                <div className="flex items-center gap-1 font-mono text-xs font-bold text-flame">
                  <Calculator className="h-3 w-3" />
                  {spintaxStats.isBalanced
                    ? `${spintaxStats.combinations.toLocaleString()} variations`
                    : 'N/A'}
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestSpintax}
              disabled={isTesting || !testInput.trim() || !spintaxStats.isBalanced}
              className="w-full gap-1.5 border border-slate-700 bg-obsidian-800 font-mono text-xs text-white hover:bg-slate-700"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              {isTesting ? 'Generating Permutations...' : '⚡ Sample 5 Live Variations'}
            </Button>

            {variations.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border/80 bg-obsidian-950 p-3">
                <div className="flex items-center justify-between font-mono text-[10px] font-bold text-flame">
                  <span>GENERATED SAMPLES:</span>
                  <span className="text-slate-400">{variations.length} sampled</span>
                </div>
                <div className="space-y-1.5">
                  {variations.map((v, i) => (
                    <div
                      key={i}
                      className="group flex items-start justify-between gap-2 rounded border border-slate-800/80 bg-obsidian-900/80 p-2 text-xs font-mono text-slate-200 hover:border-slate-700"
                    >
                      <span className="flex-1 leading-relaxed">{v}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyVariation(v, i)}
                        className="opacity-70 transition-opacity hover:opacity-100"
                        title="Copy variation"
                      >
                        {copiedIndex === i ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-white" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
