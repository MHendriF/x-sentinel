import React, { useState, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Save, Sparkles, Trash2, Sliders } from 'lucide-react';

export const PayloadBank: React.FC = () => {
  const [templates, setTemplates] = useState<string[]>([]);
  const [testInput, setTestInput] = useState('{Keren|Mantap|Luar biasa} {banget|sekali} {infonya|sharingnya|tweetnya}! 🔥 {Izin bookmark|Ditunggu part 2} ya.');
  const [variations, setVariations] = useState<string[]>([]);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Left Column: Global Template Stack */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div>
            <div className="font-mono text-[10px] font-bold text-flame tracking-wider">
              GLOBAL FALLBACK POOL
            </div>
            <CardTitle>Spintax Payload Stack</CardTitle>
            <CardDescription>
              Kumpulan komentar global yang digunakan jika node tidak memiliki file komentar khusus.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={handleAddTemplate} className="gap-1 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {templates.map((tmpl, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Textarea
                  rows={2}
                  value={tmpl}
                  onChange={(e) => handleUpdateTemplate(idx, e.target.value)}
                  className="text-xs font-mono"
                  placeholder="Format spintax {Opsi 1|Opsi 2}..."
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="px-2.5 h-9"
                  onClick={() => handleRemoveTemplate(idx)}
                  title="Hapus baris"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="default" size="sm" onClick={handleSave} className="w-full font-heading font-bold">
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Save Fallback Bank
          </Button>
        </CardContent>
      </Card>

      {/* Right Column: Interactive Spintax Tester */}
      <Card>
        <CardHeader className="pb-3">
          <div className="font-mono text-[10px] font-bold text-flame tracking-wider">
            SYNTAX VALIDATOR
          </div>
          <CardTitle>Spintax Permutation Tester</CardTitle>
          <CardDescription>
            Uji format spintax bersarang (*nested spintax*) dan lihat variasi kalimat yang dihasilkan Playwright engine.
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
              className="text-xs font-mono"
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleTestSpintax}
            className="w-full gap-1.5 font-mono text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            ⚡ Generate 5 Random Permutations
          </Button>

          {variations.length > 0 && (
            <div className="rounded-md border border-border/80 bg-obsidian-950 p-3.5 space-y-2">
              <div className="font-mono text-[11px] font-bold text-flame">
                GENERATED SAMPLES:
              </div>
              <ul className="space-y-1.5 text-xs text-slate-200 list-disc pl-4 font-mono">
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
  );
};
