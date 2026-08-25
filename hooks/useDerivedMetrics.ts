import { useMemo } from 'react';
import { useUserStore, calcBMR, calcTDEE, calcReadiness, stepsToCalories } from '@/stores/userStore';

export function useDerivedMetrics() {
  const profile = useUserStore((s) => s.profile);
  const workoutCaloriesToday = useUserStore((s) => s.workoutCaloriesToday);
  const sleepHours = useUserStore((s) => s.sleepHours);
  const sleepQuality = useUserStore((s) => s.sleepQuality);
  const stepsToday = useUserStore((s) => s.stepsToday);

  const bmr = useMemo(() => (profile ? calcBMR(profile) : 0), [profile]);

  const stepsCal = useMemo(
    () => (profile ? stepsToCalories(stepsToday, profile.weight) : 0),
    [stepsToday, profile]
  );

  const tdee = useMemo(
    () => (profile ? calcTDEE(profile, workoutCaloriesToday + stepsCal) : 0),
    [profile, workoutCaloriesToday, stepsCal]
  );

  const readinessScore = useMemo(
    () => calcReadiness(sleepHours, stepsToday, sleepQuality),
    [sleepHours, stepsToday, sleepQuality]
  );

  const calorieGoal = useMemo(
    () =>
      profile
        ? Math.round(
            tdee *
              (profile.goals.includes('Lose Weight')
                ? 0.8
                : profile.goals.includes('Build Muscle')
                ? 1.1
                : 1.0)
          )
        : 2200,
    [profile, tdee]
  );

  return { bmr, tdee, readinessScore, calorieGoal };
}
