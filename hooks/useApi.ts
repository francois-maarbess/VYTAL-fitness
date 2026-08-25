import { useMutation, useQuery } from '@tanstack/react-query';
import { getApiBaseUrl } from '@/lib/api';

// ── Nutrition analysis ────────────────────────────────────────────────────────
export interface NutritionResult {
  isValidFood: boolean;
  foodSummary: string | null;
  items: { name: string; weightGrams: number; macros: { calories: number; protein: number; carbs: number; fat: number } }[];
  macros: { calories: number; protein: number; carbs: number; fat: number };
  message: string;
}

export function useNutritionAnalyze() {
  return useMutation({
    mutationFn: async ({ text, token }: { text: string; token?: string | null }) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${getApiBaseUrl()}api/nutrition/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as NutritionResult;
    },
  });
}

// ── Exercise library search ───────────────────────────────────────────────────
export type LibraryExercise = {
  id: number | string;
  name: string;
  category: string;
  targetMuscle: string;
  equipment: string;
  primaryMuscles?: string[];
  estimatedCaloriesPerMinute?: number;
};

export function useExerciseSearch(query: string, category: string, enabled = true) {
  return useQuery({
    queryKey: ['exercises', query, category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (category !== 'All') params.set('category', category);
      params.set('limit', '60');
      const res = await fetch(`${getApiBaseUrl()}api/exercises?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { exercises?: LibraryExercise[] };
      return data.exercises ?? [];
    },
    staleTime: 60_000,
    enabled,
  });
}

// ── Generate plan (onboarding) ────────────────────────────────────────────────
export function useGeneratePlan() {
  return useMutation({
    mutationFn: async ({ profile }: { profile: Record<string, unknown> }) => {
      const res = await fetch(`${getApiBaseUrl()}api/coach/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as Record<string, unknown>;
    },
  });
}
