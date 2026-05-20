function weeks(exercises) {
  return [1, 2, 3, 4].map((_, i) => ({ exercises, rpe: 5 + i }));
}

const workouts = [
  {
    title: "Upper Body Strength",
    date: "Monday, May 19 2026",
    notes: "Focus on controlled tempo — 3 seconds down on every rep. Rest 90 seconds between sets.",
    weeks: weeks([
      { name: "Barbell Bench Press",    category: "Chest",              sets: 4, reps: 5,     weight: "225 lbs"    },
      { name: "Incline Dumbbell Press", category: "Chest / Shoulders",  sets: 3, reps: 10,    weight: "65 lbs"     },
      { name: "Bent-Over Barbell Row",  category: "Back",               sets: 4, reps: 8,     weight: "175 lbs"    },
      { name: "Pull-Ups",               category: "Back / Biceps",      sets: 3, reps: "Max", weight: "Bodyweight" },
      { name: "Overhead Press",         category: "Shoulders",          sets: 3, reps: 8,     weight: "115 lbs"    },
      { name: "Lateral Raises",         category: "Shoulders",          sets: 3, reps: 15,    weight: "20 lbs"     },
      { name: "Tricep Rope Pushdown",   category: "Triceps",            sets: 3, reps: 12,    weight: "60 lbs"     },
      { name: "EZ-Bar Curl",            category: "Biceps",             sets: 3, reps: 10,    weight: "75 lbs"     },
    ]),
  },
  {
    title: "Lower Body Strength",
    date: "Wednesday, May 21 2026",
    notes: "Keep your chest up on squats. Drive through the whole foot on deadlifts.",
    weeks: weeks([
      { name: "Back Squat",             category: "Quads / Glutes",     sets: 4, reps: 5,     weight: "275 lbs"    },
      { name: "Romanian Deadlift",      category: "Hamstrings / Glutes",sets: 3, reps: 8,     weight: "185 lbs"    },
      { name: "Leg Press",              category: "Quads",              sets: 3, reps: 12,    weight: "360 lbs"    },
      { name: "Walking Lunges",         category: "Quads / Glutes",     sets: 3, reps: 10,    weight: "50 lbs"     },
      { name: "Leg Curl",               category: "Hamstrings",         sets: 3, reps: 12,    weight: "100 lbs"    },
      { name: "Standing Calf Raise",    category: "Calves",             sets: 4, reps: 15,    weight: "135 lbs"    },
    ]),
  },
  {
    title: "Full Body Conditioning",
    date: "Friday, May 23 2026",
    notes: "Keep rest short — 60 seconds max. Goal is elevated heart rate throughout.",
    weeks: weeks([
      { name: "Trap Bar Deadlift",      category: "Full Body",          sets: 4, reps: 6,     weight: "245 lbs"    },
      { name: "Dumbbell Push Press",    category: "Shoulders / Triceps",sets: 3, reps: 10,    weight: "50 lbs"     },
      { name: "Dumbbell Row",           category: "Back / Biceps",      sets: 3, reps: 10,    weight: "70 lbs"     },
      { name: "Goblet Squat",           category: "Quads / Glutes",     sets: 3, reps: 12,    weight: "60 lbs"     },
      { name: "Face Pull",              category: "Rear Delts",         sets: 3, reps: 15,    weight: "40 lbs"     },
      { name: "Plank",                  category: "Core",               sets: 3, reps: "60s", weight: "Bodyweight" },
    ]),
  },
];
