// --- src/lib/geminiClient.ts ---
import { useAiCacheStore, useToastStore } from './stores';
import { supabase } from './supabase';

interface GenerateParams {
  prompt: string;
  systemInstruction?: string;
  maxOutputTokens?: number;
}

// Simple hash to uniquely identify requests (used for caching + de-duping)
const generateHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
};

export const generateAIContent = async ({
  prompt,
  systemInstruction,
  maxOutputTokens = 8192,
}: GenerateParams): Promise<string> => {
  const hash = generateHash(prompt + (systemInstruction || ''));
  const cacheStore = useAiCacheStore.getState();
  const toastStore = useToastStore.getState();

  // 1. CACHE CHECK: Prevent duplicate requests
  if (cacheStore.hasCache(hash)) {
    return cacheStore.cache[hash];
  }

  // 2. QUEUE CHECK: Prevent React double-firing
  if (cacheStore.isRequesting(hash)) {
    throw new Error('Generation already in progress');
  }

  cacheStore.addRequest(hash);

  try {
    // 3. SECURE BACKEND CALL: the Gemini key never touches the browser —
    // it lives only in the Supabase Edge Function's environment variables.
    const { data, error } = await supabase.functions.invoke('api-gemini', {
      body: {
        prompt,
        systemInstruction,
        // api-gemini validates this as a nested object (see PayloadSchema
        // in supabase/functions/api-gemini/index.ts) — sending it flat
        // caused it to be silently dropped and the server-side default
        // to be used instead, regardless of what a module requested.
        generationConfig: { maxOutputTokens },
      },
    });

    if (error) {
      console.error('Supabase Edge Function Error:', error);
      // api-gemini returns a JSON body of { error, code, details } on
      // non-2xx responses. Try to surface that real message; fall back
      // to a generic one if the body isn't readable for any reason.
      let serverMessage = '';
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx) {
          const body = await ctx.clone().json();
          if (typeof body?.error === 'string') serverMessage = body.error;
        }
      } catch {
        // response body wasn't JSON or already consumed — ignore
      }
      throw new Error(serverMessage || 'Backend AI generation failed. Please try again.');
    }

    // api-gemini responds with { data: string, usage?: object }
    const resultText: string = (data?.data as string) || '';

    if (!resultText) {
      throw new Error('Empty response received from backend');
    }

    // 4. Save to cache and return
    cacheStore.setCache(hash, resultText);
    return resultText;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate content';
    toastStore.addToast(message, 'error');
    throw error;
  } finally {
    cacheStore.removeRequest(hash);
  }
};
