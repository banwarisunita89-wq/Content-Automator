// --- src/store/useStore.ts ---
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Episode, ScriptData } from './supabase'; // Ensure this matches your actual types

// ─── Theme Store ───
type ThemeState = {
  accent: string;
  radius: number;
  preset: string;
  fontSize: number;
  bgGradient: string;
  setAccent: (color: string) => void;
  setRadius: (value: number) => void;
  setFontSize: (value: number) => void;
  setBgGradient: (value: string) => void;
  applyPreset: (name: string, color: string) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      accent: '#00d4ff',
      radius: 12,
      preset: 'Aurora',
      fontSize: 14,
      bgGradient: 'rgba(0,212,255,0.04)',
      setAccent: (color) => set({ accent: color }),
      setRadius: (value) => set({ radius: value }),
      setFontSize: (value) => set({ fontSize: value }),
      setBgGradient: (value) => set({ bgGradient: value }),
      applyPreset: (name, color) => set({ preset: name, accent: color }),
    }),
    { name: 'theme-store' }
  )
);

// ─── AI Cache & Lock Store (NEW: Prevents duplicate generations) ───
type AiCacheState = {
  cache: Record<string, string>; // prompt hash -> generated text
  activeRequests: Set<string>;   // active prompt hashes
  setCache: (hash: string, result: string) => void;
  addRequest: (hash: string) => void;
  removeRequest: (hash: string) => void;
  hasCache: (hash: string) => boolean;
  isRequesting: (hash: string) => boolean;
};

export const useAiCacheStore = create<AiCacheState>()((set, get) => ({
  cache: {},
  activeRequests: new Set(),
  setCache: (hash, result) => set((s) => ({ cache: { ...s.cache, [hash]: result } })),
  addRequest: (hash) => set((s) => {
    const next = new Set(s.activeRequests);
    next.add(hash);
    return { activeRequests: next };
  }),
  removeRequest: (hash) => set((s) => {
    const next = new Set(s.activeRequests);
    next.delete(hash);
    return { activeRequests: next };
  }),
  hasCache: (hash) => !!get().cache[hash],
  isRequesting: (hash) => get().activeRequests.has(hash),
}));

// ─── Active Series / Episode Store ───
type SeriesState = {
  activeSeriesId: string | null;
  activeEpisodeId: string | null;
  projectMode: 'series' | 'individual'; // Fix: Added mode tracking for UI conditional rendering
  setProjectMode: (mode: 'series' | 'individual') => void;
  setActiveSeries: (id: string | null) => void;
  setActiveEpisode: (id: string | null) => void;
};

export const useActiveStore = create<SeriesState>()(
  persist(
    (set) => ({
      activeSeriesId: null,
      activeEpisodeId: null,
      projectMode: 'series',
      setProjectMode: (mode) => set({ projectMode: mode }),
      setActiveSeries: (id) => set({ activeSeriesId: id }),
      setActiveEpisode: (id) => set({ activeEpisodeId: id }),
    }),
    { name: 'active-store' }
  )
);

// ─── Script Store ───
type ScriptState = {
  currentScript: ScriptData | null;
  variants: ScriptData[];
  activeVariantIndex: number;
  isGenerating: boolean;
  language: 'en' | 'hi' | 'hinglish';
  setScript: (script: ScriptData | null) => void;
  setVariants: (variants: ScriptData[]) => void;
  setActiveVariant: (index: number) => void;
  addVariant: (variant: ScriptData) => void;
  setGenerating: (generating: boolean) => void;
  setLanguage: (lang: 'en' | 'hi' | 'hinglish') => void;
  clearScript: () => void;
};

export const useScriptStore = create<ScriptState>()(
  (set) => ({
    currentScript: null,
    variants: [],
    activeVariantIndex: 0,
    isGenerating: false,
    language: 'en',
    setScript: (script) => set({ currentScript: script }),
    setVariants: (variants) => set({ variants }),
    setActiveVariant: (index) => set({ activeVariantIndex: index }),
    addVariant: (variant) => set((s) => ({ variants: [...s.variants, variant] })),
    setGenerating: (generating) => set({ isGenerating: generating }),
    setLanguage: (lang) => set({ language: lang }),
    clearScript: () => set({ currentScript: null, variants: [], activeVariantIndex: 0 }),
  })
);

// ─── Video / Render Store ───
type VideoState = {
  renderQueue: Episode[];
  currentVideoUrl: string | null;
  pipelineStep: number;
  setRenderQueue: (queue: Episode[]) => void;
  setCurrentVideo: (url: string | null) => void;
  setPipelineStep: (step: number) => void;
};

export const useVideoStore = create<VideoState>()(
  (set) => ({
    renderQueue: [],
    currentVideoUrl: null,
    pipelineStep: 0,
    setRenderQueue: (queue) => set({ renderQueue: queue }),
    setCurrentVideo: (url) => set({ currentVideoUrl: url }),
    setPipelineStep: (step) => set({ pipelineStep: step }),
  })
);
 
// ─── Navigation / Spotlight Store ───
type SpotlightTarget = {
  moduleId: string;
  label: string;
  selector: string;
} | null;

type NavState = {
  activeModule: string;
  activeSubTab: Record<string, string>;
  spotlight: SpotlightTarget;
  setActiveModule: (id: string) => void;
  setActiveSubTab: (module: string, tab: string) => void;
  setSpotlight: (target: SpotlightTarget) => void;
  clearSpotlight: () => void;
};

export const useNavStore = create<NavState>()(
  (set) => ({
    activeModule: 'cockpit',
    activeSubTab: {},
    spotlight: null,
    setActiveModule: (id) => set({ activeModule: id }),
    setActiveSubTab: (module, tab) => set((s) => ({ activeSubTab: { ...s.activeSubTab, [module]: tab } })),
    setSpotlight: (target) => set({ spotlight: target }),
    clearSpotlight: () => set({ spotlight: null }),
  })
);

// ─── System / Cockpit Store ───
type SystemState = {
  panicActive: boolean;
  zenMode: boolean;
  timelineStage: number; 
  timeSavedMinutes: number;
  systemBadges: Record<string, boolean>;
  soundFxEnabled: boolean;
  triggerPanic: () => void;
  clearPanic: () => void;
  toggleZen: () => void;
  setTimelineStage: (stage: number) => void;
  addTimeSaved: (minutes: number) => void;
  setBadge: (module: string, active: boolean) => void;
  toggleSoundFx: () => void;
};

export const useSystemStore = create<SystemState>()(
  (set) => ({
    panicActive: false,
    zenMode: false,
    timelineStage: 0,
    timeSavedMinutes: 0,
    systemBadges: {},
    soundFxEnabled: true,
    triggerPanic: () => set({ panicActive: true }),
    clearPanic: () => set({ panicActive: false }),
    toggleZen: () => set((s) => ({ zenMode: !s.zenMode })),
    setTimelineStage: (stage) => set({ timelineStage: stage }),
    addTimeSaved: (minutes) => set((s) => ({ timeSavedMinutes: s.timeSavedMinutes + minutes })),
    setBadge: (module, active) => set((s) => ({ systemBadges: { ...s.systemBadges, [module]: active } })),
    toggleSoundFx: () => set((s) => ({ soundFxEnabled: !s.soundFxEnabled })),
  })
);

// ─── Toast Store ───
type Toast = {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  attempt?: number;
};

type ToastState = {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type'], attempt?: number) => void;
  removeToast: (id: string) => void;
};

export const useToastStore = create<ToastState>()(
  (set) => ({
    toasts: [],
    addToast: (message, type = 'info', attempt) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      set((s) => ({ toasts: [...s.toasts, { id, message, type, attempt }] }));
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, 4000); // UI Polish: Standardized toast time to 4s
    },
    removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  })
);
// ─── Backend Status Store ───
// Tracks reachability of server-side integrations. All secrets/keys live only
// in Supabase Edge Function environment variables — the client never sees them.
// Services default to available; a failed call surfaces its own toast rather
// than being pre-emptively gated on a client-guessed "configured" state.
type BackendServices = {
  gemini: boolean;
  fal: boolean;
  elevenlabs: boolean;
  supabase: boolean;
};

type BackendStatusState = {
  status: 'online' | 'offline' | 'loading';
  services: BackendServices;
  setStatus: (status: 'online' | 'offline' | 'loading') => void;
  setServiceStatus: (service: keyof BackendServices, available: boolean) => void;
};

export const useBackendStatusStore = create<BackendStatusState>()((set) => ({
  status: 'online',
  services: { gemini: true, fal: true, elevenlabs: true, supabase: true },
  setStatus: (status) => set({ status }),
  setServiceStatus: (service, available) =>
    set((s) => ({ services: { ...s.services, [service]: available } })),
}));
  
