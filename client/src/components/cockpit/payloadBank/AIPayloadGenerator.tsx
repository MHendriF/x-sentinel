import React, { useState } from 'react';
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
  Copy,
  Download,
  FileJson,
  Layers,
  Bot,
  RefreshCw,
  FileCode,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { SavePayloadModal } from './SavePayloadModal';

export const SAMPLE_POSTS = [
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

export const TONE_OPTIONS = [
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

interface AccountOption {
  id: string;
  label?: string;
  username?: string;
}

interface AIPayloadGeneratorProps {
  accounts: AccountOption[];
  loadAccounts: () => void;
  onSavedSuccess?: () => void;
}

export const AIPayloadGenerator: React.FC<AIPayloadGeneratorProps> = ({
  accounts,
  loadAccounts,
  onSavedSuccess,
}) => {
  // Generator form states
  const [postText, setPostText] = useState(SAMPLE_POSTS[0].text);
  const [replyCount, setReplyCount] = useState<number>(15);
  const [selectedTone, setSelectedTone] = useState<string>('peer_native');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [customInstruction, setCustomInstruction] = useState<string>(
    'Create 15 reply from this post without any double quotes, make not see like AI Slop then save in json file.'
  );
  const [isCustomInstructionOpen, setIsCustomInstructionOpen] = useState(false);

  // Execution states
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [generatedReplies, setGeneratedReplies] = useState<string[]>([]);
  const [providerUsed, setProviderUsed] = useState<string | null>(null);
  const [isFallbackUsed, setIsFallbackUsed] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Save Modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const handleCountChange = (count: number) => {
    setReplyCount(count);
    setCustomInstruction(
      `Create ${count} reply from this post without any double quotes, make not see like AI Slop then save in json file.`
    );
  };

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
        // Clean double quotes
        const cleaned = res.replies.map((r: string) => r.replace(/["“”]/g, '').trim());
        setGeneratedReplies(cleaned);
        setProviderUsed(res.provider || 'AI Engine');
        setIsFallbackUsed(Boolean(res.isFallback));
        toast.success(
          `Successfully generated ${cleaned.length} payload replies without double quotes!`,
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

  // Regenerate single row
  const handleRegenerateSingleRow = async (index: number) => {
    if (!postText.trim()) {
      toast.error('Target post content is required to regenerate.');
      return;
    }

    setRegeneratingIndex(index);
    try {
      const res = await apiClient.generatePayloadReplies({
        postText: postText.trim(),
        count: 1,
        tone: selectedTone,
        language: selectedLanguage,
        customInstruction: `Regenerate 1 fresh authentic alternative reply for this post. Strictly no double quotes, no AI slop. Single sentence.`,
      });

      if (res.success && res.replies && res.replies.length > 0) {
        const freshReply = res.replies[0].replace(/["“”]/g, '').trim();
        const updated = [...generatedReplies];
        updated[index] = freshReply;
        setGeneratedReplies(updated);
        toast.success(`Row #${index + 1} regenerated!`);
      } else {
        toast.error(res.message || 'Failed to regenerate reply.');
      }
    } catch (err: any) {
      toast.error(`Regenerate failed: ${err.message}`);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // Sanitize all replies (strip quotes, trim, double-space elimination)
  const handleSanitizeAll = () => {
    if (generatedReplies.length === 0) return;
    const sanitized = generatedReplies.map((r) =>
      r.replace(/["“”]/g, '').replace(/\s+/g, ' ').trim()
    );
    setGeneratedReplies(sanitized);
    toast.success('All replies sanitized: double quotes and extra spaces eliminated!');
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
    toast.success(`Copied JSON array (${generatedReplies.length} replies)!`);
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
    const downloadName = `post_replies_${generatedReplies.length}.json`;
    link.setAttribute('download', downloadName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`File ${downloadName} downloaded successfully!`);
  };

  const handleUpdateGeneratedReply = (index: number, val: string) => {
    const updated = [...generatedReplies];
    updated[index] = val.replace(/["“”]/g, '');
    setGeneratedReplies(updated);
  };

  const handleRemoveGeneratedReply = (index: number) => {
    setGeneratedReplies(generatedReplies.filter((_, i) => i !== index));
  };

  const handleAddGeneratedReply = () => {
    setGeneratedReplies([
      ...generatedReplies,
      'Interesting perspective that is rarely discussed on the timeline.',
    ]);
  };

  const handleDeployToAccount = async (accountId: string) => {
    if (!accountId || generatedReplies.length === 0) return;
    try {
      const res = await apiClient.saveAccountComments(accountId, generatedReplies);
      if (res.success) {
        const targetAcc = accounts.find((a) => a.id === accountId);
        toast.success(
          `Payload (${generatedReplies.length} replies) deployed to @${
            targetAcc?.username || targetAcc?.label
          }!`
        );
        loadAccounts();
      }
    } catch (err: any) {
      toast.error(`Failed to deploy to account: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
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
                Enter target post content to guide fleet node reply generation.
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
                  className="border-slate-800 bg-obsidian-950 font-mono text-xs leading-relaxed text-slate-200 focus-visible:border-flame/50"
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
                        className="mt-0.5 text-flame"
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
                      className="border-slate-800 bg-obsidian-900 font-mono text-[11px] text-slate-200"
                      placeholder="Create 15 reply from this post without any double quotes, make not see like AI Slop then save in json file."
                    />
                    <p className="font-mono text-[9px] text-slate-500">
                      System instruction passed to LLM. Quotes and sycophantic greetings will be stripped.
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
                      Engine: <code className="text-amber-300">{providerUsed}</code>
                      {isFallbackUsed && ' (Fallback Mode)'}
                    </span>
                  ) : (
                    'Generated replies will appear below with double quotes and slop eliminated.'
                  )}
                </CardDescription>
              </div>

              {/* Action buttons if replies exist */}
              {generatedReplies.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSanitizeAll}
                    className="h-8 gap-1 border-emerald-500/40 font-mono text-xs text-emerald-400 hover:bg-emerald-500/10"
                    title="Sanitize double quotes and whitespace across all rows"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Sanitize All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddGeneratedReply}
                    className="h-8 gap-1 border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
                    title="Add manual row"
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
                    Click &quot;Generate {replyCount} Replies&quot; to craft contextual, high-signal
                    replies tailored to the focal post.
                  </p>
                </div>
              )}

              {/* Loading placeholder */}
              {isGenerating && (
                <div className="flex flex-1 flex-col items-center justify-center space-y-3 rounded-lg border border-dashed border-flame/30 bg-obsidian-950/60 p-8 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-flame" />
                  <div className="font-heading text-sm font-bold text-white">
                    AI Crafting {replyCount} Replies...
                  </div>
                  <p className="max-w-xs text-xs text-slate-400">
                    Enforcing anti-AI slop protocols, natural peer syntax, and strict quote stripping.
                  </p>
                </div>
              )}

              {/* Generated replies list */}
              {generatedReplies.length > 0 && (
                <div className="space-y-2.5">
                  <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                    {generatedReplies.map((reply, idx) => {
                      const charCount = reply.length;
                      const isNearLimit = charCount > 240 && charCount <= 280;
                      const isOverLimit = charCount > 280;

                      return (
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
                            <div className="flex items-center justify-between font-mono text-[9px]">
                              <span
                                className={`font-semibold ${
                                  isOverLimit
                                    ? 'text-red-400'
                                    : isNearLimit
                                    ? 'text-amber-400'
                                    : 'text-slate-500'
                                }`}
                              >
                                {charCount}/280 chars {isOverLimit && '(Exceeds Tweet limit)'}
                              </span>
                              <span className="text-emerald-400/80">✓ Quote-free</span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1 opacity-75 transition-opacity group-hover:opacity-100">
                            {/* Single Row Regenerate */}
                            <button
                              type="button"
                              onClick={() => handleRegenerateSingleRow(idx)}
                              disabled={regeneratingIndex === idx}
                              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-flame"
                              title="Regenerate this single reply"
                            >
                              <RefreshCw
                                className={`h-3.5 w-3.5 ${
                                  regeneratingIndex === idx ? 'animate-spin text-flame' : ''
                                }`}
                              />
                            </button>

                            {/* Copy Row */}
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

                            {/* Delete Row */}
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
                      );
                    })}
                  </div>

                  {/* Action Bar (Download, Save, Copy JSON, Deploy) */}
                  <div className="space-y-2 border-t border-border/70 pt-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {/* 1. Save as JSON file to server */}
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setIsSaveModalOpen(true)}
                        className="gap-1.5 bg-flame font-heading text-xs font-bold text-white hover:bg-flame/90"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save as .JSON
                      </Button>

                      {/* 2. Download JSON */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadJson}
                        className="gap-1.5 border-slate-700 font-mono text-xs text-slate-300 hover:border-slate-600 hover:bg-slate-800"
                      >
                        <Download className="h-3.5 w-3.5 text-blue-400" />
                        Download
                      </Button>

                      {/* 3. Copy JSON array */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyAllAsJson}
                        className="gap-1.5 border-slate-700 font-mono text-xs text-slate-300 hover:border-slate-600 hover:bg-slate-800"
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
                        className="gap-1.5 border-slate-700 font-mono text-xs text-slate-300 hover:border-slate-600 hover:bg-slate-800"
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
                                @{acc.username || acc.label || acc.id}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Raw JSON Code view */}
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

      {/* Save Modal */}
      <SavePayloadModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        replies={generatedReplies}
        accounts={accounts}
        initialFileName={`post_replies_${generatedReplies.length || 15}.json`}
        onSavedSuccess={() => {
          if (onSavedSuccess) onSavedSuccess();
        }}
      />
    </div>
  );
};
