import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Eye,
  EyeOff,
  Layers,
  Radio,
  Check,
  Trash2,
  Plus,
  RotateCcw,
  Bot,
  Globe,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { AIProviderInfo, AI_PROVIDERS } from './AIProviderSelector';
import { toast } from 'sonner';

interface AIEngineConfigProps {
  provider: string;
  providerInfo: AIProviderInfo;
  apiKey: string;
  setApiKey: (k: string) => void;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  activeModel: string;
  setActiveModel: (m: string) => void;
  modelsRegistry: string[];
  setModelsRegistry: (models: string[]) => void;
}

export const AIEngineConfig: React.FC<AIEngineConfigProps> = ({
  provider,
  providerInfo,
  apiKey,
  setApiKey,
  baseUrl,
  setBaseUrl,
  activeModel,
  setActiveModel,
  modelsRegistry,
  setModelsRegistry,
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [newModelInput, setNewModelInput] = useState('');

  if (provider === 'none') {
    return (
      <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-slate-400">
            <Bot className="h-6 w-6" />
          </div>
          <h4 className="font-heading text-base font-bold text-white">AI Engine Disabled</h4>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
            Automated replies will exclusively use Spintax templates and the JSON fallback pool.
            Select an active provider (such as <strong>9router</strong>, <strong>OpenRouter</strong>,
            or <strong>Groq</strong>) to enable dynamic contextual intelligence.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSelectModel = (modelName: string) => {
    setActiveModel(modelName);
    toast.info(`Active model set to: ${modelName}`);
  };

  const handleAddModel = () => {
    const trimmed = newModelInput.trim();
    if (!trimmed) {
      toast.error('Please enter a model identifier (e.g. deepseek/deepseek-r1).');
      return;
    }
    if (modelsRegistry.includes(trimmed)) {
      setActiveModel(trimmed);
      toast.info(`"${trimmed}" is already in the registry. Set as active!`);
      setNewModelInput('');
      return;
    }
    const updated = [trimmed, ...modelsRegistry];
    setModelsRegistry(updated);
    setActiveModel(trimmed);
    setNewModelInput('');
    toast.success(`Added "${trimmed}" to registry and set as active.`);
  };

  const handleDeleteModel = (modelToDelete: string) => {
    if (modelsRegistry.length <= 1) {
      toast.error('You must keep at least one model in your registry.');
      return;
    }
    const updated = modelsRegistry.filter((m) => m !== modelToDelete);
    setModelsRegistry(updated);
    if (activeModel === modelToDelete) {
      setActiveModel(updated[0]);
      toast.warning(`Deleted active model. Switched active to "${updated[0]}".`);
    } else {
      toast.success(`Removed "${modelToDelete}" from registry.`);
    }
  };

  const handleResetToDefaults = () => {
    const defaults =
      providerInfo.recommendedModels.length > 0
        ? providerInfo.recommendedModels
        : [providerInfo.defaultModel || 'gpt-4o-mini'];
    setModelsRegistry(defaults);
    if (!defaults.includes(activeModel)) {
      setActiveModel(defaults[0]);
    }
    toast.info(`Registry reset to recommended defaults for ${providerInfo.name}.`);
  };

  return (
    <Card className="border-border/80 bg-obsidian-900/90 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] font-bold tracking-wider text-purple-400 uppercase">
            CREDENTIALS &amp; UNIVERSAL REGISTRY
          </div>
          <Badge variant="outline" className="border-purple-500/40 bg-purple-500/10 font-mono text-[10px] text-purple-300">
            {providerInfo.name}
          </Badge>
        </div>
        <CardTitle className="text-base font-heading">Engine Configuration</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* API Key */}
        {providerInfo.requiresApiKey && (
          <div className="space-y-1.5">
            <label className="flex items-center justify-between font-mono text-xs font-bold text-slate-300">
              <span>
                API KEY ({provider.toUpperCase()}) <span className="text-flame">*</span>
              </span>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="flex cursor-pointer items-center gap-1 text-[10px] text-slate-400 hover:text-white"
              >
                {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </label>
            <Input
              type={showApiKey ? 'text' : 'password'}
              placeholder={`Paste API key for ${providerInfo.name}...`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-obsidian-950 font-mono text-xs"
            />
          </div>
        )}

        {/* Base URL Endpoint */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-300">
              <Globe className="h-3.5 w-3.5 text-purple-400" />
              BASE URL ENDPOINT (API GATEWAY)
            </label>
            {providerInfo.defaultBaseUrl && baseUrl !== providerInfo.defaultBaseUrl && (
              <button
                type="button"
                onClick={() => setBaseUrl(providerInfo.defaultBaseUrl)}
                className="text-[10px] text-purple-400 hover:underline"
              >
                Reset to default
              </button>
            )}
          </div>
          <Input
            type="text"
            placeholder={providerInfo.defaultBaseUrl || 'https://api.openai.com/v1'}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="bg-obsidian-950 font-mono text-xs"
          />
        </div>

        {/* Universal Multi-Model Registry Deck */}
        <div className="space-y-4 rounded-xl border border-purple-500/30 bg-obsidian-950/70 p-4 shadow-inner">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-purple-200">
                  {provider.toUpperCase()} Multi-Model Registry
                </h4>
                <p className="text-[11px] text-slate-400">
                  Store custom models and switch the active dispatched model with 1-click.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetToDefaults}
              className="h-7 cursor-pointer gap-1 border-slate-800 bg-obsidian-900 px-2.5 font-mono text-[10px] text-slate-400 hover:border-slate-700 hover:text-slate-200"
              title="Reset registry to recommended defaults"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Defaults
            </Button>
          </div>

          {/* Active Model Spotlight */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 via-obsidian-900 to-obsidian-950 p-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/20 opacity-75" />
                <Radio className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    ACTIVE MODEL (DISPATCHED)
                  </span>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0 font-mono text-[9px] text-emerald-300"
                  >
                    ONLINE
                  </Badge>
                </div>
                <div className="font-mono text-xs font-bold text-slate-100">
                  {activeModel || 'No model selected'}
                </div>
              </div>
            </div>

            <div className="text-right font-mono text-[10px] text-slate-400">
              {modelsRegistry.length} models stored in registry
            </div>
          </div>

          {/* Stored Models Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs font-bold text-slate-300">
                SAVED MODELS ({modelsRegistry.length}) · CLICK TO SET ACTIVE
              </label>
              <span className="text-[10px] text-slate-500">1-Click Dispatch Switch</span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {modelsRegistry.map((modelName) => {
                const isActive = activeModel === modelName;
                return (
                  <div
                    key={modelName}
                    className={`group flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-all ${
                      isActive
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100 shadow-sm shadow-emerald-950/50'
                        : 'border-slate-800/80 bg-obsidian-900/60 text-slate-300 hover:border-purple-500/40 hover:bg-obsidian-900'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectModel(modelName)}
                      className="flex flex-1 cursor-pointer items-center gap-2.5 text-left min-w-0"
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isActive
                            ? 'border-emerald-400 bg-emerald-500 text-obsidian-950'
                            : 'border-slate-700 bg-obsidian-950 text-transparent group-hover:border-purple-400'
                        }`}
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-xs font-medium">{modelName}</div>
                        <div className="font-mono text-[9px]">
                          {isActive ? (
                            <span className="font-bold text-emerald-400">● ACTIVE</span>
                          ) : (
                            <span className="text-slate-500 group-hover:text-slate-400">
                              Click to activate
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteModel(modelName);
                      }}
                      className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-slate-500 transition-colors hover:bg-red-500/20 hover:text-red-300"
                      title={`Delete "${modelName}" from registry`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Custom Model Input */}
          <div className="space-y-1.5 border-t border-purple-500/20 pt-3">
            <label className="font-mono text-xs font-bold text-slate-300">
              ADD NEW MODEL TO REGISTRY
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="e.g. deepseek/deepseek-r1, llama-3.3-70b-versatile..."
                value={newModelInput}
                onChange={(e) => setNewModelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddModel();
                  }
                }}
                className="bg-obsidian-950 font-mono text-xs"
              />
              <Button
                type="button"
                onClick={handleAddModel}
                className="shrink-0 cursor-pointer gap-1.5 bg-purple-600 font-mono text-xs font-bold text-white hover:bg-purple-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Model
              </Button>
            </div>
          </div>

          {/* Recommended Presets */}
          {providerInfo.recommendedModels.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="font-mono text-[10px] font-bold tracking-wider text-slate-400">
                RECOMMENDED PRESETS FOR {provider.toUpperCase()}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {providerInfo.recommendedModels.map((preset) => {
                  const isStored = modelsRegistry.includes(preset);
                  const isActive = activeModel === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        if (!isStored) {
                          setModelsRegistry([...modelsRegistry, preset]);
                        }
                        setActiveModel(preset);
                        toast.success(`Active model switched to ${preset}`);
                      }}
                      className={`flex cursor-pointer items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] transition-colors ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-500/20 font-bold text-emerald-200'
                          : isStored
                            ? 'border-purple-500/50 bg-purple-500/10 text-purple-200 hover:border-purple-400'
                            : 'border-slate-800 bg-obsidian-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {isActive && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      {preset}
                      {!isStored && <span className="text-[9px] text-purple-400">+add</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Direct Model Override */}
          <div className="space-y-1 border-t border-purple-500/10 pt-2.5">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[11px] font-bold text-slate-400">
                DIRECT MODEL IDENTIFIER OVERRIDE
              </label>
              <span className="text-[10px] text-slate-500">Manual String</span>
            </div>
            <Input
              type="text"
              placeholder="Model identifier string..."
              value={activeModel}
              onChange={(e) => setActiveModel(e.target.value)}
              className="bg-obsidian-950 font-mono text-xs text-slate-300"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
