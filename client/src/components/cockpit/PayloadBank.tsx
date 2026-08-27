import React, { useState, useEffect } from 'react';
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
  BookOpen,
  Copy,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { PRESET_LIBRARY } from '@/lib/presetLibrary';

export const PayloadBank: React.FC = () => {
  const [templates, setTemplates] = useState<string[]>([]);
  const [testInput, setTestInput] = useState(
    '{Keren|Mantap|Luar biasa} {banget|sekali} {infonya|sharingnya|tweetnya}! 🔥 {Izin bookmark|Ditunggu part 2} ya.'
  );
  const [variations, setVariations] = useState<string[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_LIBRARY[0].id);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await apiClient.getTemplates();
      if (res.success && res.templates) {
        setTemplates(res.templates);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleAddTemplate = () => {
    setTemplates(['{Opsi 1|Opsi 2} pesan baru...', ...templates]);
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
    try {
      const res = await apiClient.saveTemplates(clean);
      if (res.success) {
        toast.success('Bank template global berhasil disimpan.');
      }
    } catch (err: any) {
      toast.error(`Gagal menyimpan: ${err.message}`);
    }
  };

  const handleTestSpintax = async () => {
    if (!testInput.trim()) return;
    try {
      const res = await apiClient.previewSpintax(testInput, 5);
      if (res.success && res.variations) {
        setVariations(res.variations);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const activePreset = PRESET_LIBRARY.find((p) => p.id === selectedPresetId) || PRESET_LIBRARY[0];

  const handleApplyPresetToStack = (templatesToApply: string[]) => {
    setTemplates([...templatesToApply, ...templates]);
    toast.success(
      `Menambahkan ${templatesToApply.length} template dari preset "${activePreset.name}" ke stack!`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top 2 Columns: Global Stack & Permutation Validator */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left Column: Global Template Stack */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <div className="font-mono text-[10px] font-bold tracking-wider text-flame">
                GLOBAL FALLBACK POOL
              </div>
              <CardTitle>Spintax Payload Stack</CardTitle>
              <CardDescription>
                Kumpulan komentar global yang digunakan jika node tidak memiliki file komentar
                khusus.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddTemplate}
              className="gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Row
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="max-h-[380px] space-y-2.5 overflow-y-auto pr-1">
              {templates.map((tmpl, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Textarea
                    rows={2}
                    value={tmpl}
                    onChange={(e) => handleUpdateTemplate(idx, e.target.value)}
                    className="font-mono text-xs"
                    placeholder="Format spintax {Opsi 1|Opsi 2}..."
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-9 px-2.5"
                    onClick={() => handleRemoveTemplate(idx)}
                    title="Hapus baris"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              className="w-full font-heading font-bold"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save Fallback Bank
            </Button>
          </CardContent>
        </Card>

        {/* Right Column: Interactive Spintax Tester */}
        <Card>
          <CardHeader className="pb-3">
            <div className="font-mono text-[10px] font-bold tracking-wider text-flame">
              SYNTAX VALIDATOR
            </div>
            <CardTitle>Spintax Permutation Tester</CardTitle>
            <CardDescription>
              Uji format spintax bersarang (*nested spintax*) dan lihat variasi kalimat yang
              dihasilkan Playwright engine.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold text-slate-300">
                SAMPLE SPINTAX INPUT
              </label>
              <Textarea
                rows={3}
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestSpintax}
              className="w-full gap-1.5 font-mono text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />⚡ Generate 5 Random Permutations
            </Button>

            {variations.length > 0 && (
              <div className="space-y-2 rounded-md border border-border/80 bg-obsidian-950 p-3.5">
                <div className="font-mono text-[11px] font-bold text-flame">GENERATED SAMPLES:</div>
                <ul className="list-disc space-y-1.5 pl-4 font-mono text-xs text-slate-200">
                  {variations.map((v, i) => (
                    <li key={i} className="leading-relaxed">
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Multi-Niche Curated Presets Library */}
      <Card className="border-amber-500/30 shadow-xl shadow-amber-950/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-amber-400">
              <BookOpen className="h-3.5 w-3.5" />
              CURATED TEMPLATE VAULT
            </div>
            <Badge
              variant="outline"
              className="border-amber-500/50 bg-amber-500/10 font-mono text-[9px] text-amber-300"
            >
              5 INDUSTRY NICHES AVAILABLE
            </Badge>
          </div>
          <CardTitle className="text-lg">Multi-Niche Spintax Library</CardTitle>
          <CardDescription>
            Pilih dan gunakan template spintax berdaya pikat tinggi yang telah dirancang khusus
            untuk Web3, AI, Developer, dan Komunitas Indonesia.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Niche Tabs */}
          <div className="flex flex-wrap gap-2">
            {PRESET_LIBRARY.map((preset) => {
              const isSelected = preset.id === selectedPresetId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 font-mono text-xs font-semibold transition-all ${
                    isSelected
                      ? 'border-amber-500/60 bg-amber-500/20 text-amber-200 shadow-md shadow-amber-500/10'
                      : 'border-slate-700/80 bg-obsidian-950/80 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  <span>{preset.name}</span>
                  <Badge
                    variant="outline"
                    className="border-current px-1 py-0 text-[9px] opacity-70"
                  >
                    {preset.templates.length}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Active Niche Content Display */}
          <div className="space-y-4 rounded-lg border border-border/80 bg-obsidian-950/90 p-4">
            <div className="flex flex-col items-start justify-between gap-3 border-b border-border/80 pb-3 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2 font-heading text-base font-bold text-white">
                  {activePreset.name}
                  <Badge variant="purple" className="font-mono text-[10px]">
                    {activePreset.badge}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{activePreset.description}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplyPresetToStack(activePreset.templates)}
                  className="gap-1.5 border-amber-500/40 font-mono text-xs text-amber-300 hover:bg-amber-500/10"
                >
                  <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
                  Apply All to Stack
                </Button>
              </div>
            </div>

            {/* List of Templates in this Niche */}
            <div className="space-y-2.5">
              {activePreset.templates.map((tmpl, idx) => (
                <div
                  key={idx}
                  className="group flex items-start justify-between gap-3 rounded-md border border-slate-800 bg-obsidian-900/80 p-3 transition-colors hover:border-slate-700"
                >
                  <div className="select-all font-mono text-xs leading-relaxed text-slate-200">
                    {tmpl}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 opacity-80 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        setTestInput(tmpl);
                        toast.info('Template dimuat ke Permutation Tester!');
                      }}
                      className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-amber-300"
                      title="Uji di tester"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(tmpl);
                        toast.success('Template disalin ke clipboard!');
                      }}
                      className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-emerald-400"
                      title="Salin template"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
