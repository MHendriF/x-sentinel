import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Zap,
  Bot,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Layers,
  Clock,
  FlaskConical,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { toast } from 'sonner';

export interface SandboxScenario {
  id: string;
  name: string;
  text: string;
}

export const SANDBOX_SCENARIOS: SandboxScenario[] = [
  {
    id: 'base-tvl',
    name: '🚀 Base L2 TVL Milestone',
    text: 'Base chain TVL hits new all time high as agentic workflows and automated trading nodes dominate transaction volume on decentralized rails.',
  },
  {
    id: 'oss-release',
    name: '🛠️ Open-Source AI Engine',
    text: 'Just open-sourced our local vector memory system for autonomous browser agents with zero cloud dependencies. Full latency benchmarks in the repo.',
  },
  {
    id: 'saas-mrr',
    name: '💰 Bootstrapped SaaS $10k MRR',
    text: 'Hit $10,000 MRR today after 5 months of continuous shipping without raising venture capital. Churn dropped to 1.8% after our latest UX revamp.',
  },
  {
    id: 'ai-debate',
    name: '⚡ AI vs Senior Engineers',
    text: 'Autonomous coding assistants will not replace software architects; they will just eradicate boilerplate meetings, sprint bureaucracy, and repetitive glue code.',
  },
  {
    id: 'indo-web3',
    name: '🇮🇩 Diskusi Web3 & Tech Indo',
    text: 'Ekosistem developer Web3 di Indonesia makin masif setelah adopsi stablecoin lokal dan regulasi bursa kripto resmi OJK mulai stabil di tahun ini.',
  },
];

interface AISandboxTesterProps {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  prompt: string;
}

export const AISandboxTester: React.FC<AISandboxTesterProps> = ({
  provider,
  apiKey,
  model,
  baseUrl,
  prompt,
}) => {
  const [tweetInput, setTweetInput] = useState(SANDBOX_SCENARIOS[0].text);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [isGeneratingMulti, setIsGeneratingMulti] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [multiVariations, setMultiVariations] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | string | null>(null);

  const handleCopy = (text: string, identifier: number | string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(identifier);
    toast.success('Reply copied to clipboard!');
    setTimeout(() => {
      setCopiedIndex((cur) => (cur === identifier ? null : cur));
    }, 2000);
  };

  // 1. Quick Connection Ping
  const handleTestPing = async () => {
    if (provider === 'none') {
      toast.error('Select an active AI provider first to test connection.');
      return;
    }

    setIsTestingPing(true);
    setTestResult(null);
    setMultiVariations([]);
    setTestLatency(null);
    const startTime = Date.now();

    try {
      const res = await apiClient.testAISettings({
        aiProvider: provider,
        aiApiKey: apiKey.trim(),
        aiModel: model.trim(),
        aiBaseUrl: baseUrl.trim(),
      });

      const duration = Date.now() - startTime;
      setTestLatency(duration);
      setTestResult({ ...res, testType: 'ping' });

      if (res.success) {
        toast.success(`⚡ Connection OK (${duration}ms): ${res.message}`);
      } else {
        toast.error(`AI Error: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`AI connection ping failed: ${err.message}`);
    } finally {
      setIsTestingPing(false);
    }
  };

  // 2. Generate Single Reply
  const handleGenerateSingle = async () => {
    if (provider === 'none') {
      toast.error('Select an active AI provider to generate replies.');
      return;
    }
    if (!tweetInput.trim()) {
      toast.error('Please enter sample tweet text.');
      return;
    }

    setIsGeneratingSingle(true);
    setTestResult(null);
    setMultiVariations([]);
    setTestLatency(null);
    const startTime = Date.now();

    try {
      const res = await apiClient.generateAITest({
        tweetText: tweetInput.trim(),
        aiProvider: provider,
        aiApiKey: apiKey.trim(),
        aiModel: model.trim(),
        aiBaseUrl: baseUrl.trim(),
        aiPrompt: prompt.trim(),
      });

      const duration = Date.now() - startTime;
      setTestLatency(duration);
      setTestResult({ ...res, testType: 'single' });

      if (res.success) {
        toast.success(`🤖 Contextual Reply Generated (${duration}ms)!`);
      } else {
        toast.error(`AI Error: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Failed to generate reply: ${err.message}`);
    } finally {
      setIsGeneratingSingle(false);
    }
  };

  // 3. Generate 3 Variations Side-by-Side
  const handleGenerateMulti = async () => {
    if (provider === 'none') {
      toast.error('Select an active AI provider to generate replies.');
      return;
    }
    if (!tweetInput.trim()) {
      toast.error('Please enter sample tweet text.');
      return;
    }

    setIsGeneratingMulti(true);
    setTestResult(null);
    setMultiVariations([]);
    setTestLatency(null);
    const startTime = Date.now();

    try {
      const promises = [1, 2, 3].map((_) =>
        apiClient.generateAITest({
          tweetText: tweetInput.trim(),
          aiProvider: provider,
          aiApiKey: apiKey.trim(),
          aiModel: model.trim(),
          aiBaseUrl: baseUrl.trim(),
          aiPrompt: prompt.trim(),
        })
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      setTestLatency(duration);

      const successfulReplies = results
        .filter((r) => r.success && r.sampleOutput)
        .map((r) => r.sampleOutput!);

      if (successfulReplies.length > 0) {
        setMultiVariations(successfulReplies);
        setTestResult({
          success: true,
          testType: 'multi',
          model: model,
          message: `Generated ${successfulReplies.length} variations in ${duration}ms.`,
        });
        toast.success(`🧪 Generated 3 distinct response variations!`);
      } else {
        toast.error(`Failed to generate variations.`);
      }
    } catch (err: any) {
      toast.error(`Multi-variation generation error: ${err.message}`);
    } finally {
      setIsGeneratingMulti(false);
    }
  };

  const isAnyLoading = isTestingPing || isGeneratingSingle || isGeneratingMulti;

  return (
    <Card className="border-purple-500/30 bg-obsidian-900/90 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-amber-400 uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            INTERACTIVE AI SANDBOX &amp; DIAGNOSTICS
          </div>
          {testLatency && (
            <Badge variant="outline" className="border-emerald-500/40 font-mono text-[10px] text-emerald-300">
              <Clock className="mr-1 h-3 w-3 inline" />
              {testLatency}ms LATENCY
            </Badge>
          )}
        </div>
        <CardTitle className="text-base font-heading">Live Response &amp; Latency Bench</CardTitle>
        <CardDescription className="text-xs">
          Simulate authentic reply generation against diverse tweet scenarios and benchmark model response latency.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Scenario Quick-Pills */}
        <div className="space-y-1.5">
          <label className="font-mono text-xs font-bold text-slate-300">
            TEST SCENARIOS · 1-CLICK POPULATE:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SANDBOX_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => {
                  setTweetInput(sc.text);
                  toast.info(`Populated: "${sc.name}"`);
                }}
                className={`rounded border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                  tweetInput === sc.text
                    ? 'border-amber-500/60 bg-amber-500/15 text-amber-300 font-bold'
                    : 'border-slate-800 bg-obsidian-950 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                {sc.name}
              </button>
            ))}
          </div>
        </div>

        {/* Target Tweet Textarea */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-mono text-xs font-bold text-slate-300">
              TARGET TWEET TEXT FOR INFERENCE
            </label>
            <span className="font-mono text-[10px] text-slate-400">
              {tweetInput.length} characters
            </span>
          </div>
          <Textarea
            rows={4}
            value={tweetInput}
            onChange={(e) => setTweetInput(e.target.value)}
            className="min-h-[100px] resize-y bg-obsidian-950 font-mono text-xs leading-relaxed"
            placeholder="Paste or type sample tweet content here..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Ping Connection Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleTestPing}
              disabled={isAnyLoading || provider === 'none'}
              className="gap-1.5 border-purple-500/40 font-mono text-xs text-purple-300 hover:bg-purple-500/10"
            >
              <Zap className="h-3.5 w-3.5 text-purple-400" />
              <span>{isTestingPing ? 'Pinging Gateway...' : '⚡ Ping Connection'}</span>
            </Button>

            {/* Test Single Reply Button */}
            <Button
              type="button"
              onClick={handleGenerateSingle}
              disabled={isAnyLoading || provider === 'none'}
              className="gap-1.5 bg-amber-500 font-mono text-xs font-bold text-obsidian-950 hover:bg-amber-600 shadow-md shadow-amber-950/40"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>{isGeneratingSingle ? 'Generating Reply...' : '🤖 Generate Single Reply'}</span>
            </Button>

            {/* Generate 3 Variations Button */}
            <Button
              type="button"
              variant="secondary"
              onClick={handleGenerateMulti}
              disabled={isAnyLoading || provider === 'none'}
              className="gap-1.5 font-mono text-xs font-semibold"
            >
              <FlaskConical className="h-3.5 w-3.5 text-emerald-400" />
              <span>{isGeneratingMulti ? 'Generating Variations...' : '🧪 Generate 3 Variations'}</span>
            </Button>
          </div>

          {testResult && (
            <span
              className={`font-mono text-xs font-semibold ${
                testResult.success ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {testResult.success ? '● Gateway: ONLINE' : '● Gateway: ERROR'}
            </span>
          )}
        </div>

        {/* Single Result Output */}
        {testResult && !multiVariations.length && (
          <div
            className={`space-y-2 rounded-lg border p-3.5 font-mono text-xs animate-in fade-in ${
              testResult.success
                ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-200'
                : 'border-rose-500/30 bg-rose-500/5 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="flex items-center gap-1.5">
                {testResult.success ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                )}
                {testResult.testType === 'ping'
                  ? `AI GATEWAY PING RESULT (${testResult.model || model})`
                  : `CONTEXTUAL REPLY OUTPUT (${testResult.model || model})`}
              </span>
              {testResult.sampleOutput && (
                <button
                  type="button"
                  onClick={() => handleCopy(testResult.sampleOutput, 'single')}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white"
                >
                  {copiedIndex === 'single' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span>Copy</span>
                </button>
              )}
            </div>
            <div className="select-all rounded border border-slate-800 bg-obsidian-950/90 p-3 text-xs leading-relaxed">
              {testResult.sampleOutput ? `"${testResult.sampleOutput}"` : testResult.message}
            </div>
          </div>
        )}

        {/* Multi-Variation Results Comparison */}
        {multiVariations.length > 0 && (
          <div className="space-y-2.5 border-t border-border/60 pt-3 animate-in fade-in">
            <div className="flex items-center justify-between font-mono text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Layers className="h-4 w-4" />
                SIDE-BY-SIDE VARIATION COMPARISON ({multiVariations.length} VARIATIONS)
              </span>
              <span className="text-[10px] text-slate-400">{model}</span>
            </div>

            <div className="space-y-2">
              {multiVariations.map((v, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-obsidian-950 p-3 font-mono text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      #{idx + 1}
                    </span>
                    <p className="select-all text-slate-200 leading-relaxed break-words">
                      "{v}"
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(v, idx)}
                    className="flex shrink-0 items-center gap-1 text-[10px] text-slate-400 hover:text-white"
                    title="Copy this variation"
                  >
                    {copiedIndex === idx ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
