import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Download,
  FileJson,
  Layers,
  Bot,
  RefreshCw,
  Send,
  FileCode,
  FolderOpen,
  Check,
  Zap,
} from 'lucide-react';
import { PRESET_LIBRARY } from '@/lib/presetLibrary';

const SAMPLE_POSTS = [
  {
    label: '🤖 AI Model Inflection',
    text: 'Open-source models are closing the frontier gap faster than incumbents expected. The bottleneck is no longer the foundational model, it is proprietary data pipelines, agentic harness, and distribution velocity.',
  },
  {
    label: '⚡ Solana / High TPS',
    text: 'Solana DEX volume outpacing Ethereum mainnet for three consecutive weeks is not a glitch. When execution throughput matches user experience, capital stays onchain instead of bridging back.',
  },
  {
    label: '🛠️ SaaS / Indie Hacker',
    text: 'Bootstrapped to $25k MRR in 6 months by doing the unscalable thing: DMing 50 active users every single week and shipping their exact feature requests within 48 hours. Velocity beats polish every single time.',
  },
  {
    label: '🇮🇩 Indo Web3 Community',
    text: 'Fenomena airdrop hunter di Indonesia makin selektif. Komunitas lokal sekarang lebih paham analisis on-chain dan tokenomics daripada sekadar asal klik task bot telegram. Edukasi mulai berbuah hasil.',
  },
];

const TONE_OPTIONS = [
  {
    id: 'peer_native',
    label: '⚡ Crypto / Tech Native Peer',
    desc: 'Sharp, authentic, insightful peer tone. Zero generic sycophancy.',
  },
  {
    id: 'indo_community',
    label: '🇮🇩 Indo Tech Community',
    desc: 'Casual, conversational Indonesian crypto/tech niche style (Bahasa Indonesia).',
  },
  {
    id: 'contrarian',
    label: '🔍 Contrarian & Debate',
    desc: 'Critical, analytical, highlighting hidden trade-offs and operational risks.',
  },
  {
    id: 'builder_raw',
    label: '🛠️ Builder Raw / Dev',
    desc: 'Focus on architecture, developer tooling, and production reality.',
  },
  {
    id: 'short_punchy',
    label: '🎯 Short & Punchy',
    desc: '8-15 words per reply, razor-sharp, zero filler.',
  },
];

export const PayloadBank: React.FC = () => {
  const { accounts, settings, loadAccounts } = useStore();

  const [activeTab, setActiveTab] = useState<'generator' | 'spintax' | 'vault'>('generator');

  // Generator states
  const [postText, setPostText] = useState(SAMPLE_POSTS[0].text);
  const [replyCount, setReplyCount] = useState<number>(15);
  const [selectedTone, setSelectedTone] = useState<string>('peer_native');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [customInstruction, setCustomInstruction] = useState<string>(
    'Create 15 reply from this post without any double quotes, make not see like AI Slop then save in json file.'
  );
  const [isCustomInstructionOpen, setIsCustomInstructionOpen] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReplies, setGeneratedReplies] = useState<string[]>([]);
  const [providerUsed, setProviderUsed] = useState<string | null>(null);
  const [isFallbackUsed, setIsFallbackUsed] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Save Modal States
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveFileName, setSaveFileName] = useState('post_replies_15.json');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [saveToTemplates, setSaveToTemplates] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);

  // Spintax & Templates states (Tab 2)
  const [templates, setTemplates] = useState<string[]>([]);
  const [testInput, setTestInput] = useState(
    '{Great|Superb|Impressive} {insights|analysis|take}! 🔥 {Bookmarked|Looking forward to part 2}.'
  );
  const [variations, setVariations] = useState<string[]>([]);

  // Vault / Presets states (Tab 3)
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_LIBRARY[0].id);
  const [savedFiles, setSavedFiles] = useState<
    Array<{
      fileName: string;
      filePath: string;
      count: number;
      sizeBytes: number;
      updatedAt: string;
    }>
  >([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadSavedFiles();
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

  const loadSavedFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const res = await apiClient.getPayloadFiles();
      if (res.success && res.files) {
        setSavedFiles(res.files);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Update default instruction when reply count changes
  const handleCountChange = (count: number) => {
    setReplyCount(count);
    setSaveFileName(`post_replies_${count}.json`);
    setCustomInstruction(
      `Create ${count} reply from this post without any double quotes, make not see like AI Slop then save in json file.`
    );
  };

  // Generate replies handler
  const handleGenerateReplies = async () => {
    if (!postText.trim()) {
      toast.error('Please enter the target post content first.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await apiClient.generatePayloadReplies({
        postText: postText.trim(),
        count: replyCount,
        tone: selectedTone,
        language: selectedLanguage,
        customInstruction: customInstruction.trim(),
      });

      if (res.success && res.replies && res.replies.length > 0) {
        setGeneratedReplies(res.replies);
        setProviderUsed(res.provider || 'AI Engine');
        setIsFallbackUsed(Boolean(res.isFallback));
        toast.success(
          `Successfully generated ${res.replies.length} payload replies without double quotes!`,
          {
            description: res.isFallback
              ? 'Anti-slop template fallback mode active.'
              : `Generated via ${res.provider}`,
          }
        );
      } else {
        toast.error(res.message || 'Failed to generate payload replies.');
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy single reply
  const handleCopyReply = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success('Reply copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Copy all as JSON array
  const handleCopyAllAsJson = () => {
    if (generatedReplies.length === 0) return;
    const jsonStr = JSON.stringify(generatedReplies, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedAll(true);
    toast.success(`Successfully copied JSON array (${generatedReplies.length} replies)!`);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Download direct JSON file to browser
  const handleDownloadJson = () => {
    if (generatedReplies.length === 0) return;
    const jsonStr = JSON.stringify(generatedReplies, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', saveFileName || 'replies_15.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`File ${saveFileName || 'replies_15.json'} downloaded successfully!`);
  };

  // Edit single generated reply inline
  const handleUpdateGeneratedReply = (index: number, val: string) => {
    const updated = [...generatedReplies];
    // Strip double quotes if user inadvertently types them
    updated[index] = val.replace(/["“”]/g, '');
    setGeneratedReplies(updated);
  };

  const handleRemoveGeneratedReply = (index: number) => {
    setGeneratedReplies(generatedReplies.filter((_, i) => i !== index));
  };

  const handleAddGeneratedReply = () => {
    setGeneratedReplies([...generatedReplies, 'Interesting point that is rarely discussed on the timeline.']);
  };

  // Save to Server JSON File
  const handleSavePayloadFile = async () => {
    if (generatedReplies.length === 0) {
      toast.error('No replies generated yet.');
      return;
    }
    if (!saveFileName.trim()) {
      toast.error('File name is required.');
      return;
    }

    setIsSavingFile(true);
    try {
      const res = await apiClient.savePayloadFile({
        fileName: saveFileName.trim(),
        replies: generatedReplies,
        targetAccountId: targetAccountId || undefined,
        saveToTemplates: saveToTemplates,
      });

      if (res.success) {
        toast.success(res.message || `File ${res.fileName} saved successfully!`);
        setIsSaveModalOpen(false);
        loadSavedFiles();
        if (targetAccountId) loadAccounts();
      } else {
        toast.error(res.message || 'Failed to save file.');
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSavingFile(false);
    }
  };

  // Apply directly to an account
  const handleDeployToAccount = async (accountId: string) => {
    if (!accountId || generatedReplies.length === 0) return;
    try {
      const res = await apiClient.saveAccountComments(accountId, generatedReplies);
      if (res.success) {
        const targetAcc = accounts.find((a) => a.id === accountId);
        toast.success(
          `Payload (${generatedReplies.length} replies) successfully deployed to @${targetAcc?.username || targetAcc?.label}!`
        );
        loadAccounts();
      }
    } catch (err: any) {
      toast.error(`Failed to deploy to account: ${err.message}`);
    }
  };

  // Tab 2 handlers
  const handleAddTemplate = () => {
    setTemplates(['{Option 1|Option 2} new message...', ...templates]);
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
        toast.success('Global template bank saved successfully.');
      }
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
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
      `Added ${templatesToApply.length} templates from preset "${activePreset.name}" to stack!`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-flame">
            <Zap className="h-3.5 w-3.5" />
            PAYLOAD STUDIO & ENGINE
          </div>
          <h1 id="page-heading" className="font-heading text-2xl font-bold text-white">
            Payload Bank &amp; AI Reply Generator
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Generate contextual replies from target posts without double quotes and free from AI slop, then save to JSON.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-obsidian-950/80 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
              activeTab === 'generator'
                ? 'bg-flame text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Generator
            <span className="py-0.2 rounded bg-black/30 px-1 text-[9px]">from Post</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('spintax')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
              activeTab === 'spintax'
                ? 'bg-slate-800 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Spintax Stack
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('vault');
              loadSavedFiles();
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
              activeTab === 'vault'
                ? 'bg-slate-800 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Vault &amp; JSON Files
            <span className="py-0.2 rounded bg-black/30 px-1 text-[9px] text-muted-foreground">
              {savedFiles.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AI REPLY PAYLOAD GENERATOR (FROM POST) */}
      {/* ========================================================================= */}
      {activeTab === 'generator' && (
        <div className="space-y-6">
          {/* Main Workbench: 2-Column or Stack */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column (Input & Directives): 5 cols */}
            <div className="space-y-5 lg:col-span-5">
              <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-[10px] font-bold tracking-wider text-flame">
                      FOCAL POST INPUT
                    </div>
                    <Badge
                      variant="outline"
                      className="border-slate-700 bg-obsidian-950 font-mono text-[9px] text-slate-300"
                    >
                      ANTI-AI-SLOP v2
                    </Badge>
                  </div>
                  <CardTitle className="text-base">Target Tweet / Focal Post</CardTitle>
                  <CardDescription>
                    Enter the target post content you want the fleet nodes to reply to.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Quick sample pills */}
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] font-bold tracking-wider text-slate-400">
                      QUICK SAMPLES:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {SAMPLE_POSTS.map((sample, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPostText(sample.text)}
                          className="rounded border border-slate-800 bg-obsidian-950 px-2 py-1 font-mono text-[10px] text-slate-300 transition-colors hover:border-flame/50 hover:bg-flame/10 hover:text-white"
                        >
                          {sample.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Post Textarea */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-mono text-xs font-bold text-slate-200">
                        POST CONTENT
                      </label>
                      <span className="font-mono text-[10px] text-slate-500">
                        {postText.length} chars
                      </span>
                    </div>
                    <Textarea
                      rows={5}
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      placeholder="Paste tweet text or topic here... Post: ..."
                      className="font-mono text-xs leading-relaxed"
                    />
                  </div>

                  {/* Reply Count Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-mono text-xs font-bold text-slate-200">
                        REPLY COUNT
                      </label>
                      <span className="font-mono text-xs font-bold text-flame">
                        {replyCount} replies
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {[5, 10, 15, 20, 25, 30].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => handleCountChange(cnt)}
                          className={`rounded border py-1.5 font-mono text-xs font-bold transition-all ${
                            replyCount === cnt
                              ? 'border-flame bg-flame/20 text-white shadow-sm'
                              : 'border-slate-800 bg-obsidian-950 text-slate-400 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone Preset */}
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs font-bold text-slate-200">
                      PERSPECTIVE &amp; TONE STYLE
                    </label>
                    <div className="space-y-1.5">
                      {TONE_OPTIONS.map((t) => (
                        <label
                          key={t.id}
                          className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-xs transition-all ${
                            selectedTone === t.id
                              ? 'border-flame/60 bg-flame/10 text-white'
                              : 'border-slate-800 bg-obsidian-950 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="tone"
                            checked={selectedTone === t.id}
                            onChange={() => setSelectedTone(t.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-white">{t.label}</div>
                            <div className="text-[10px] text-slate-400">{t.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Language Selector */}
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs font-bold text-slate-200">
                      OUTPUT LANGUAGE
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'auto', label: '🌐 Auto' },
                        { id: 'en', label: '🇺🇸 English' },
                        { id: 'id', label: '🇮🇩 Indonesia' },
                      ].map((lang) => (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => setSelectedLanguage(lang.id)}
                          className={`rounded border py-1.5 font-mono text-xs font-medium transition-all ${
                            selectedLanguage === lang.id
                              ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                              : 'border-slate-800 bg-obsidian-950 text-slate-400 hover:text-white'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Collapsible Prompt Directive */}
                  <div className="rounded-md border border-border/80 bg-obsidian-950 p-2.5">
                    <button
                      type="button"
                      onClick={() => setIsCustomInstructionOpen(!isCustomInstructionOpen)}
                      className="flex w-full items-center justify-between text-left font-mono text-[11px] font-bold text-slate-300"
                    >
                      <span className="flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-amber-400" />
                        AI Prompt Instruction Pattern
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {isCustomInstructionOpen ? 'Close' : 'Customize'}
                      </span>
                    </button>

                    {isCustomInstructionOpen && (
                      <div className="mt-2 space-y-1.5 border-t border-border/60 pt-2">
                        <Textarea
                          rows={2}
                          value={customInstruction}
                          onChange={(e) => setCustomInstruction(e.target.value)}
                          className="font-mono text-[11px]"
                          placeholder="Create 15 reply from this post without any double quotes, make not see like AI Slop then save in json file."
                        />
                        <p className="font-mono text-[9px] text-slate-500">
                          System instruction passed to LLM. Double quotes are rigorously sanitized.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Main Generate Button */}
                  <Button
                    type="button"
                    onClick={handleGenerateReplies}
                    disabled={isGenerating || !postText.trim()}
                    className="w-full gap-2 bg-gradient-to-r from-flame to-amber-500 py-2.5 font-heading text-sm font-bold text-white shadow-lg shadow-flame/20 transition-all hover:brightness-110"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generating {replyCount} Replies...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate {replyCount} Replies
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column (Generated Results Workbench): 7 cols */}
            <div className="space-y-5 lg:col-span-7">
              <Card className="flex h-full flex-col border-border/80 bg-obsidian-900/90 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <div>
                    <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-flame">
                      <FileJson className="h-3.5 w-3.5" />
                      GENERATED PAYLOAD WORKBENCH
                    </div>
                    <CardTitle className="text-base">
                      {generatedReplies.length > 0
                        ? `${generatedReplies.length} Replies Ready`
                        : 'Generated Payload Results'}
                    </CardTitle>
                    <CardDescription>
                      {providerUsed ? (
                        <span>
                          Generated by <code className="text-amber-300">{providerUsed}</code>
                          {isFallbackUsed && ' (Fallback Mode)'}
                        </span>
                      ) : (
                        'Generated replies will appear below with all double quotes stripped.'
                      )}
                    </CardDescription>
                  </div>

                  {/* Toolbar Actions if replies exist */}
                  {generatedReplies.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddGeneratedReply}
                        className="h-8 gap-1 text-xs"
                        title="Add row manually"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Row
                      </Button>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="flex flex-1 flex-col justify-between space-y-4">
                  {/* Empty state */}
                  {generatedReplies.length === 0 && !isGenerating && (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-obsidian-950/60 p-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-obsidian-800 text-slate-400">
                        <Sparkles className="h-6 w-6 text-amber-400" />
                      </div>
                      <h3 className="mt-3 font-heading text-sm font-bold text-white">
                        No Replies Generated Yet
                      </h3>
                      <p className="mt-1 max-w-sm text-xs text-slate-400">
                        Click the &quot;Generate {replyCount} Replies&quot; button to craft human-grade
                        contextual replies from the focal post.
                      </p>
                    </div>
                  )}

                  {/* Loading placeholder skeleton */}
                  {isGenerating && (
                    <div className="flex flex-1 flex-col items-center justify-center space-y-3 rounded-lg border border-dashed border-flame/30 bg-obsidian-950/60 p-8 text-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-flame" />
                      <div className="font-heading text-sm font-bold text-white">
                        AI is Crafting {replyCount} Replies...
                      </div>
                      <p className="max-w-xs text-xs text-slate-400">
                        Enforcing anti-AI slop guidelines, single-sentence constraint, and strict double-quote elimination.
                      </p>
                    </div>
                  )}

                  {/* Generated replies list */}
                  {generatedReplies.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                        {generatedReplies.map((reply, idx) => (
                          <div
                            key={idx}
                            className="group flex items-start gap-2 rounded-md border border-slate-800 bg-obsidian-950/90 p-2.5 transition-colors hover:border-slate-700"
                          >
                            <span className="flex h-5 w-5 shrink-0 select-none items-center justify-center rounded bg-slate-800 font-mono text-[10px] font-bold text-amber-400">
                              {idx + 1}
                            </span>

                            <div className="flex-1 space-y-1">
                              <Textarea
                                rows={2}
                                value={reply}
                                onChange={(e) => handleUpdateGeneratedReply(idx, e.target.value)}
                                className="border-0 bg-transparent p-0 font-mono text-xs leading-relaxed text-slate-200 focus-visible:ring-0"
                              />
                              <div className="flex items-center justify-between font-mono text-[9px] text-slate-500">
                                <span>{reply.length} chars</span>
                                <span className="text-emerald-400/80">✓ No double quotes</span>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1 opacity-75 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => handleCopyReply(reply, idx)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-emerald-400"
                                title="Copy this reply"
                              >
                                {copiedIndex === idx ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveGeneratedReply(idx)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                                title="Delete reply"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Action Bar (Download, Save, Copy JSON, Deploy) */}
                      <div className="space-y-2 border-t border-border/70 pt-3">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {/* 1. Save as JSON file to server */}
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setIsSaveModalOpen(true)}
                            className="gap-1.5 font-heading text-xs font-bold"
                          >
                            <Save className="h-3.5 w-3.5" />
                            Save as .JSON
                          </Button>

                          {/* 2. Download JSON */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDownloadJson}
                            className="gap-1.5 border-slate-700 font-mono text-xs hover:border-slate-600"
                          >
                            <Download className="h-3.5 w-3.5 text-blue-400" />
                            Download
                          </Button>

                          {/* 3. Copy JSON array */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCopyAllAsJson}
                            className="gap-1.5 border-slate-700 font-mono text-xs hover:border-slate-600"
                          >
                            {copiedAll ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-emerald-400" />
                            )}
                            Copy JSON
                          </Button>

                          {/* 4. View raw JSON */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowRawJson(!showRawJson)}
                            className="gap-1.5 border-slate-700 font-mono text-xs hover:border-slate-600"
                          >
                            <FileCode className="h-3.5 w-3.5 text-purple-400" />
                            {showRawJson ? 'Hide Code' : 'Raw JSON'}
                          </Button>
                        </div>

                        {/* Quick Deploy to Node account select */}
                        {accounts.length > 0 && (
                          <div className="flex flex-col items-start justify-between gap-2 rounded-md border border-slate-800 bg-obsidian-950 p-2.5 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-2">
                              <Layers className="h-4 w-4 text-flame" />
                              <span className="font-mono text-xs font-semibold text-slate-300">
                                Deploy to Fleet Node:
                              </span>
                            </div>

                            <div className="flex w-full items-center gap-2 sm:w-auto">
                              <select
                                className="w-full rounded border border-slate-700 bg-obsidian-900 px-2 py-1 font-mono text-xs text-slate-200 focus:outline-none sm:w-48"
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleDeployToAccount(e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                defaultValue=""
                              >
                                <option value="" disabled>
                                  Select Node Account...
                                </option>
                                {accounts.map((acc) => (
                                  <option key={acc.id} value={acc.id}>
                                    @{acc.username || acc.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Raw JSON Code view toggle */}
                        {showRawJson && (
                          <div className="space-y-1 rounded-md border border-slate-800 bg-obsidian-950 p-3">
                            <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                              <span>RAW JSON ARRAY OUTPUT</span>
                              <span className="text-emerald-400">application/json</span>
                            </div>
                            <pre className="max-h-48 overflow-x-auto overflow-y-auto rounded bg-obsidian-900 p-2.5 font-mono text-[11px] text-amber-200">
                              {JSON.stringify(generatedReplies, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SPINTAX STACK & VALIDATOR (PRESERVED & UPGRADED) */}
      {/* ========================================================================= */}
      {activeTab === 'spintax' && (
        <div className="space-y-6">
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
                    Global comment pool utilized when a node does not have dedicated comment files.
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
                        placeholder="Spintax format {Option 1|Option 2}..."
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-9 px-2.5"
                        onClick={() => handleRemoveTemplate(idx)}
                        title="Delete row"
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
                  Test nested spintax formatting and preview output variations produced by the engine.
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
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />⚡ Generate 5 Random
                  Permutations
                </Button>

                {variations.length > 0 && (
                  <div className="space-y-2 rounded-md border border-border/80 bg-obsidian-950 p-3.5">
                    <div className="font-mono text-[11px] font-bold text-flame">
                      GENERATED SAMPLES:
                    </div>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VAULT & SAVED JSON FILES */}
      {/* ========================================================================= */}
      {activeTab === 'vault' && (
        <div className="space-y-6">
          {/* Server Files List Card */}
          <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-amber-400">
                  <FolderOpen className="h-3.5 w-3.5" />
                  SERVER PAYLOAD FILES
                </div>
                <CardTitle className="text-base">JSON Files in comments/ Directory</CardTitle>
                <CardDescription>
                  All payload files saved under <code>data/comments/*.json</code>
                </CardDescription>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={loadSavedFiles}
                disabled={isLoadingFiles}
                className="gap-1.5 font-mono text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>

            <CardContent>
              {savedFiles.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No .json files saved in <code>data/comments/</code> yet. Generate new files
                  via the AI Generator tab!
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {savedFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="group flex flex-col justify-between rounded-lg border border-slate-800 bg-obsidian-950 p-3.5 transition-colors hover:border-slate-700"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-amber-300">
                            {f.fileName}
                          </span>
                          <Badge variant="outline" className="font-mono text-[9px]">
                            {f.count} items
                          </Badge>
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-slate-500">
                          {Math.round(f.sizeBytes / 1024)} KB · {f.filePath}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-slate-800/80 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(f.filePath);
                            toast.success(`Path copied: ${f.filePath}`);
                          }}
                          className="rounded px-2 py-1 font-mono text-[10px] text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                          Copy Path
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Curated Niche Presets Library */}
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
                Select and deploy high-engagement spintax templates designed for Web3, AI, Developers, and Community trends.
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
                            setActiveTab('spintax');
                            toast.info('Template loaded into Permutation Tester!');
                          }}
                          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-amber-300"
                          title="Test in tester"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(tmpl);
                            toast.success('Template copied to clipboard!');
                          }}
                          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-emerald-400"
                          title="Copy template"
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
      )}

      {/* ========================================================================= */}
      {/* MODAL: SAVE AS .JSON FILE */}
      {/* ========================================================================= */}
      <Dialog open={isSaveModalOpen} onOpenChange={(open) => !open && setIsSaveModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-flame">
              <Save className="h-3.5 w-3.5" />
              SAVE PAYLOAD TO FILE
            </div>
            <DialogTitle>Save as .JSON File</DialogTitle>
            <DialogDescription>
              Save {generatedReplies.length} replies into the{' '}
              <code className="text-amber-300">data/comments/</code> directory
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* File Name */}
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-semibold text-slate-200">FILE NAME</label>
              <Input
                value={saveFileName}
                onChange={(e) => setSaveFileName(e.target.value)}
                placeholder="e.g. post_replies_15.json"
                className="font-mono text-xs"
              />
              <span className="font-mono text-[10px] text-slate-500">
                Automatically saved to: <code>data/comments/{saveFileName || '*.json'}</code>
              </span>
            </div>

            {/* Target Account Linkage */}
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-semibold text-slate-200">
                LINK TO FLEET NODE (OPTIONAL)
              </label>
              <select
                className="w-full rounded border border-slate-700 bg-obsidian-950 p-2 font-mono text-xs text-slate-200 focus:outline-none"
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
              >
                <option value="">-- Do not link (Save file only) --</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.label} (@{acc.username || 'user'})
                  </option>
                ))}
              </select>
            </div>

            {/* Global Templates Checkbox */}
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-800 bg-obsidian-950 p-2.5 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={saveToTemplates}
                onChange={(e) => setSaveToTemplates(e.target.checked)}
                className="rounded border-slate-700"
              />
              <span>Also apply to Global Fallback Stack (templates.json)</span>
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSavePayloadFile}
              disabled={isSavingFile}
              className="gap-1.5 font-heading font-bold"
            >
              <Save className="h-3.5 w-3.5" />
              {isSavingFile ? 'Saving...' : 'Save File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
