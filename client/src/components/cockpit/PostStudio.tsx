import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/services/apiClient';
import { Sparkles, Bot, Layers, Star, Calendar, Sliders } from 'lucide-react';
import { toast } from 'sonner';
import { DeckHeader } from './DeckHeader';
import { PostGeneratorForm } from './postStudio/PostGeneratorForm';
import { DraftVariationsDeck } from './postStudio/DraftVariationsDeck';
import { DraftsStashDrawer, StashedDraft } from './postStudio/DraftsStashDrawer';
import { TweetMockupCard } from './postStudio/TweetMockupCard';
import { FleetDispatcherPanel } from './postStudio/FleetDispatcherPanel';
import { ScheduleModal } from './postStudio/ScheduleModal';
import { ScheduledQueueDeck } from './postStudio/ScheduledQueueDeck';

export const PostStudio: React.FC = () => {
  const { accounts, settings, schedules, loadAccounts, loadSettings, loadSchedules, setActiveTab } =
    useStore();

  const [activeSubTab, setActiveSubTab] = useState<'studio' | 'stash' | 'queue'>('studio');

  // Generator form states
  const [keyword, setKeyword] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('viral_hook');
  const [language, setLanguage] = useState<'en' | 'id'>('en');
  const [variationCount, setVariationCount] = useState(3);
  const [postMode, setPostMode] = useState<'single' | 'thread'>('single');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generator results
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDrafts, setGeneratedDrafts] = useState<string[]>([]);
  const [activeDraftText, setActiveDraftText] = useState('');
  const [activeProviderUsed, setActiveProviderUsed] = useState<string | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Dispatcher & Fleet states
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [targetMode, setTargetMode] = useState<'single' | 'fleet'>('single');
  const [staggeredDelay, setStaggeredDelay] = useState<number>(20);
  const [isRoundRobin, setIsRoundRobin] = useState<boolean>(true);
  const [isPublishing, setIsPublishing] = useState(false);

  // Media
  const [attachedMedia, setAttachedMedia] = useState<
    Array<{ filename: string; localPath: string; previewUrl: string; sizeKb: string }>
  >([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Stash State (Persisted in localStorage)
  const [stashedDrafts, setStashedDrafts] = useState<StashedDraft[]>(() => {
    try {
      const raw = localStorage.getItem('x_sentinel_post_stash');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Schedule Modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleDelay, setScheduleDelay] = useState(20);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    loadAccounts();
    loadSettings();
    loadSchedules();
  }, [loadAccounts, loadSettings, loadSchedules]);

  const activeAccounts = accounts.filter((a) => a.enabled !== false);
  const selectedAccount =
    accounts.find((a) => a.id === selectedAccountId) || activeAccounts[0] || accounts[0];

  useEffect(() => {
    if (!selectedAccountId && activeAccounts.length > 0) {
      setSelectedAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, selectedAccountId]);

  // Main Generation Handler
  const handleGenerate = async () => {
    if (!keyword.trim()) {
      toast.error('Please enter a keyword or post topic.');
      return;
    }

    setIsGenerating(true);
    setActiveProviderUsed(null);

    try {
      const promptDirective = postMode === 'thread'
        ? `${customPrompt ? customPrompt + ' | ' : ''}Format as a 2-3 tweet mini-thread connected logically. Strictly no hashtags, no quotation marks.`
        : customPrompt;

      const res = await apiClient.generateAIPost({
        keyword: keyword.trim(),
        style: selectedStyle,
        language,
        count: variationCount,
        customPrompt: promptDirective.trim() || undefined,
      });

      if (res.success && Array.isArray(res.posts) && res.posts.length > 0) {
        const cleanedPosts = res.posts.map((p) =>
          p
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        );
        setGeneratedDrafts(cleanedPosts);
        setActiveDraftText(cleanedPosts[0]);
        setActiveProviderUsed(res.provider || 'AI Engine');
        toast.success(
          `Successfully generated ${cleanedPosts.length} post drafts via ${res.provider}!`,
          {
            description: res.isFallback ? 'Template fallback active' : `Model: ${res.provider}`,
          }
        );
      } else {
        toast.error(res.message || 'Failed to generate post drafts.');
      }
    } catch (err: any) {
      toast.error(`Error generating drafts: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Single-Row Regenerate
  const handleRegenerateRow = async (index: number) => {
    if (!keyword.trim()) {
      toast.error('Keyword topic is required to regenerate.');
      return;
    }

    setRegeneratingIndex(index);
    try {
      const res = await apiClient.generateAIPost({
        keyword: keyword.trim(),
        style: selectedStyle,
        language,
        count: 1,
        customPrompt: customPrompt
          ? `${customPrompt} (Generate 1 fresh alternative variation)`
          : 'Generate 1 fresh authentic alternative tweet.',
      });

      if (res.success && res.posts && res.posts.length > 0) {
        const fresh = res.posts[0].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
        const updated = [...generatedDrafts];
        updated[index] = fresh;
        setGeneratedDrafts(updated);
        if (activeDraftText === generatedDrafts[index]) {
          setActiveDraftText(fresh);
        }
        toast.success(`Variation #${index + 1} regenerated!`);
      } else {
        toast.error('Failed to regenerate variation.');
      }
    } catch (err: any) {
      toast.error(`Regenerate error: ${err.message}`);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleUpdateDraftRow = (index: number, newText: string) => {
    const updated = [...generatedDrafts];
    updated[index] = newText;
    setGeneratedDrafts(updated);
  };

  // Stash Management
  const handleSaveToStash = (text: string) => {
    if (!text.trim()) return;
    const exists = stashedDrafts.some((d) => d.text.trim() === text.trim());
    if (exists) {
      toast.info('This draft is already in your Stash.');
      return;
    }
    const newItem: StashedDraft = {
      id: Date.now().toString(),
      text: text.trim(),
      keyword: keyword || undefined,
      style: selectedStyle,
      savedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...stashedDrafts];
    setStashedDrafts(updated);
    localStorage.setItem('x_sentinel_post_stash', JSON.stringify(updated));
    toast.success('Draft saved to Stash ⭐!');
  };

  const handleRemoveFromStash = (id: string) => {
    const updated = stashedDrafts.filter((d) => d.id !== id);
    setStashedDrafts(updated);
    localStorage.setItem('x_sentinel_post_stash', JSON.stringify(updated));
    toast.success('Draft removed from Stash.');
  };

  const handleClearStash = () => {
    setStashedDrafts([]);
    localStorage.removeItem('x_sentinel_post_stash');
    toast.success('Drafts Stash cleared.');
  };

  const isStashed = (text: string) =>
    stashedDrafts.some((d) => d.text.trim() === text.trim());

  // Direct Publish Action
  const handlePublishNow = async () => {
    if (!activeDraftText.trim()) {
      toast.error('Post text cannot be empty.');
      return;
    }

    if (activeAccounts.length === 0) {
      toast.error('No active accounts found in the fleet.');
      return;
    }

    setIsPublishing(true);
    const mediaPaths = attachedMedia.map((m) => m.localPath);

    try {
      if (targetMode === 'single') {
        if (!selectedAccount) {
          toast.error('Please select a node account first.');
          return;
        }

        const res = await apiClient.startPostTask({
          accountIds: [selectedAccount.id],
          posts: [activeDraftText.trim()],
          mediaPaths,
        });

        if (res.success) {
          toast.success(
            `🚀 Initiated post publication to @${selectedAccount.username || selectedAccount.label}!`
          );
        }
      } else {
        const postsToBroadcast =
          isRoundRobin && generatedDrafts.length > 1
            ? generatedDrafts
            : [activeDraftText.trim()];

        const res = await apiClient.startPostTask({
          accountIds: 'all',
          posts: postsToBroadcast,
          delaySeconds: staggeredDelay,
          mediaPaths,
        });

        if (res.success) {
          toast.success(
            `🚀 Broadcasting post to entire fleet (${activeAccounts.length} Nodes) with ${staggeredDelay}s staggered delay!`
          );
        }
      }
    } catch (err: any) {
      toast.error(`Publication failed: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // Schedule Modal triggers
  const handleOpenScheduleModal = () => {
    if (!activeDraftText.trim()) {
      toast.error('Write or select a post draft first.');
      return;
    }

    const now = new Date();
    now.setHours(now.getHours() + 1);
    setScheduleDate(now.toISOString().slice(0, 10));
    setScheduleTime(now.toTimeString().slice(0, 5));
    setScheduleTitle(`Auto Post: ${keyword || 'Insight'}`);
    setScheduleDelay(staggeredDelay);
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error('Please specify execution date and time.');
      return;
    }

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (isNaN(scheduledDateTime.getTime())) {
      toast.error('Invalid date or time format.');
      return;
    }

    setIsScheduling(true);
    const mediaPaths = attachedMedia.map((m) => m.localPath);
    const posts =
      targetMode === 'fleet' && generatedDrafts.length > 0
        ? generatedDrafts
        : [activeDraftText.trim()];

    try {
      const res = await apiClient.createSchedule({
        title: scheduleTitle.trim() || 'Scheduled Tweet Post',
        scheduledAt: scheduledDateTime.toISOString(),
        accountIds: targetMode === 'single' && selectedAccount ? [selectedAccount.id] : 'all',
        posts,
        mediaPaths,
        delaySeconds: scheduleDelay,
        type: 'POST_QUEUE',
        enabled: true,
      });

      if (res.success) {
        toast.success(
          `📅 Successfully scheduled post for ${scheduledDateTime.toLocaleString()}!`
        );
        setIsScheduleModalOpen(false);
        await loadSchedules();
      }
    } catch (err: any) {
      toast.error(`Failed to schedule: ${err.message}`);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleToggleSchedule = async (id: string) => {
    try {
      const res = await apiClient.toggleSchedule(id);
      if (res.success) {
        toast.success('Schedule status updated.');
        await loadSchedules();
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const res = await apiClient.deleteSchedule(id);
      if (res.success) {
        toast.success('Schedule deleted.');
        await loadSchedules();
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  // Media upload handler
  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachedMedia.length + files.length > 4) {
      toast.error('Maximum 4 images per tweet post.');
      return;
    }

    setIsUploadingMedia(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          toast.error(`File ${file.name} is not an image.`);
          continue;
        }

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const imageBase64 = await base64Promise;

        const uploadRes = await apiClient.uploadMedia({
          imageBase64,
          filename: file.name,
        });

        if (uploadRes.success) {
          setAttachedMedia((prev) => [
            ...prev,
            {
              filename: uploadRes.filename,
              localPath: uploadRes.localPath,
              previewUrl: imageBase64,
              sizeKb: uploadRes.sizeKb,
            },
          ]);
          toast.success(`Image ${file.name} attached.`);
        }
      }
    } catch (err: any) {
      toast.error(`Failed to upload media: ${err.message}`);
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <DeckHeader
        tag="PUBLISHING PIPELINE"
        tagColor="flame"
        badge="CONTENT STUDIO"
        icon={<Sparkles className="h-5 w-5 text-flame" />}
        title="Post Studio & Fleet Publisher"
        description="Craft high-engagement, anti-AI-slop posts from target keywords, then publish directly across your X account fleet."
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-obsidian-950/80 p-1">
            <button
              type="button"
              onClick={() => setActiveSubTab('studio')}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                activeSubTab === 'studio'
                  ? 'bg-flame text-obsidian-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generator Studio
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('stash')}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                activeSubTab === 'stash'
                  ? 'bg-slate-800 text-amber-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              Saved Stash
              <span className="rounded bg-black/30 px-1 py-0.5 text-[9px] text-muted-foreground">
                {stashedDrafts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('queue')}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                activeSubTab === 'queue'
                  ? 'bg-slate-800 text-amber-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              Queue
              <span className="rounded bg-black/30 px-1 py-0.5 text-[9px] text-muted-foreground">
                {schedules.length}
              </span>
            </button>
          </div>
        }
      />

      {/* Main Studio View */}
      {activeSubTab === 'studio' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Generator Controls (5 cols) */}
          <div className="space-y-5 lg:col-span-5">
            <PostGeneratorForm
              keyword={keyword}
              setKeyword={setKeyword}
              selectedStyle={selectedStyle}
              setSelectedStyle={setSelectedStyle}
              language={language}
              setLanguage={setLanguage}
              variationCount={variationCount}
              setVariationCount={setVariationCount}
              postMode={postMode}
              setPostMode={setPostMode}
              customPrompt={customPrompt}
              setCustomPrompt={setCustomPrompt}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
            />
          </div>

          {/* Right Column: Variations, Tweet Mockup & Fleet Dispatcher (7 cols) */}
          <div className="space-y-5 lg:col-span-7">
            {/* Generated Draft Variations Deck */}
            <DraftVariationsDeck
              generatedDrafts={generatedDrafts}
              activeDraftText={activeDraftText}
              setActiveDraftText={setActiveDraftText}
              activeProviderUsed={activeProviderUsed}
              onRegenerateRow={handleRegenerateRow}
              regeneratingIndex={regeneratingIndex}
              onSaveToStash={handleSaveToStash}
              isStashed={isStashed}
              onUpdateDraftRow={handleUpdateDraftRow}
            />

            {/* Live Tweet Mockup & Fleet Dispatcher Card */}
            <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-obsidian-850 p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2 font-heading text-sm font-bold text-white">
                  <Sliders className="h-4 w-4 text-blue-400" />
                  <span>3. Live Tweet Editor &amp; Fleet Dispatcher</span>
                </div>
                <span className="rounded bg-blue-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-blue-300">
                  STEP 3
                </span>
              </div>

              {/* WYSIWYG Mockup */}
              <TweetMockupCard
                selectedAccount={selectedAccount}
                activeDraftText={activeDraftText}
                setActiveDraftText={setActiveDraftText}
                attachedMedia={attachedMedia}
                setAttachedMedia={setAttachedMedia}
                isUploadingMedia={isUploadingMedia}
                onMediaSelect={handleMediaSelect}
              />

              {/* Fleet Dispatcher Controls */}
              <FleetDispatcherPanel
                targetMode={targetMode}
                setTargetMode={setTargetMode}
                accounts={accounts}
                activeAccounts={activeAccounts}
                selectedAccountId={selectedAccountId}
                setSelectedAccountId={setSelectedAccountId}
                staggeredDelay={staggeredDelay}
                setStaggeredDelay={setStaggeredDelay}
                isRoundRobin={isRoundRobin}
                setIsRoundRobin={setIsRoundRobin}
                isPublishing={isPublishing}
                canPublish={Boolean(activeDraftText.trim() && activeAccounts.length > 0)}
                onPublishNow={handlePublishNow}
                onOpenScheduleModal={handleOpenScheduleModal}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stash View */}
      {activeSubTab === 'stash' && (
        <DraftsStashDrawer
          stashedDrafts={stashedDrafts}
          onLoadDraft={(text) => {
            setActiveDraftText(text);
            setActiveSubTab('studio');
          }}
          onRemoveDraft={handleRemoveFromStash}
          onClearStash={handleClearStash}
        />
      )}

      {/* Scheduled Queue View */}
      {activeSubTab === 'queue' && (
        <ScheduledQueueDeck
          schedules={schedules}
          onToggleSchedule={handleToggleSchedule}
          onDeleteSchedule={handleDeleteSchedule}
        />
      )}

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        scheduleTitle={scheduleTitle}
        setScheduleTitle={setScheduleTitle}
        scheduleDate={scheduleDate}
        setScheduleDate={setScheduleDate}
        scheduleTime={scheduleTime}
        setScheduleTime={setScheduleTime}
        scheduleDelay={scheduleDelay}
        setScheduleDelay={setScheduleDelay}
        targetMode={targetMode}
        selectedAccountName={selectedAccount?.label}
        activeAccountsCount={activeAccounts.length}
        isSubmitting={isScheduling}
        onSubmit={handleSaveSchedule}
      />
    </div>
  );
};
