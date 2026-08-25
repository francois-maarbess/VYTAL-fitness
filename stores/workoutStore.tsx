import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, Exercise } from '@/data/mockData';

export interface ExerciseInstance {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: number;
  muscleGroup: string;
  completedSets: number;
}

export interface CustomActivityInstance {
  id: string;
  name: string;
  durationMinutes: number;
  estimatedCaloriesBurned: number;
  loggedAt: string;
}

export interface CurrentWorkoutPlan {
  workoutId: string;
  name: string;
  exercises: ExerciseInstance[];
  customActivities: CustomActivityInstance[];
  startedAt: string;
  isActive: boolean;
}

let counter = 0;
function uid(prefix: string): string {
  counter++;
  return `${prefix}-${Date.now()}-${counter}`;
}

function exerciseToInstance(ex: Exercise): ExerciseInstance {
  return {
    id: uid('ex'),
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    rest: ex.rest,
    muscleGroup: ex.muscleGroup,
    completedSets: 0,
  };
}

interface WorkoutState {
  currentPlan: CurrentWorkoutPlan | null;
}

interface WorkoutActions {
  startWorkout: (workout: Workout) => void;
  endWorkout: () => void;
  updateExercise: (id: string, updates: Partial<Pick<ExerciseInstance, 'sets' | 'reps' | 'rest'>>) => void;
  removeExercise: (id: string) => void;
  swapExercise: (oldId: string, newExercise: Exercise) => void;
  markSetComplete: (exerciseId: string) => void;
  addCustomActivity: (name: string, durationMinutes: number, estimatedCaloriesBurned: number) => void;
  removeCustomActivity: (id: string) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;
}

export const useWorkoutStore = create<WorkoutState & WorkoutActions>()(
  persist(
    (set) => ({
      currentPlan: null,

      startWorkout: (workout) =>
        set({
          currentPlan: {
            workoutId: workout.id,
            name: workout.name,
            exercises: workout.exercises.map(exerciseToInstance),
            customActivities: [],
            startedAt: new Date().toISOString(),
            isActive: true,
          },
        }),

      endWorkout: () => set({ currentPlan: null }),

      updateExercise: (id, updates) =>
        set((prev) => {
          if (!prev.currentPlan) return prev;
          return {
            currentPlan: {
              ...prev.currentPlan,
              exercises: prev.currentPlan.exercises.map((ex) =>
                ex.id === id ? { ...ex, ...updates } : ex
              ),
            },
          };
        }),

      removeExercise: (id) =>
        set((prev) => {
          if (!prev.currentPlan) return prev;
          return {
            currentPlan: {
              ...prev.currentPlan,
              exercises: prev.currentPlan.exercises.filter((ex) => ex.id !== id),
            },
          };
        }),

      swapExercise: (oldId, newExercise) =>
        set((prev) => {
          if (!prev.currentPlan) return prev;
          return {
            currentPlan: {
              ...prev.currentPlan,
              exercises: prev.currentPlan.exercises.map((ex) =>
                ex.id === oldId ? { ...exerciseToInstance(newExercise), id: ex.id, completedSets: 0 } : ex
              ),
            },
          };
        }),

      markSetComplete: (exerciseId) =>
        set((prev) => {
          if (!prev.currentPlan) return prev;
          return {
            currentPlan: {
              ...prev.currentPlan,
              exercises: prev.currentPlan.exercises.map((ex) =>
                ex.id === exerciseId && ex.completedSets < ex.sets
                  ? { ...ex, completedSets: ex.completedSets + 1 }
                  : ex
              ),
            },
          };
        }),

      addCustomActivity: (name, durationMinutes, estimatedCaloriesBurned) =>
        set((prev) => {
          if (!prev.currentPlan) return prev;
          return {
            currentPlan: {
              ...prev.currentPlan,
              customActivities: [
                ...prev.currentPlan.customActivities,
                {
                  id: uid('ca'),
                  name,
                  durationMinutes,
                  estimatedCaloriesBurned,
                  loggedAt: new Date().toISOString(),
                },
              ],
            },
          };
        }),

      removeCustomActivity: (id) =>
        set((prev) => {
          if (!prev.currentPlan) return prev;
          return {
            currentPlan: {
              ...prev.currentPlan,
              customActivities: prev.currentPlan.customActivities.filter((a) => a.id !== id),
            },
          };
        }),

      reorderExercises: (fromIndex, toIndex) =>
        set((prev) => {
          if (!prev.currentPlan) return prev;
          const exercises = [...prev.currentPlan.exercises];
          const [moved] = exercises.splice(fromIndex, 1);
          exercises.splice(toIndex, 0, moved);
          return {
            currentPlan: { ...prev.currentPlan, exercises },
          };
        }),
    }),
    {
      name: '@vytal_current_workout',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Re-export hook with old name for backward compat
export function useWorkoutStoreHook() {
  return useWorkoutStore();
}
