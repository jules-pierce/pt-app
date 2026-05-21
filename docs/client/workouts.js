function weeks(exercises) {
  return [1, 2, 3, 4].map((_, i) => ({ exercises, rpe: 5 + i }));
}

const workouts = [
  {
    title: "Upper Body Strength",
    date: "Monday, May 19 2026",
    notes: "Focus on controlled tempo — 3 seconds down on every rep. Rest 90 seconds between sets.",
    weeks: weeks([
      { name: "Barbell Bench Press",    category: "Chest",              sets: 4, reps: 5     },
      { name: "Incline Dumbbell Press", category: "Chest / Shoulders",  sets: 3, reps: 10    },
      { name: "Bent-Over Barbell Row",  category: "Back",               sets: 4, reps: 8     },
      { name: "Pull-Ups",               category: "Back / Biceps",      sets: 3, reps: "Max" },
      { name: "Overhead Press",         category: "Shoulders",          sets: 3, reps: 8     },
      { name: "Lateral Raises",         category: "Shoulders",          sets: 3, reps: 15    },
      { name: "Tricep Rope Pushdown",   category: "Triceps",            sets: 3, reps: 12    },
      { name: "EZ-Bar Curl",            category: "Biceps",             sets: 3, reps: 10    },
    ]),
  },
  {
    title: "Lower Body Strength",
    date: "Wednesday, May 21 2026",
    notes: "Keep your chest up on squats. Drive through the whole foot on deadlifts.",
    weeks: weeks([
      { name: "Back Squat",             category: "Quads / Glutes",      sets: 4, reps: 5     },
      { name: "Romanian Deadlift",      category: "Hamstrings / Glutes", sets: 3, reps: 8     },
      { name: "Leg Press",              category: "Quads",               sets: 3, reps: 12    },
      { name: "Walking Lunges",         category: "Quads / Glutes",      sets: 3, reps: 10    },
      { name: "Leg Curl",               category: "Hamstrings",          sets: 3, reps: 12    },
      { name: "Standing Calf Raise",    category: "Calves",              sets: 4, reps: 15    },
    ]),
  },
  {
    title: "Full Body Conditioning",
    date: "Friday, May 23 2026",
    notes: "Keep rest short — 60 seconds max. Goal is elevated heart rate throughout.",
    weeks: weeks([
      { name: "Trap Bar Deadlift",      category: "Full Body",           sets: 4, reps: 6     },
      { name: "Dumbbell Push Press",    category: "Shoulders / Triceps", sets: 3, reps: 10    },
      { name: "Dumbbell Row",           category: "Back / Biceps",       sets: 3, reps: 10    },
      { name: "Goblet Squat",           category: "Quads / Glutes",      sets: 3, reps: 12    },
      { name: "Face Pull",              category: "Rear Delts",          sets: 3, reps: 15    },
      { name: "Plank",                  category: "Core",                sets: 3, reps: "60s" },
    ]),
  },
];

// Append any workouts added via the provider
const _custom = JSON.parse(localStorage.getItem("pt_custom_workouts") || "[]");
workouts.push(..._custom);
