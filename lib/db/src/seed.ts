import { sql } from "drizzle-orm";
import { db, exercises, type InsertExercise } from ".";

type ExerciseCategory = NonNullable<InsertExercise["category"]>;

type AnyExercise = Record<string, unknown>;

type SourceConfig = {
  id: string;
  url: string;
  imageBaseUrl?: string;
};

const SOURCE_URLS: SourceConfig[] = [
  ...(process.env.EXERCISEDB_DATA_URL
    ? [{ id: "ExerciseDB", url: process.env.EXERCISEDB_DATA_URL } satisfies SourceConfig]
    : []),
  {
    id: "hasaneyldrm/exercises-dataset",
    url: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json",
  },
  {
    id: "wrkout/exercises.json",
    url: "https://raw.githubusercontent.com/wrkout/exercises.json/master/exercises.json",
  },
  {
    id: "yuhonas/free-exercise-db",
    url: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json",
    imageBaseUrl: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises",
  },
];

const SPORT_EXERCISES: InsertExercise[] = [
  { externalId: "basketball-defensive-slides", name: "Basketball Defensive Slides", category: "Basketball", source: "vytal-curated", targetMuscle: "Legs", sport: "Basketball", equipment: "Bodyweight", primaryMuscles: ["quadriceps", "glutes", "calves"], instructions: ["Stay low, keep the chest tall, and slide laterally without crossing the feet."], estimatedCaloriesPerMinute: 9 },
  { externalId: "basketball-closeout-sprint", name: "Basketball Closeout Sprint", category: "Basketball", source: "vytal-curated", targetMuscle: "Full Body", sport: "Basketball", equipment: "Bodyweight", primaryMuscles: ["quadriceps", "calves"], instructions: ["Sprint, chop the feet, raise one hand, and recover under control."], estimatedCaloriesPerMinute: 10 },
  { externalId: "basketball-rebound-jumps", name: "Basketball Rebound Jumps", category: "Basketball", source: "vytal-curated", targetMuscle: "Legs", sport: "Basketball", equipment: "Bodyweight", primaryMuscles: ["quadriceps", "glutes"], instructions: ["Load fast, jump vertically, land softly, and reset the stance."], estimatedCaloriesPerMinute: 9 },
  { externalId: "basketball-court-suicides", name: "Basketball Court Suicides", category: "Basketball", source: "vytal-curated", targetMuscle: "Full Body", sport: "Basketball", equipment: "Court", primaryMuscles: ["quadriceps", "hamstrings", "calves"], instructions: ["Sprint each line, touch with control, turn hard, and accelerate back."], estimatedCaloriesPerMinute: 12 },
  { externalId: "basketball-single-leg-bound", name: "Basketball Single-Leg Bounds", category: "Basketball", source: "vytal-curated", targetMuscle: "Legs", sport: "Basketball", equipment: "Bodyweight", primaryMuscles: ["glutes", "quadriceps", "calves"], instructions: ["Bound laterally off one leg, stick the landing, and keep the knee tracking over the foot."], estimatedCaloriesPerMinute: 8 },
  { externalId: "football-5-10-5-shuttle", name: "Football 5-10-5 Shuttle", category: "Football", source: "vytal-curated", targetMuscle: "Full Body", sport: "Football", equipment: "Cones", primaryMuscles: ["quadriceps", "hamstrings", "glutes"], instructions: ["Explode laterally, touch each line, and keep hips low through every cut."], estimatedCaloriesPerMinute: 11 },
  { externalId: "football-backpedal-break", name: "Football Backpedal Break", category: "Football", source: "vytal-curated", targetMuscle: "Legs", sport: "Football", equipment: "Cones", primaryMuscles: ["quadriceps", "calves"], instructions: ["Backpedal with balance, plant hard, and drive forward at game speed."], estimatedCaloriesPerMinute: 10 },
  { externalId: "football-sled-push", name: "Football Sled Push", category: "Football", source: "vytal-curated", targetMuscle: "Full Body", sport: "Football", equipment: "Sled", primaryMuscles: ["quadriceps", "glutes", "chest"], instructions: ["Brace the torso, drive the knees, and keep constant pressure through the handles."], estimatedCaloriesPerMinute: 12 },
  { externalId: "football-broad-jump-stick", name: "Football Broad Jump Stick", category: "Football", source: "vytal-curated", targetMuscle: "Power", sport: "Football", equipment: "Bodyweight", primaryMuscles: ["glutes", "hamstrings", "quadriceps"], instructions: ["Jump forward explosively, land quietly, and freeze in an athletic stance."], estimatedCaloriesPerMinute: 7 },
  { externalId: "football-mirror-drill", name: "Football Mirror Drill", category: "Football", source: "vytal-curated", targetMuscle: "Full Body", sport: "Football", equipment: "Partner", primaryMuscles: ["quadriceps", "calves", "core"], instructions: ["React to a partner's movement while staying square, low, and balanced."], estimatedCaloriesPerMinute: 10 },
  { externalId: "tennis-lateral-split-step", name: "Tennis Lateral Split-Step", category: "Tennis", source: "vytal-curated", targetMuscle: "Legs", sport: "Tennis", equipment: "Bodyweight", primaryMuscles: ["quadriceps", "calves"], instructions: ["Hop into a split-step, push laterally, recover, and repeat with fast feet."], estimatedCaloriesPerMinute: 8 },
  { externalId: "tennis-rotational-med-ball-throw", name: "Tennis Rotational Medicine Ball Throw", category: "Tennis", source: "vytal-curated", targetMuscle: "Core", sport: "Tennis", equipment: "Medicine Ball", primaryMuscles: ["abdominals", "obliques"], instructions: ["Rotate from the hips, throw explosively, and control the return."], estimatedCaloriesPerMinute: 7 },
  { externalId: "tennis-serve-shadow-swings", name: "Tennis Serve Shadow Swings", category: "Tennis", source: "vytal-curated", targetMuscle: "Shoulders", sport: "Tennis", equipment: "Racket", primaryMuscles: ["shoulders", "triceps"], instructions: ["Move through a smooth serve pattern without pain or forced range."], estimatedCaloriesPerMinute: 5 },
  { externalId: "tennis-crossover-recovery", name: "Tennis Crossover Recovery Steps", category: "Tennis", source: "vytal-curated", targetMuscle: "Legs", sport: "Tennis", equipment: "Cones", primaryMuscles: ["quadriceps", "glutes", "calves"], instructions: ["Crossover, recover to center, split-step, and repeat with clean posture."], estimatedCaloriesPerMinute: 8 },
  { externalId: "tennis-band-external-rotation", name: "Resistance Band External Rotations", category: "Tennis", source: "vytal-curated", targetMuscle: "Shoulders", sport: "Tennis", equipment: "Resistance Band", primaryMuscles: ["shoulders", "rotator cuff"], instructions: ["Pin the elbow near the ribs and rotate out slowly without shrugging."], estimatedCaloriesPerMinute: 3 },
  { externalId: "incline-walking", name: "Incline Walking", category: "Cardio", source: "vytal-curated", targetMuscle: "Full Body", equipment: "Treadmill", primaryMuscles: ["quadriceps", "hamstrings", "glutes", "calves"], instructions: ["Walk tall at a sustainable incline and keep nasal breathing controlled."], estimatedCaloriesPerMinute: 6 },
  { externalId: "zone-2-cycling", name: "Zone 2 Cycling", category: "Cardio", source: "vytal-curated", targetMuscle: "Legs", equipment: "Bike", primaryMuscles: ["quadriceps", "hamstrings", "calves"], instructions: ["Hold a pace where conversation is possible but focused."], estimatedCaloriesPerMinute: 7 },
  { externalId: "rower-intervals", name: "Rower Power Intervals", category: "Cardio", source: "vytal-curated", targetMuscle: "Full Body", equipment: "Rower", primaryMuscles: ["quadriceps", "back", "glutes"], instructions: ["Drive with the legs, swing the torso, pull last, and recover smoothly."], estimatedCaloriesPerMinute: 11 },
  { externalId: "hip-cars", name: "Hip CARs", category: "Mobility", source: "vytal-curated", targetMuscle: "Hips", equipment: "Bodyweight", primaryMuscles: ["glutes", "hip flexors"], instructions: ["Move slowly through the biggest pain-free hip circle you control."], estimatedCaloriesPerMinute: 3 },
  { externalId: "thoracic-open-book", name: "Thoracic Open Book", category: "Mobility", source: "vytal-curated", targetMuscle: "Thoracic Spine", equipment: "Bodyweight", primaryMuscles: ["middle back"], instructions: ["Rotate through the upper back while keeping the hips stacked."], estimatedCaloriesPerMinute: 2 },
  { externalId: "ankle-knee-wall", name: "Knee-to-Wall Ankle Mobility", category: "Mobility", source: "vytal-curated", targetMuscle: "Ankles", equipment: "Wall", primaryMuscles: ["calves", "ankles"], instructions: ["Drive the knee toward the wall while the heel stays planted."], estimatedCaloriesPerMinute: 2 },
  { externalId: "custom-activity", name: "Custom Activity", category: "Custom", source: "manual", targetMuscle: "Full Body", equipment: "User Defined", primaryMuscles: ["full body"], instructions: ["Use this entry for manual logs like 1 hour Walking, pickup basketball, or rehab work."], estimatedCaloriesPerMinute: 5 },
];

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function textArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") return item.trim() ? [item.trim()] : [];
      if (item && typeof item === "object") {
        const maybeName = text((item as AnyExercise).name) ?? text((item as AnyExercise).en);
        return maybeName ? [maybeName] : [];
      }
      return [];
    });
  }
  if (typeof value === "string") {
    return value
      .split(/[,\n|;/]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

function extractRows(payload: unknown): AnyExercise[] {
  if (Array.isArray(payload)) return payload.filter((item): item is AnyExercise => !!item && typeof item === "object");
  if (!payload || typeof payload !== "object") return [];

  const record = payload as AnyExercise;
  for (const key of ["exercises", "data", "items", "results"]) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter((item): item is AnyExercise => !!item && typeof item === "object");
  }
  return [];
}

function categoryFromValues(name: string, equipment: string, muscles: string[], sourceCategory?: string, bodyPart?: string): ExerciseCategory {
  const haystack = [name, equipment, sourceCategory, bodyPart, ...muscles].filter(Boolean).join(" ").toLowerCase();

  if (haystack.includes("basketball")) return "Basketball";
  if (haystack.includes("football") || haystack.includes("gridiron")) return "Football";
  if (haystack.includes("tennis")) return "Tennis";
  if (haystack.includes("stretch") || haystack.includes("mobility") || haystack.includes("warm-up") || haystack.includes("yoga")) return "Mobility";
  if (haystack.includes("cardio") || haystack.includes("run") || haystack.includes("walk") || haystack.includes("bike") || haystack.includes("cycling") || haystack.includes("rower")) return "Cardio";
  if (equipment.toLowerCase().includes("body") || equipment.toLowerCase().includes("none") || equipment.toLowerCase().includes("bodyweight")) return "Calisthenics";
  return "Bodybuilding";
}

function caloriesFor(category: ExerciseCategory, level?: string): number {
  if (category === "Cardio") return 9;
  if (category === "Basketball" || category === "Football") return 10;
  if (category === "Tennis" || category === "Calisthenics") return 7;
  if (category === "Mobility" || category === "Recovery") return 3;
  if (level === "expert" || level === "advanced") return 8;
  if (level === "intermediate") return 6;
  return 5;
}

function imageUrlsFor(row: AnyExercise, source: SourceConfig): string[] {
  const raw = [
    ...textArray(row.images),
    ...textArray(row.imageUrls),
    ...textArray(row.image_urls),
    ...textArray(row.secondaryImages),
    text(row.image),
    text(row.thumbnail),
    text(row.gifUrl),
    text(row.gif_url),
  ].filter((url): url is string => !!url);

  return raw.map((url) => {
    if (/^https?:\/\//i.test(url)) return url;
    if (source.imageBaseUrl) return `${source.imageBaseUrl}/${url.replace(/^\/+/, "")}`;
    return url;
  });
}

function normalizeExercise(row: AnyExercise, source: SourceConfig): InsertExercise | null {
  const name = text(row.name) ?? text(row.exerciseName) ?? text(row.title);
  if (!name) return null;

  const externalId = text(row.id) ?? text(row.exerciseId) ?? text(row.exercise_id) ?? text(row.uuid) ?? slug(name);
  const equipment = titleCase(text(row.equipment) ?? text(row.equipmentName) ?? text(row.equipment_name) ?? "Bodyweight");
  const primaryMuscles = textArray(row.primaryMuscles).length
    ? textArray(row.primaryMuscles)
    : textArray(row.targetMuscles).length
      ? textArray(row.targetMuscles)
      : textArray(row.target).length
        ? textArray(row.target)
        : textArray(row.muscle);
  const secondaryMuscles = textArray(row.secondaryMuscles).length ? textArray(row.secondaryMuscles) : textArray(row.secondary_muscles);
  const bodyPart = text(row.bodyPart) ?? text(row.body_part);
  const sourceCategory = text(row.category) ?? text(row.type);
  const targetMuscle = titleCase(primaryMuscles[0] ?? text(row.target) ?? bodyPart ?? "Full Body");
  const category = categoryFromValues(name, equipment, [...primaryMuscles, ...secondaryMuscles], sourceCategory, bodyPart);
  const sport = category === "Basketball" || category === "Football" || category === "Tennis" ? category : null;
  const instructions = textArray(row.instructions).length
    ? textArray(row.instructions)
    : textArray(row.steps).length
      ? textArray(row.steps)
      : text(row.description)
        ? [text(row.description)!]
        : [];
  const level = text(row.level) ?? text(row.difficulty);

  return {
    externalId,
    source: source.id,
    name,
    category,
    force: text(row.force) ?? null,
    level: level ?? null,
    mechanic: text(row.mechanic) ?? null,
    equipment,
    primaryMuscles,
    secondaryMuscles,
    targetMuscle,
    sport,
    instructions,
    imageUrls: imageUrlsFor(row, source),
    estimatedCaloriesPerMinute: caloriesFor(category, level),
  };
}

async function fetchSource(source: SourceConfig): Promise<InsertExercise[]> {
  const response = await fetch(source.url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "VYTAL-Fitness-Seed/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const rows = extractRows(payload);
  return rows.flatMap((row) => {
    const normalized = normalizeExercise(row, source);
    return normalized ? [normalized] : [];
  });
}

function dedupeRows(rows: InsertExercise[]): InsertExercise[] {
  const seen = new Set<string>();
  const deduped: InsertExercise[] = [];

  for (const row of rows) {
    const key = `${row.source}:${row.externalId ?? slug(row.name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  // Also dedupe by (name, source) to avoid unique constraint violations
  const seenName = new Set<string>();
  const final: InsertExercise[] = [];
  for (const row of deduped) {
    const key = `${row.source}:${row.name.toLowerCase()}`;
    if (seenName.has(key)) continue;
    seenName.add(key);
    final.push(row);
  }

  return final;
}

async function insertInBatches(rows: InsertExercise[], batchSize = 500) {
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    await db
      .insert(exercises)
      .values(batch)
      .onConflictDoUpdate({
        target: [exercises.source, exercises.externalId],
        set: {
          name: sql`excluded.name`,
          category: sql`excluded.category`,
          force: sql`excluded.force`,
          level: sql`excluded.level`,
          mechanic: sql`excluded.mechanic`,
          equipment: sql`excluded.equipment`,
          primaryMuscles: sql`excluded.primary_muscles`,
          secondaryMuscles: sql`excluded.secondary_muscles`,
          targetMuscle: sql`excluded.target_muscle`,
          sport: sql`excluded.sport`,
          instructions: sql`excluded.instructions`,
          imageUrls: sql`excluded.image_urls`,
          estimatedCaloriesPerMinute: sql`excluded.estimated_calories_per_minute`,
          updatedAt: new Date(),
        },
      });
  }
}

async function main() {
  const importedRows: InsertExercise[] = [];
  const sourceCounts: Record<string, number> = {};

  for (const source of SOURCE_URLS) {
    try {
      const rows = await fetchSource(source);
      importedRows.push(...rows);
      sourceCounts[source.id] = rows.length;
      console.log(`Loaded ${rows.length} exercises from ${source.id}.`);
    } catch (error) {
      sourceCounts[source.id] = 0;
      console.warn(`Skipped ${source.id}: ${(error as Error).message}`);
    }
  }

  const rows = dedupeRows([...importedRows, ...SPORT_EXERCISES]);
  if (!rows.length) {
    throw new Error("No exercise rows were loaded. Check EXERCISEDB_DATA_URL or network access.");
  }

  await insertInBatches(rows);

  console.log(
    `Seeded ${rows.length} exercises. Sources: ${Object.entries(sourceCounts)
      .map(([source, count]) => `${source}=${count}`)
      .join(", ")}, vytal-curated=${SPORT_EXERCISES.length}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
