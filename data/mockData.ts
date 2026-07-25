export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  muscleGroup: string;
}

export interface Workout {
  id: string;
  name: string;
  type: string;
  duration: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  exercises: Exercise[];
  muscleGroups: string[];
  calories: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  fitScore: number;
  streak: number;
  isCurrentUser?: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  iconColor: string;
  unlocked: boolean;
  progress: number;
  total: number;
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export const WORKOUTS: Workout[] = [
  {
    id: 'push-a',
    name: 'Push Day A',
    type: 'Strength',
    duration: 50,
    difficulty: 'Intermediate',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    calories: 380,
    exercises: [
      { name: 'Bench Press', sets: 4, reps: '8-10', rest: 90, muscleGroup: 'Chest' },
      { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: 75, muscleGroup: 'Chest' },
      { name: 'Overhead Press', sets: 3, reps: '8-10', rest: 90, muscleGroup: 'Shoulders' },
      { name: 'Lateral Raises', sets: 4, reps: '12-15', rest: 60, muscleGroup: 'Shoulders' },
      { name: 'Tricep Pushdown', sets: 3, reps: '12-15', rest: 60, muscleGroup: 'Triceps' },
      { name: 'Skull Crushers', sets: 3, reps: '10-12', rest: 60, muscleGroup: 'Triceps' },
    ],
  },
  {
    id: 'pull-a',
    name: 'Pull Day A',
    type: 'Strength',
    duration: 55,
    difficulty: 'Intermediate',
    muscleGroups: ['Back', 'Biceps', 'Rear Delts'],
    calories: 400,
    exercises: [
      { name: 'Deadlift', sets: 4, reps: '5-6', rest: 120, muscleGroup: 'Back' },
      { name: 'Pull-ups', sets: 4, reps: '6-8', rest: 90, muscleGroup: 'Back' },
      { name: 'Cable Row', sets: 3, reps: '10-12', rest: 75, muscleGroup: 'Back' },
      { name: 'Face Pulls', sets: 3, reps: '15-20', rest: 60, muscleGroup: 'Rear Delts' },
      { name: 'Barbell Curl', sets: 3, reps: '10-12', rest: 60, muscleGroup: 'Biceps' },
      { name: 'Hammer Curls', sets: 3, reps: '12-15', rest: 60, muscleGroup: 'Biceps' },
    ],
  },
  {
    id: 'legs-a',
    name: 'Leg Day A',
    type: 'Strength',
    duration: 60,
    difficulty: 'Advanced',
    muscleGroups: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
    calories: 450,
    exercises: [
      { name: 'Squat', sets: 5, reps: '5', rest: 120, muscleGroup: 'Quads' },
      { name: 'Romanian Deadlift', sets: 4, reps: '8-10', rest: 90, muscleGroup: 'Hamstrings' },
      { name: 'Leg Press', sets: 3, reps: '12-15', rest: 90, muscleGroup: 'Quads' },
      { name: 'Leg Curl', sets: 3, reps: '12-15', rest: 75, muscleGroup: 'Hamstrings' },
      { name: 'Hip Thrust', sets: 3, reps: '12-15', rest: 75, muscleGroup: 'Glutes' },
      { name: 'Standing Calf Raise', sets: 4, reps: '15-20', rest: 45, muscleGroup: 'Calves' },
    ],
  },
  {
    id: 'hiit-1',
    name: 'HIIT Cardio',
    type: 'Cardio',
    duration: 30,
    difficulty: 'Advanced',
    muscleGroups: ['Full Body'],
    calories: 320,
    exercises: [
      { name: 'Burpees', sets: 5, reps: '30s on 15s off', rest: 15, muscleGroup: 'Full Body' },
      { name: 'Mountain Climbers', sets: 5, reps: '30s on 15s off', rest: 15, muscleGroup: 'Core' },
      { name: 'Jump Squats', sets: 5, reps: '30s on 15s off', rest: 15, muscleGroup: 'Legs' },
      { name: 'High Knees', sets: 5, reps: '30s on 15s off', rest: 15, muscleGroup: 'Cardio' },
      { name: 'Box Jumps', sets: 4, reps: '10', rest: 30, muscleGroup: 'Legs' },
    ],
  },
  {
    id: 'core-1',
    name: 'Core & Mobility',
    type: 'Recovery',
    duration: 35,
    difficulty: 'Beginner',
    muscleGroups: ['Core', 'Flexibility'],
    calories: 180,
    exercises: [
      { name: 'Plank', sets: 3, reps: '60s hold', rest: 45, muscleGroup: 'Core' },
      { name: 'Dead Bug', sets: 3, reps: '10 each side', rest: 45, muscleGroup: 'Core' },
      { name: 'Russian Twists', sets: 3, reps: '20', rest: 45, muscleGroup: 'Core' },
      { name: 'Cat-Cow Stretch', sets: 2, reps: '10', rest: 30, muscleGroup: 'Spine' },
      { name: 'Hip Flexor Stretch', sets: 2, reps: '45s each', rest: 30, muscleGroup: 'Hip Flexors' },
      { name: 'Foam Rolling', sets: 1, reps: '5min', rest: 0, muscleGroup: 'Full Body' },
    ],
  },
];

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Marcus Chen', avatar: 'MC', fitScore: 9842, streak: 127 },
  { rank: 2, name: 'Aria Patel', avatar: 'AP', fitScore: 9710, streak: 98 },
  { rank: 3, name: 'Jake Morrison', avatar: 'JM', fitScore: 9580, streak: 84 },
  { rank: 4, name: 'Sofia Reyes', avatar: 'SR', fitScore: 9420, streak: 76 },
  { rank: 5, name: 'Devon Kim', avatar: 'DK', fitScore: 9105, streak: 71 },
  { rank: 6, name: 'Luna Torres', avatar: 'LT', fitScore: 8860, streak: 63 },
  { rank: 7, name: 'Noah Williams', avatar: 'NW', fitScore: 8720, streak: 58 },
  { rank: 8, name: 'Zoe Huang', avatar: 'ZH', fitScore: 8540, streak: 52 },
  { rank: 9, name: 'You', avatar: 'ME', fitScore: 0, streak: 0, isCurrentUser: true },
  { rank: 10, name: 'Tyler Brooks', avatar: 'TB', fitScore: 7880, streak: 41 },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-workout', name: 'First Step', description: 'Complete your first workout', icon: 'star-outline', iconColor: '#FFD700', unlocked: false, progress: 0, total: 1 },
  { id: 'week-streak', name: '7-Day Warrior', description: 'Maintain a 7-day streak', icon: 'flame-outline', iconColor: '#FF6B35', unlocked: false, progress: 3, total: 7 },
  { id: 'century', name: 'Centurion', description: 'Complete 100 workouts', icon: 'trophy-outline', iconColor: '#C0C0C0', unlocked: false, progress: 12, total: 100 },
  { id: 'iron', name: 'Iron Will', description: '30-day streak', icon: 'shield-outline', iconColor: '#7C3AED', unlocked: false, progress: 3, total: 30 },
  { id: 'nutrition-week', name: 'Fuel Master', description: 'Log meals for 7 days straight', icon: 'restaurant-outline', iconColor: '#00C4FF', unlocked: false, progress: 2, total: 7 },
  { id: 'early-bird', name: 'Early Bird', description: 'Complete 10 morning workouts', icon: 'sunny-outline', iconColor: '#FFB800', unlocked: false, progress: 4, total: 10 },
  { id: 'level-5', name: 'Level Up', description: 'Reach Level 5', icon: 'ribbon-outline', iconColor: '#00D4FF', unlocked: false, progress: 1, total: 5 },
  { id: 'longevity', name: 'Longevity Mode', description: 'Use the app for 30 days', icon: 'heart-outline', iconColor: '#FF4D4D', unlocked: false, progress: 5, total: 30 },
];

export const DEFAULT_MEALS: Meal[] = [
  { id: 'm1', name: 'Oatmeal with berries', time: '7:30 AM', calories: 380, protein: 14, carbs: 62, fat: 8, mealType: 'breakfast' },
  { id: 'm2', name: 'Grilled chicken & rice', time: '12:30 PM', calories: 520, protein: 48, carbs: 55, fat: 9, mealType: 'lunch' },
  { id: 'm3', name: 'Protein shake', time: '3:30 PM', calories: 180, protein: 30, carbs: 12, fat: 3, mealType: 'snack' },
];
