import React, { createContext, useContext, useMemo } from 'react';
import {
  useUserStore,
  calcBMR,
  calcTDEE,
  calcReadiness,
  stepsToCalories,
  type UserProfile,
  type WorkoutIntent,
  type TodayWorkoutModification,
} from '@/stores/userStore';

// Re-export types for backward compatibility
export type { UserProfile, WorkoutIntent, TodayWorkoutModification } from '@/stores/userStore';
export { calcBMR, calcTDEE, calcReadiness, stepsToCalories } from '@/stores/userStore';

interface UserContextType {
  profile: ReturnType<typeof useUserStore.getState>['profile'];
  fitScore: number;
  streak: number;
  totalWorkouts: number;
  weeklyActivity: number[];
  nutritionToday: { calories: number; protein: number; carbs: number; fat: number };
  workoutCaloriesToday: number;
  level: number;
  xp: number;
  plan: Record<string, unknown> | null;
  weeklySchedule: Record<string, import('@/data/mockData').Workout> | null;
  workoutIntent: WorkoutIntent;
  sleepHours: number;
  sleepQuality: 'poor' | 'fair' | 'good' | 'excellent' | null;
  stepsToday: number;
  isLoading: boolean;
  bmr: number;
  tdee: number;
  readinessScore: number;
  calorieGoal: number;
  setProfile: (profile: UserProfile) => Promise<void>;
  completeWorkout: (calories: number) => Promise<void>;
  updateNutrition: (item: { calories: number; protein: number; carbs: number; fat: number }) => Promise<void>;
  setPlan: (plan: Record<string, unknown>) => Promise<void>;
  setWeeklySchedule: (schedule: Record<string, import('@/data/mockData').Workout>) => Promise<void>;
  setWorkoutIntent: (intent: WorkoutIntent) => Promise<void>;
  modifyTodaysWorkout: (modification: TodayWorkoutModification) => Promise<void>;
  setSleepHours: (hours: number) => Promise<void>;
  setSleepQuality: (quality: 'poor' | 'fair' | 'good' | 'excellent' | null) => Promise<void>;
  setStepsToday: (steps: number) => Promise<void>;
  resetNutrition: () => Promise<void>;
  resetUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const state = useUserStore();
  const actions = useUserStore((s) => ({
    setProfile: s.setProfile,
    completeWorkout: s.completeWorkout,
    updateNutrition: s.updateNutrition,
    setPlan: s.setPlan,
    setWeeklySchedule: s.setWeeklySchedule,
    setWorkoutIntent: s.setWorkoutIntent,
    modifyTodaysWorkout: s.modifyTodaysWorkout,
    setSleepHours: s.setSleepHours,
    setSleepQuality: s.setSleepQuality,
    setStepsToday: s.setStepsToday,
    resetNutrition: s.resetNutrition,
    resetUser: s.resetUser,
  }));

  const bmr = state.profile ? calcBMR(state.profile) : 0;
  const stepsCal = state.profile ? stepsToCalories(state.stepsToday, state.profile.weight) : 0;
  const tdee = state.profile ? calcTDEE(state.profile, state.workoutCaloriesToday + stepsCal) : 0;
  const readinessScore = calcReadiness(state.sleepHours, state.stepsToday, state.sleepQuality);
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

  // Wrap actions as async for backward compat (consumers use `await setProfile(...)`)
  const wrappedActions = useMemo(() => {
    const wrap = <T extends unknown[]>(fn: (...args: T) => void) =>
      (...args: T) => Promise.resolve(fn(...args));
    return {
      setProfile: wrap(actions.setProfile),
      completeWorkout: wrap(actions.completeWorkout),
      updateNutrition: wrap(actions.updateNutrition),
      setPlan: wrap(actions.setPlan),
      setWeeklySchedule: wrap(actions.setWeeklySchedule),
      setWorkoutIntent: wrap(actions.setWorkoutIntent),
      modifyTodaysWorkout: wrap(actions.modifyTodaysWorkout),
      setSleepHours: wrap(actions.setSleepHours),
      setSleepQuality: wrap(actions.setSleepQuality),
      setStepsToday: wrap(actions.setStepsToday),
      resetNutrition: wrap(actions.resetNutrition),
      resetUser: wrap(actions.resetUser),
    };
  }, [actions]);

  const value: UserContextType = useMemo(
    () => ({
      profile: state.profile,
      fitScore: state.fitScore,
      streak: state.streak,
      totalWorkouts: state.totalWorkouts,
      weeklyActivity: state.weeklyActivity,
      nutritionToday: state.nutritionToday,
      workoutCaloriesToday: state.workoutCaloriesToday,
      level: state.level,
      xp: state.xp,
      plan: state.plan,
      weeklySchedule: state.weeklySchedule,
      workoutIntent: state.workoutIntent,
      sleepHours: state.sleepHours,
      sleepQuality: state.sleepQuality,
      stepsToday: state.stepsToday,
      isLoading: state.isLoading,
      bmr,
      tdee,
      readinessScore,
      calorieGoal,
      ...wrappedActions,
    }),
    [state, bmr, tdee, readinessScore, calorieGoal, wrappedActions]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
