import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, Exercise } from '@/data/mockData';

const STORAGE_KEY = '@vytal_current_workout';

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

interface WorkoutStoreContextType {
  currentPlan: CurrentWorkoutPlan | null;
  startWorkout: (workout: Workout) => Promise<void>;
  endWorkout: () => Promise<void>;
  updateExercise: (id: string, updates: Partial<Pick<ExerciseInstance, 'sets' | 'reps' | 'rest'>>) => Promise<void>;
  removeExercise: (id: string) => Promise<void>;
  swapExercise: (oldId: string, newExercise: Exercise) => Promise<void>;
  markSetComplete: (exerciseId: string) => Promise<void>;
  addCustomActivity: (name: string, durationMinutes: number, estimatedCaloriesBurned: number) => Promise<void>;
  removeCustomActivity: (id: string) => Promise<void>;
  reorderExercises: (fromIndex: number, toIndex: number) => Promise<void>;
}

const WorkoutStoreContext = createContext<WorkoutStoreContextType | null>(null);

export function WorkoutStoreProvider({ children }: { children: React.ReactNode }) {
  const [currentPlan, setCurrentPlan] = useState<CurrentWorkoutPlan | null>(null);
  const persist = useCallback((plan: CurrentWorkoutPlan | null) => {
    setCurrentPlan(plan);
    if (plan) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plan)).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  }, []);

  const startWorkout = useCallback(async (workout: Workout) => {
    const plan: CurrentWorkoutPlan = {
      workoutId: workout.id,
      name: workout.name,
      exercises: workout.exercises.map(exerciseToInstance),
      customActivities: [],
      startedAt: new Date().toISOString(),
      isActive: true,
    };
    persist(plan);
  }, [persist]);

  const endWorkout = useCallback(async () => {
    persist(null);
  }, [persist]);

  const updateExercise = useCallback(async (id: string, updates: Partial<Pick<ExerciseInstance, 'sets' | 'reps' | 'rest'>>) => {
    setCurrentPlan(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        exercises: prev.exercises.map(ex =>
          ex.id === id ? { ...ex, ...updates } : ex
        ),
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const removeExercise = useCallback(async (id: string) => {
    setCurrentPlan(prev => {
      if (!prev) return prev;
      const next = { ...prev, exercises: prev.exercises.filter(ex => ex.id !== id) };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const swapExercise = useCallback(async (oldId: string, newExercise: Exercise) => {
    setCurrentPlan(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        exercises: prev.exercises.map(ex =>
          ex.id === oldId ? { ...exerciseToInstance(newExercise), id: ex.id, completedSets: 0 } : ex
        ),
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const markSetComplete = useCallback(async (exerciseId: string) => {
    setCurrentPlan(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        exercises: prev.exercises.map(ex =>
          ex.id === exerciseId && ex.completedSets < ex.sets
            ? { ...ex, completedSets: ex.completedSets + 1 }
            : ex
        ),
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const addCustomActivity = useCallback(async (name: string, durationMinutes: number, estimatedCaloriesBurned: number) => {
    const activity: CustomActivityInstance = {
      id: uid('ca'),
      name,
      durationMinutes,
      estimatedCaloriesBurned,
      loggedAt: new Date().toISOString(),
    };
    setCurrentPlan(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        customActivities: [...prev.customActivities, activity],
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const removeCustomActivity = useCallback(async (id: string) => {
    setCurrentPlan(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        customActivities: prev.customActivities.filter(a => a.id !== id),
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const reorderExercises = useCallback(async (fromIndex: number, toIndex: number) => {
    setCurrentPlan(prev => {
      if (!prev) return prev;
      const exercises = [...prev.exercises];
      const [moved] = exercises.splice(fromIndex, 1);
      exercises.splice(toIndex, 0, moved);
      const next = { ...prev, exercises };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <WorkoutStoreContext.Provider
      value={{
        currentPlan,
        startWorkout,
        endWorkout,
        updateExercise,
        removeExercise,
        swapExercise,
        markSetComplete,
        addCustomActivity,
        removeCustomActivity,
        reorderExercises,
      }}
    >
      {children}
    </WorkoutStoreContext.Provider>
  );
}

export function useWorkoutStore() {
  const ctx = useContext(WorkoutStoreContext);
  if (!ctx) throw new Error('useWorkoutStore must be used within WorkoutStoreProvider');
  return ctx;
}
