import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient, Settings } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DeckHeader } from './DeckHeader';
import { toast } from 'sonner';
import {
  Bot,
  Sparkles,
  Cpu,
  FlaskConical,
  Save,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { AI_PROVIDERS } from './ai/AIProviderSelector';
import { AIProviderSelector } from './ai/AIProviderSelector';
import { AIEngineConfig } from './ai/AIEngineConfig';
import { AIPersonaStudio, AntiSlopGuardrails } from './ai/AIPersonaStudio';
import { AISandboxTester } from './ai/AISandboxTester';
import { cn } from '@/lib/utils';

export const AISettingsDeck: React.FC = () => {
  const { settings, setSettings, loadSettings } = useStore();

  // Active Workspace Subsystem Tab
  const [activeTab, setActiveTab] = useState<'engine' | 'persona' | 'sandbox'>('engine');

  // Form States
  const [aiProvider, setAiProvider] = useState('none');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Universal Multi-Model Registry
  const [modelsRegistry, setModelsRegistry] = useState<string[]>([
    'openai/gpt-4o-mini',
    'deepseek/deepseek-chat',
    'anthropic/claude-3.5-sonnet',
    'meta-llama/llama-3.3-70b-instruct',
  ]);

  // Anti-AI Slop Guardrails
  const [guardrails, setGuardrails] = useState<AntiSlopGuardrails>({
    noHashtags: true,
    noQuotes: true,
    banGenericPraise: true,
    banBuzzwords: true,
    strictShort: true,
  });

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings) {
      setAiProvider(settings.aiProvider || 'none');
      setAiApiKey(settings.aiApiKey || '');
      setAiModel(settings.aiModel || '');
      setAiBaseUrl(settings.aiBaseUrl || '');
      setAiPrompt(
        settings.aiPrompt ||
          'Write a sharp, authentic, and context-aware 1-sentence English reply as a crypto/tech native. Be insightful, peer-to-peer, and zero generic praise.'
      );

      const defaultModels = [
        'openai/gpt-4o-mini',
        'deepseek/deepseek-chat',
        'anthropic/claude-3.5-sonnet',
        'meta-llama/llama-3.3-70b-instruct',
      ];
      const initialModels =
        Array.isArray(settings.nineRouterModels) && settings.nineRouterModels.length > 0
          ? settings.nineRouterModels
          : defaultModels;

      if (settings.aiModel && !initialModels.includes(settings.aiModel)) {
        setModelsRegistry([settings.aiModel, ...initialModels]);
      } else {
        setModelsRegistry(initialModels);
      }
    }
  }, [settings]);

  const selectedProviderInfo =
    AI_PROVIDERS.find((p) => p.id === aiProvider) || AI_PROVIDERS[0];

  const handleSelectProvider = (providerId: string) => {
    setAiProvider(providerId);
    const info = AI_PROVIDERS.find((p) => p.id === providerId);
    if (info && info.id !== 'none') {
      if (!aiModel || aiModel === 'gpt-4o-mini' || !info.recommendedModels.includes(aiModel)) {
        setActiveModelWithRegistry(info.defaultModel);
      }
      if (!aiBaseUrl || aiBaseUrl.includes('api.openai.com') || !aiBaseUrl.trim()) {
        setAiBaseUrl(info.defaultBaseUrl);
      }
    }
  };

  const setActiveModelWithRegistry = (modelName: string) => {
    setAiModel(modelName);
    if (modelName && !modelsRegistry.includes(modelName)) {
      setModelsRegistry([modelName, ...modelsRegistry]);
    }
  };

  // Compute Unsaved Changes (isDirty)
  const isDirty = useMemo(() => {
    if (!settings) return false;
    const providerChanged = (settings.aiProvider || 'none') !== aiProvider;
    const apiKeyChanged = (settings.aiApiKey || '') !== aiApiKey;
    const modelChanged = (settings.aiModel || '') !== aiModel;
    const baseUrlChanged = (settings.aiBaseUrl || '') !== aiBaseUrl;
    const promptChanged = (settings.aiPrompt || '') !== aiPrompt;
    return providerChanged || apiKeyChanged || modelChanged || baseUrlChanged || promptChanged;
  }, [settings, aiProvider, aiApiKey, aiModel, aiBaseUrl, aiPrompt]);

  // Combine Active Prompt with Active Guardrail Directives
  const effectivePrompt = useMemo(() => {
    const rules: string[] = [];
    if (guardrails.noHashtags) rules.push('No hashtags (#).');
    if (guardrails.noQuotes) rules.push('No quotation marks around reply.');
    if (guardrails.banGenericPraise) rules.push('Zero generic praise (e.g. no "Great post!", "Totally agree").');
    if (guardrails.banBuzzwords) rules.push('Avoid AI buzzwords (delve, tapestry, beacon, testament).');
    if (guardrails.strictShort) rules.push('Strictly 1-2 sentences, max 25 words.');

    if (rules.length === 0) return aiPrompt;
    return `${aiPrompt}\n\n[GUARDRAILS]: ${rules.join(' ')}`;
  }, [aiPrompt, guardrails]);

  const handleSave = async () => {
    setIsSaving(true);
    let finalModels = [...modelsRegistry];
    if (aiModel.trim() && !finalModels.includes(aiModel.trim())) {
      finalModels = [aiModel.trim(), ...finalModels];
      setModelsRegistry(finalModels);
    }

    const payload: Partial<Settings> = {
      aiProvider,
      aiApiKey: aiApiKey.trim(),
      aiModel: aiModel.trim(),
      aiBaseUrl: aiBaseUrl.trim(),
      aiPrompt: aiPrompt.trim(),
      nineRouterModels: finalModels,
    };

    try {
      const res = await apiClient.saveSettings(payload);
      if (res.success) {
        setSettings(res.settings);
        toast.success(`AI settings (${aiProvider.toUpperCase()}) saved successfully!`);
      }
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (!settings) return;
    setAiProvider(settings.aiProvider || 'none');
    setAiApiKey(settings.aiApiKey || '');
    setAiModel(settings.aiModel || '');
    setAiBaseUrl(settings.aiBaseUrl || '');
    setAiPrompt(settings.aiPrompt || '');
    toast.info('Reverted unsaved changes to stored database settings.');
  };

  return (
    <div className="space-y-5 pb-8 animate-in fade-in">
      {/* Top Banner Deck Header */}
      <DeckHeader
        tag="AI INTELLIGENCE SUITE"
        tagColor="purple"
        accent="purple"
        icon={<Bot className="h-5 w-5 text-purple-400" />}
        contextAnimation="bot"
        isActive={isSaving}
        title="AI Gateway & Engine Studio"
        titleBadges={
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'font-mono text-[10px]',
                aiProvider !== 'none'
                  ? 'border-purple-500/60 bg-purple-500/10 text-purple-300'
                  : 'border-slate-700 text-slate-400'
              )}
            >
              STATUS: {aiProvider !== 'none' ? `ONLINE · ${aiProvider.toUpperCase()}` : 'DISABLED'}
            </Badge>

            {aiModel && aiProvider !== 'none' && (
              <span className="rounded-md border border-slate-700/80 bg-obsidian-950 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                {aiModel}
              </span>
            )}

            {isDirty && (
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 font-mono text-[10px] text-amber-300 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Unsaved Changes
              </span>
            )}
          </div>
        }
        description={
          <>
            Configure LLMs for 100% contextual, authentic, and human-passing tweet replies (Anti-AI Slop). Supports{' '}
            <strong>9router</strong>, <strong>OpenRouter</strong>, <strong>Groq</strong>,{' '}
            <strong>OpenAI</strong>, <strong>Gemini</strong>, and <strong>Local Ollama</strong>.
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscardChanges}
                className="h-8 gap-1 border-slate-700 bg-obsidian-950 px-2.5 font-mono text-xs text-slate-400 hover:text-white"
                title="Discard unsaved changes"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Revert</span>
              </Button>
            )}

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                'h-8 gap-1.5 font-mono text-xs font-bold transition-all',
                isDirty
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-950/50 animate-pulse'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              )}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save AI Settings'}</span>
            </Button>
          </div>
        }
      />

      {/* Subsystem 3-Pillar Workspace Tab Navigation */}
      <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('engine')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all',
              activeTab === 'engine'
                ? 'border border-purple-500/50 bg-purple-500/15 text-purple-200 shadow-sm'
                : 'border border-transparent text-slate-400 hover:border-slate-800 hover:bg-obsidian-900 hover:text-slate-200'
            )}
          >
            <Cpu className="h-3.5 w-3.5 text-purple-400" />
            <span>1. Engine &amp; Gateway</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('persona')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all',
              activeTab === 'persona'
                ? 'border border-purple-500/50 bg-purple-500/15 text-purple-200 shadow-sm'
                : 'border border-transparent text-slate-400 hover:border-slate-800 hover:bg-obsidian-900 hover:text-slate-200'
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>2. Persona &amp; Anti-Slop</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sandbox')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all',
              activeTab === 'sandbox'
                ? 'border border-purple-500/50 bg-purple-500/15 text-purple-200 shadow-sm'
                : 'border border-transparent text-slate-400 hover:border-slate-800 hover:bg-obsidian-900 hover:text-slate-200'
            )}
          >
            <FlaskConical className="h-3.5 w-3.5 text-emerald-400" />
            <span>3. Live Sandbox &amp; Telemetry</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Prompt Quality Guardrails Active</span>
        </div>
      </div>

      {/* Tab 1: Engine & Credentials */}
      {activeTab === 'engine' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 animate-in fade-in">
          {/* Left Col: Provider Selection */}
          <div className="lg:col-span-1">
            <AIProviderSelector
              selectedProvider={aiProvider}
              onSelectProvider={handleSelectProvider}
            />
          </div>

          {/* Right Col: Universal Engine & Multi-Model Registry */}
          <div className="lg:col-span-2">
            <AIEngineConfig
              provider={aiProvider}
              providerInfo={selectedProviderInfo}
              apiKey={aiApiKey}
              setApiKey={setAiApiKey}
              baseUrl={aiBaseUrl}
              setBaseUrl={setAiBaseUrl}
              activeModel={aiModel}
              setActiveModel={setActiveModelWithRegistry}
              modelsRegistry={modelsRegistry}
              setModelsRegistry={setModelsRegistry}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Persona & Anti-AI Slop Studio */}
      {activeTab === 'persona' && (
        <div className="animate-in fade-in">
          <AIPersonaStudio
            prompt={aiPrompt}
            setPrompt={setAiPrompt}
            guardrails={guardrails}
            setGuardrails={setGuardrails}
          />
        </div>
      )}

      {/* Tab 3: Live Sandbox & Telemetry */}
      {activeTab === 'sandbox' && (
        <div className="animate-in fade-in">
          <AISandboxTester
            provider={aiProvider}
            apiKey={aiApiKey}
            model={aiModel}
            baseUrl={aiBaseUrl}
            prompt={effectivePrompt}
          />
        </div>
      )}
    </div>
  );
};
