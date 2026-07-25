import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exercise, Workout, WORKOUTS } from '@/data/mockData';

const STORAGE_KEY = '@vytal_user_v2';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PLAN_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
  weight: number;   // kg
  height: number;   // cm
  gender: 'male' | 'female' | 'other';
  goals: string[];
  injuries: string[];
  equipment: string[];
  stressLevel: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  onboardingComplete: boolean;
}

/** Mifflin-St Jeor BMR, kcal/day */
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

/** TDEE = BMR × activity factor + workout calories burned today */
export function calcTDEE(profile: UserProfile, workoutCaloriesToday: number = 0): number {
  return Math.round(calcBMR(profile) * ACTIVITY_FACTORS[profile.activityLevel] + workoutCaloriesToday);
}

/** Calories burned from steps (MET-based rough estimate at avg pace) */
export function stepsToCalories(steps: number, weightKg: number): number {
  return Math.round(steps * 0.04 * (weightKg / 70));
}

/** Readiness score 0–100 based on sleep + steps + sleep quality */
export function calcReadiness(sleepHours: number, steps: number, sleepQuality: 'poor' | 'fair' | 'good' | 'excellent' | null): number {
  const sleepScore = Math.min(sleepHours / 8, 1) * 55; // 55% weight on duration
  const qualityBonus = sleepQuality === 'excellent' ? 10 : sleepQuality === 'good' ? 5 : sleepQuality === 'fair' ? -2 : sleepQuality === 'poor' ? -8 : 0;
  const stepsScore = Math.min(steps / 8000, 1) * 35;   // 35% weight on steps
  return Math.max(0, Math.min(100, Math.round(sleepScore + qualityBonus + stepsScore)));
}

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
  lastActiveDate: string; // ISO date string YYYY-MM-DD for daily resets
  isLoading: boolean;
}

interface UserContextType extends UserState {
  bmr: number;
  tdee: number;
  readinessScore: number;
  calorieGoal: number;
  setProfile: (profile: UserProfile) => Promise<void>;
  completeWorkout: (calories: number) => Promise<void>;
  updateNutrition: (item: { calories: number; protein: number; carbs: number; fat: number }) => Promise<void>;
  setPlan: (plan: Record<string, unknown>) => Promise<void>;
  setWeeklySchedule: (schedule: Record<string, Workout>) => Promise<void>;
  setWorkoutIntent: (intent: WorkoutIntent) => Promise<void>;
  modifyTodaysWorkout: (modification: TodayWorkoutModification) => Promise<void>;
  setSleepHours: (hours: number) => Promise<void>;
  setSleepQuality: (quality: 'poor' | 'fair' | 'good' | 'excellent' | null) => Promise<void>;
  setStepsToday: (steps: number) => Promise<void>;
  resetNutrition: () => Promise<void>;
  resetUser: () => Promise<void>;
}

const defaultNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const defaultWorkoutIntent: WorkoutIntent = { sport: 'Bodybuilding', goal: 'Hypertrophy' };
const defaultProfile: UserProfile = {
  name: '',
  age: 25,
  weight: 70,
  height: 175,
  gender: 'male',
  goals: [],
  injuries: [],
  equipment: [],
  stressLevel: 5,
  activityLevel: 'moderate',
  onboardingComplete: false,
};

const UserContext = createContext<UserContextType | null>(null);

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

function recalcWorkout(workout: Workout, exercises: Exercise[]): Workout {
  const muscleGroups = Array.from(new Set(exercises.map((e) => e.muscleGroup).filter(Boolean)));
  return {
    ...workout,
    exercises,
    muscleGroups,
    duration: Math.max(exercises.length ? 12 : 0, exercises.reduce((sum, e) => sum + e.sets * 4, 0)),
    calories: Math.max(exercises.length ? 80 : 0, exercises.reduce((sum, e) => sum + e.sets * 35, 0)),
  };
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

function exerciseFromName(name: string): Exercise {
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

function findExerciseIndex(exercises: Exercise[], exerciseName?: string): number {
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

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserState>({
    profile: null,
    fitScore: 0,
    streak: 0,
    totalWorkouts: 0,
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
    nutritionToday: defaultNutrition,
    workoutCaloriesToday: 0,
    level: 1,
    xp: 0,
    plan: null,
    weeklySchedule: null,
    workoutIntent: defaultWorkoutIntent,
    sleepHours: 0,
    sleepQuality: null,
    stepsToday: 0,
    lastActiveDate: '',
    isLoading: true,
  });

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const today = new Date().toISOString().slice(0, 10);
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const saved = JSON.parse(raw) as Partial<UserState>;
            // Daily reset: if it's a new day, wipe transient daily fields
            const isNewDay = saved.lastActiveDate !== today;
            const dailyReset = isNewDay
              ? { sleepHours: 0, sleepQuality: null as 'poor' | 'fair' | 'good' | 'excellent' | null, stepsToday: 0, nutritionToday: defaultNutrition, workoutCaloriesToday: 0, lastActiveDate: today }
              : {};
            setState((prev) => ({ ...prev, ...saved, ...dailyReset, isLoading: false }));
            if (isNewDay) {
              AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, ...dailyReset })).catch(() => {});
            }
          } catch {
            setState((prev) => ({ ...prev, isLoading: false }));
          }
        } else {
          setState((prev) => ({ ...prev, lastActiveDate: today, isLoading: false }));
        }
      })
      .catch(() => setState((prev) => ({ ...prev, isLoading: false })));
  }, []);

  const persist = useCallback((updates: Partial<UserState>) => {
    setState((prev) => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setProfile = useCallback(async (profile: UserProfile) => {
    persist({ profile });
  }, [persist]);

  const completeWorkout = useCallback(async (calories: number) => {
    setState((prev) => {
      const dayIdx = new Date().getDay();
      const adjusted = dayIdx === 0 ? 6 : dayIdx - 1;
      const weekly = [...prev.weeklyActivity];
      weekly[adjusted] = Math.min((weekly[adjusted] ?? 0) + 1, 5);
      const newXp = prev.xp + 150;
      const newFitScore = Math.min(prev.fitScore + Math.floor(Math.random() * 20) + 10, 9999);
      const updated: Partial<UserState> = {
        totalWorkouts: prev.totalWorkouts + 1,
        streak: prev.streak + 1,
        weeklyActivity: weekly,
        xp: newXp,
        level: calcLevel(newXp),
        fitScore: newFitScore,
        workoutCaloriesToday: prev.workoutCaloriesToday + calories,
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...updated })).catch(() => {});
      return { ...prev, ...updated };
    });
  }, []);

  const updateNutrition = useCallback(async (item: { calories: number; protein: number; carbs: number; fat: number }) => {
    setState((prev) => {
      const n = prev.nutritionToday;
      const updated = {
        nutritionToday: {
          calories: n.calories + item.calories,
          protein: n.protein + item.protein,
          carbs: n.carbs + item.carbs,
          fat: n.fat + item.fat,
        },
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...updated })).catch(() => {});
      return { ...prev, ...updated };
    });
  }, []);

  const setPlan = useCallback(async (plan: Record<string, unknown>) => {
    persist({ plan });
  }, [persist]);

  const setWeeklySchedule = useCallback(async (weeklySchedule: Record<string, Workout>) => {
    persist({ weeklySchedule });
  }, [persist]);

  const setWorkoutIntent = useCallback(async (workoutIntent: WorkoutIntent) => {
    persist({ workoutIntent });
  }, [persist]);

  const modifyTodaysWorkout = useCallback(async (modification: TodayWorkoutModification) => {
    setState((prev) => {
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

      const nextSchedule = {
        ...baseSchedule,
        [todayName]: recalcWorkout(workout, nextExercises),
      };
      const next = { ...prev, weeklySchedule: nextSchedule };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setSleepHours = useCallback(async (sleepHours: number) => {
    persist({ sleepHours });
  }, [persist]);

  const setSleepQuality = useCallback(async (quality: 'poor' | 'fair' | 'good' | 'excellent' | null) => {
    persist({ sleepQuality: quality });
  }, [persist]);

  const setStepsToday = useCallback(async (stepsToday: number) => {
    persist({ stepsToday });
  }, [persist]);

  const resetNutrition = useCallback(async () => {
    persist({ nutritionToday: defaultNutrition, workoutCaloriesToday: 0 });
  }, [persist]);

  const resetUser = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setState({
      profile: null,
      fitScore: 0,
      streak: 0,
      totalWorkouts: 0,
      weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
      nutritionToday: defaultNutrition,
      workoutCaloriesToday: 0,
      level: 1,
      xp: 0,
      plan: null,
      weeklySchedule: null,
      workoutIntent: defaultWorkoutIntent,
      sleepHours: 0,
      sleepQuality: null,
      stepsToday: 0,
      lastActiveDate: new Date().toISOString().slice(0, 10),
      isLoading: false,
    });
  }, []);

  const bmr = state.profile ? calcBMR(state.profile) : 0;
  const stepsCal = state.profile ? stepsToCalories(state.stepsToday, state.profile.weight) : 0;
  const tdee = state.profile ? calcTDEE(state.profile, state.workoutCaloriesToday + stepsCal) : 0;
  const readinessScore = calcReadiness(state.sleepHours, state.stepsToday, state.sleepQuality);

  // Calorie goal: TDEE adjusted for goal
  const calorieGoal = state.profile
    ? Math.round(
        tdee *
          (state.profile.goals.includes('Lose Weight')
            ? 0.8
            : state.profile.goals.includes('Build Muscle')
            ? 1.1
            : 1.0)
      )
    : 2200;

  return (
    <UserContext.Provider
      value={{
        ...state,
        bmr,
        tdee,
        readinessScore,
        calorieGoal,
        setProfile,
        completeWorkout,
        updateNutrition,
        setPlan,
        setWeeklySchedule,
        setWorkoutIntent,
        modifyTodaysWorkout,
        setSleepHours,
        setSleepQuality,
        setStepsToday,
        resetNutrition,
        resetUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
