import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, WORKOUTS } from '@/data/mockData';

export interface WorkoutIntent {
  sport: string;
  goal: string;
}

export interface TodayWorkoutModification {
  action: 'add' | 'swap' | 'delete';
  exerciseName?: string;
  replacementName?: string;
  reason?: string;
}

export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female' | 'other';
  goals: string[];
  injuries: string[];
  equipment: string[];
  stressLevel: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  onboardingComplete: boolean;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PLAN_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const defaultWorkoutIntent: WorkoutIntent = { sport: 'Bodybuilding', goal: 'Hypertrophy' };

export interface UserState {
  profile: UserProfile | null;
  fitScore: number;
  streak: number;
  totalWorkouts: number;
  weeklyActivity: number[];
  nutritionToday: { calories: number; protein: number; carbs: number; fat: number };
  workoutCaloriesToday: number;
  level: number;
  xp: number;
  plan: Record<string, unknown> | null;
  weeklySchedule: Record<string, Workout> | null;
  workoutIntent: WorkoutIntent;
  sleepHours: number;
  sleepQuality: 'poor' | 'fair' | 'good' | 'excellent' | null;
  stepsToday: number;
  lastActiveDate: string;
  isLoading: boolean;
}

interface UserActions {
  setProfile: (profile: UserProfile) => void;
  completeWorkout: (calories: number) => void;
  updateNutrition: (item: { calories: number; protein: number; carbs: number; fat: number }) => void;
  setPlan: (plan: Record<string, unknown>) => void;
  setWeeklySchedule: (schedule: Record<string, Workout>) => void;
  setWorkoutIntent: (intent: WorkoutIntent) => void;
  modifyTodaysWorkout: (modification: TodayWorkoutModification) => void;
  setSleepHours: (hours: number) => void;
  setSleepQuality: (quality: 'poor' | 'fair' | 'good' | 'excellent' | null) => void;
  setStepsToday: (steps: number) => void;
  resetNutrition: () => void;
  resetUser: () => void;
  _setLoading: (loading: boolean) => void;
}

// Pure utility functions (exported for testing/context adapter)
export function calcBMR(profile: UserProfile): number {
  const base = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
  return profile.gender === 'female' ? base - 161 : base + 5;
}

const ACTIVITY_FACTORS: Record<UserProfile['activityLevel'], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calcTDEE(profile: UserProfile, workoutCaloriesToday: number = 0): number {
  return Math.round(calcBMR(profile) * ACTIVITY_FACTORS[profile.activityLevel] + workoutCaloriesToday);
}

export function stepsToCalories(steps: number, weightKg: number): number {
  return Math.round(steps * 0.04 * (weightKg / 70));
}

export function calcReadiness(sleepHours: number, steps: number, sleepQuality: 'poor' | 'fair' | 'good' | 'excellent' | null): number {
  const sleepScore = Math.min(sleepHours / 8, 1) * 55;
  const qualityBonus = sleepQuality === 'excellent' ? 10 : sleepQuality === 'good' ? 5 : sleepQuality === 'fair' ? -2 : sleepQuality === 'poor' ? -8 : 0;
  const stepsScore = Math.min(steps / 8000, 1) * 35;
  return Math.max(0, Math.min(100, Math.round(sleepScore + qualityBonus + stepsScore)));
}

function calcLevel(xp: number) {
  return Math.floor(xp / 500) + 1;
}

function fallbackSchedule(): Record<string, Workout> {
  return PLAN_DAYS.reduce<Record<string, Workout>>((acc, day, index) => {
    const fallback = WORKOUTS[index % WORKOUTS.length];
    acc[day] = { ...fallback, id: fallback.id ?? day.toLowerCase().slice(0, 3) };
    return acc;
  }, {});
}

function inferMuscleGroup(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('shoulder') || lower.includes('external rotation') || lower.includes('rotator')) return 'Shoulders';
  if (lower.includes('hip') || lower.includes('glute')) return 'Glutes';
  if (lower.includes('jump') || lower.includes('squat') || lower.includes('lunge')) return 'Legs';
  if (lower.includes('plank') || lower.includes('core') || lower.includes('rotation')) return 'Core';
  if (lower.includes('row') || lower.includes('pull')) return 'Back';
  if (lower.includes('press') || lower.includes('push')) return 'Chest';
  return 'Full Body';
}

function exerciseFromName(name: string) {
  const lower = name.toLowerCase();
  const mobility = lower.includes('stretch') || lower.includes('mobility') || lower.includes('rotation') || lower.includes('external');
  return {
    name,
    sets: mobility ? 2 : 3,
    reps: mobility ? '12-15 controlled' : '8-12',
    rest: mobility ? 45 : 60,
    muscleGroup: inferMuscleGroup(name),
  };
}

function recalcWorkout(workout: Workout, exercises: { name: string; sets: number; reps: string; rest: number; muscleGroup: string }[]): Workout {
  const muscleGroups = Array.from(new Set(exercises.map((e) => e.muscleGroup).filter(Boolean)));
  return {
    ...workout,
    exercises,
    muscleGroups,
    duration: Math.max(exercises.length ? 12 : 0, exercises.reduce((sum, e) => sum + e.sets * 4, 0)),
    calories: Math.max(exercises.length ? 80 : 0, exercises.reduce((sum, e) => sum + e.sets * 35, 0)),
  };
}

function findExerciseIndex(exercises: Workout['exercises'], exerciseName?: string): number {
  if (!exerciseName) return -1;
  const needle = exerciseName.toLowerCase().trim();
  if (!needle) return -1;
  const exact = exercises.findIndex((exercise) => exercise.name.toLowerCase() === needle);
  if (exact >= 0) return exact;
  return exercises.findIndex((exercise) => {
    const haystack = exercise.name.toLowerCase();
    return haystack.includes(needle) || needle.includes(haystack);
  });
}

export const useUserStore = create<UserState & UserActions>()(
  persist(
    (set, get) => ({
      profile: null,
      fitScore: 0,
      streak: 0,
      totalWorkouts: 0,
      weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
      nutritionToday: { ...defaultNutrition },
      workoutCaloriesToday: 0,
      level: 1,
      xp: 0,
      plan: null,
      weeklySchedule: null,
      workoutIntent: { ...defaultWorkoutIntent },
      sleepHours: 0,
      sleepQuality: null,
      stepsToday: 0,
      lastActiveDate: '',
      isLoading: true,

      _setLoading: (loading) => set({ isLoading: loading }),

      setProfile: (profile) => set({ profile }),

      completeWorkout: (calories) =>
        set((prev) => {
          const dayIdx = new Date().getDay();
          const adjusted = dayIdx === 0 ? 6 : dayIdx - 1;
          const weekly = [...prev.weeklyActivity];
          weekly[adjusted] = Math.min((weekly[adjusted] ?? 0) + 1, 5);
          const newXp = prev.xp + 150;
          const newFitScore = Math.min(prev.fitScore + Math.floor(Math.random() * 20) + 10, 9999);
          return {
            totalWorkouts: prev.totalWorkouts + 1,
            streak: prev.streak + 1,
            weeklyActivity: weekly,
            xp: newXp,
            level: calcLevel(newXp),
            fitScore: newFitScore,
            workoutCaloriesToday: prev.workoutCaloriesToday + calories,
          };
        }),

      updateNutrition: (item) =>
        set((prev) => ({
          nutritionToday: {
            calories: prev.nutritionToday.calories + item.calories,
            protein: prev.nutritionToday.protein + item.protein,
            carbs: prev.nutritionToday.carbs + item.carbs,
            fat: prev.nutritionToday.fat + item.fat,
          },
        })),

      setPlan: (plan) => set({ plan }),

      setWeeklySchedule: (weeklySchedule) => set({ weeklySchedule }),

      setWorkoutIntent: (workoutIntent) => set({ workoutIntent }),

      modifyTodaysWorkout: (modification) =>
        set((prev) => {
          const todayName = DAY_NAMES[new Date().getDay()];
          const baseSchedule = prev.weeklySchedule ?? fallbackSchedule();
          const workout = baseSchedule[todayName] ?? fallbackSchedule()[todayName];
          const nextExercises = [...workout.exercises];
          const targetIndex = findExerciseIndex(nextExercises, modification.exerciseName);
          const replacement = (modification.replacementName ?? modification.exerciseName ?? '').trim();

          if (modification.action === 'delete' && targetIndex >= 0) {
            nextExercises.splice(targetIndex, 1);
          } else if (modification.action === 'swap' && replacement) {
            const swapIndex = targetIndex >= 0 ? targetIndex : 0;
            nextExercises[swapIndex] = exerciseFromName(replacement);
          } else if (modification.action === 'add' && replacement) {
            nextExercises.push(exerciseFromName(replacement));
          }

          return {
            weeklySchedule: {
              ...baseSchedule,
              [todayName]: recalcWorkout(workout, nextExercises),
            },
          };
        }),

      setSleepHours: (sleepHours) => set({ sleepHours }),

      setSleepQuality: (sleepQuality) => set({ sleepQuality }),

      setStepsToday: (stepsToday) => set({ stepsToday }),

      resetNutrition: () => set({ nutritionToday: { ...defaultNutrition }, workoutCaloriesToday: 0 }),

      resetUser: () =>
        set({
          profile: null,
          fitScore: 0,
          streak: 0,
          totalWorkouts: 0,
          weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
          nutritionToday: { ...defaultNutrition },
          workoutCaloriesToday: 0,
          level: 1,
          xp: 0,
          plan: null,
          weeklySchedule: null,
          workoutIntent: { ...defaultWorkoutIntent },
          sleepHours: 0,
          sleepQuality: null,
          stepsToday: 0,
          lastActiveDate: new Date().toISOString().slice(0, 10),
          isLoading: false,
        }),
    }),
    {
      name: '@vytal_user_v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        // Strip isLoading and transient derived state from persistence
        const { isLoading, ...rest } = state;
        return rest;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const today = new Date().toISOString().slice(0, 10);
        const isNewDay = state.lastActiveDate !== today;
        if (isNewDay && state.lastActiveDate) {
          state.setSleepHours(0);
          state.setSleepQuality(null);
          state.setStepsToday(0);
          state.resetNutrition();
          state.setWorkoutIntent(state.workoutIntent); // no-op, just to trigger persist
          useUserStore.setState({
            sleepHours: 0,
            sleepQuality: null,
            stepsToday: 0,
            nutritionToday: { ...defaultNutrition },
            workoutCaloriesToday: 0,
            lastActiveDate: today,
          });
        }
        state._setLoading(false);
      },
    }
  )
);
