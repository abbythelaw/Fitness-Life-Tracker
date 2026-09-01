import { useEffect, useState } from 'react'
import { Activity, Bell, Check, ChevronDown, CircleGauge, Clock3, Download, Dumbbell, Eye, EyeOff, Heart, HeartHandshake, LogOut, Menu, Moon, NotebookPen, Pencil, Plus, Settings, Sparkles, SunMedium, Target, TimerReset, Trash2, Trophy, X, Zap } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase, supabaseEnabled } from './lib/supabase'
import './App.css'

const today = new Date().toISOString().slice(0, 10)
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
const uid = () => Date.now() + Math.random()

const FASTING_STAGES = [
  { id: 0, startHours: 0, label: 'Stage 0', range: '0–4h', title: 'Fed', note: 'Insulin is elevated and the body is processing the meal.', color: '#7ecfc0' },
  { id: 1, startHours: 4, label: 'Stage 1', range: '4–12h', title: 'Early Fasting', note: 'Glycogen stores are gradually being used.', color: '#7bbf6a' },
  { id: 2, startHours: 12, label: 'Stage 2', range: '12–18h', title: 'Fat Burning', note: 'Insulin drops and fat oxidation starts to rise.', color: '#f5b36d' },
  { id: 3, startHours: 18, label: 'Stage 3', range: '18–24h', title: 'Ketosis', note: 'The liver begins producing ketones from stored fat.', color: '#6bb9ee' },
  { id: 4, startHours: 24, label: 'Stage 4', range: '24–48h', title: 'Autophagy', note: 'Cellular cleanup and repair pathways begin.', color: '#a79bf5' },
  { id: 5, startHours: 48, label: 'Stage 5', range: '48–72h', title: 'Deep Repair', note: 'Growth hormone and insulin sensitivity continue to change.', color: '#d59ce6' },
  { id: 6, startHours: 72, label: 'Stage 6', range: '72h+', title: 'Stem Cell Support', note: 'Longer-term regeneration and immune renewal are supported.', color: '#f39ec4' },
]

const FASTING_OPTIONS = ['12:12', '14:10', '16:8', '18:6', '20:4', '24:0', '36:0', 'Custom']
const EXERCISE_GUIDE_URL = 'https://www.simplyfitness.com/pages/workout-exercise-guides'

const EXERCISE_LIBRARY = [
  { name: 'Barbell Bench Press', primaryCategory: 'Chest', trackingType: 'Rep-Based', equipment: 'Barbell, Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Incline Dumbbell Bench Press', primaryCategory: 'Chest', trackingType: 'Rep-Based', equipment: 'Dumbbells, Incline Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Peck Deck', primaryCategory: 'Chest', trackingType: 'Rep-Based', equipment: 'Cable Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Cable Crossover', primaryCategory: 'Chest', trackingType: 'Rep-Based', equipment: 'Cable Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Incline Barbell Bench Press', primaryCategory: 'Chest', trackingType: 'Rep-Based', equipment: 'Barbell, Incline Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Dumbbell Bench Press', primaryCategory: 'Chest', trackingType: 'Rep-Based', equipment: 'Dumbbells, Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Dumbbell Fly', primaryCategory: 'Chest', trackingType: 'Rep-Based', equipment: 'Dumbbells, Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Incline Dumbbell Fly', primaryCategory: 'Chest', trackingType: 'Rep-Based', equipment: 'Dumbbells, Incline Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Chest Press Machine', primaryCategory: 'Chest', trackingType: 'Rep-Based', equipment: 'Chest Press Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Barbell Decline Bench Press', primaryCategory: 'Chest', trackingType: 'Rep-Based', equipment: 'Barbell, Decline Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Dumbbell Decline Bench Press', primaryCategory: 'Chest', trackingType: 'Rep-Based', equipment: 'Dumbbells, Decline Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Push Ups', primaryCategory: 'Chest', trackingType: 'Rep-Based', equipment: 'Bodyweight', defaultTrackingMetric: 'Sets, Reps, Added Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Dumbbell Bent-Over Row (Single Arm)', primaryCategory: 'Back', trackingType: 'Rep-Based', equipment: 'Dumbbell, Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Wide-Grip Pulldown', primaryCategory: 'Back', trackingType: 'Rep-Based', equipment: 'Lat Pulldown Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Seated Cable Row', primaryCategory: 'Back', trackingType: 'Rep-Based', equipment: 'Cable Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Close-Grip Pulldown', primaryCategory: 'Back', trackingType: 'Rep-Based', equipment: 'Lat Pulldown Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Barbell Row', primaryCategory: 'Back', trackingType: 'Rep-Based', equipment: 'Barbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Behind-The-Neck Pulldown', primaryCategory: 'Back', trackingType: 'Rep-Based', equipment: 'Lat Pulldown Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Reverse-Grip Pulldown', primaryCategory: 'Back', trackingType: 'Rep-Based', equipment: 'Lat Pulldown Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Rope Pulldown', primaryCategory: 'Back', trackingType: 'Rep-Based', equipment: 'Cable Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'T-Bar Rows', primaryCategory: 'Back', trackingType: 'Rep-Based', equipment: 'T-Bar Row Machine / Barbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Barbell Bent Over Rows Supinated Grip', primaryCategory: 'Back', trackingType: 'Rep-Based', equipment: 'Barbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Pull Up', primaryCategory: 'Back', trackingType: 'Rep-Based', equipment: 'Pull-Up Bar', defaultTrackingMetric: 'Sets, Reps, Added Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Behind the Neck Pull Up', primaryCategory: 'Back', trackingType: 'Rep-Based', equipment: 'Pull-Up Bar', defaultTrackingMetric: 'Sets, Reps, Added Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Pull Up with a Supinated Grip', primaryCategory: 'Back', trackingType: 'Rep-Based', equipment: 'Pull-Up Bar', defaultTrackingMetric: 'Sets, Reps, Added Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Straight Arm Lat Pulldown', primaryCategory: 'Back', trackingType: 'Rep-Based', equipment: 'Cable Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Dumbbell Bent Over Rows', primaryCategory: 'Back', trackingType: 'Rep-Based', equipment: 'Dumbbells', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Dumbbell Pullover', primaryCategory: 'Back / Chest', trackingType: 'Rep-Based', equipment: 'Dumbbell, Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Barbell Pullover', primaryCategory: 'Back / Chest', trackingType: 'Rep-Based', equipment: 'Barbell, Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Barbell Deadlift', primaryCategory: 'Back / Legs', trackingType: 'Rep-Based', equipment: 'Barbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Barbell Sumo Deadlift', primaryCategory: 'Back / Legs', trackingType: 'Rep-Based', equipment: 'Barbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Trap Bar Deadlift', primaryCategory: 'Back / Legs', trackingType: 'Rep-Based', equipment: 'Trap Bar', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Dumbbell Deadlift', primaryCategory: 'Back / Legs', trackingType: 'Rep-Based', equipment: 'Dumbbells', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Barbell Shrug', primaryCategory: 'Back / Shoulders', trackingType: 'Rep-Based', equipment: 'Barbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Dumbbell Shrugs', primaryCategory: 'Back / Shoulders', trackingType: 'Rep-Based', equipment: 'Dumbbells', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Dumbbell Shoulder Press', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Dumbbells', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Dumbbell Lateral Raise', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Dumbbells', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'High Cable Rear Delt Fly', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Cable Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Smith Machine Shoulder Press', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Smith Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Barbell Upright Row', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Barbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Bent-Over Lateral Raise', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Dumbbells', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Cable One-Arm Lateral Raise', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Cable Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Dumbbell Push Press', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Dumbbells', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Barbell Push Press', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Barbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Single-Arm Cable Front Raise', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Cable Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Barbell Front Raise', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Barbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Seated Barbell Shoulder Press', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Barbell, Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Seated Behind the Neck Barbell Shoulder Press', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Barbell, Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Standing Barbell Shoulder Press', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Barbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Standing Behind the Neck Barbell Shoulder Press', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Barbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Alternate Dumbbell Front Raise Neutral Grip', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Dumbbells', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'One-Arm Low-Pulley Front Raise Neutral Grip', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Cable Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Two-Handed Dumbbell Front Raise', primaryCategory: 'Shoulders', trackingType: 'Rep-Based', equipment: 'Dumbbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Alternating Dumbbell Curl', primaryCategory: 'Biceps', trackingType: 'Rep-Based', equipment: 'Dumbbells', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Rope Cable Curl', primaryCategory: 'Biceps', trackingType: 'Rep-Based', equipment: 'Cable Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'EZ Barbell Curl', primaryCategory: 'Biceps', trackingType: 'Rep-Based', equipment: 'EZ Bar', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'EZ Barbell Preacher Curl', primaryCategory: 'Biceps', trackingType: 'Rep-Based', equipment: 'EZ Bar, Preacher Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Hammer Curl', primaryCategory: 'Biceps', trackingType: 'Rep-Based', equipment: 'Dumbbells', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Dumbbell Concentration Curl', primaryCategory: 'Biceps', trackingType: 'Rep-Based', equipment: 'Dumbbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Single-Arm Low Pulley Cable Curl', primaryCategory: 'Biceps', trackingType: 'Rep-Based', equipment: 'Cable Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Straight Bar Low Pulley Cable Curl', primaryCategory: 'Biceps', trackingType: 'Rep-Based', equipment: 'Cable Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Standing High Pulley Cable Curl', primaryCategory: 'Biceps', trackingType: 'Rep-Based', equipment: 'Cable Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Seated Barbell Wrist Curl', primaryCategory: 'Forearms', trackingType: 'Rep-Based', equipment: 'Barbell, Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Seated Barbell Wrist Extension', primaryCategory: 'Forearms', trackingType: 'Rep-Based', equipment: 'Barbell, Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Reverse Barbell Curl', primaryCategory: 'Forearms / Biceps', trackingType: 'Rep-Based', equipment: 'Barbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Lying Triceps Extension', primaryCategory: 'Triceps', trackingType: 'Rep-Based', equipment: 'EZ Bar / Barbell, Bench', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Triceps Pushdown', primaryCategory: 'Triceps', trackingType: 'Rep-Based', equipment: 'Cable Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Rope Triceps Pushdown', primaryCategory: 'Triceps', trackingType: 'Rep-Based', equipment: 'Cable Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Dumbbell Triceps Extension', primaryCategory: 'Triceps', trackingType: 'Rep-Based', equipment: 'Dumbbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Bench Dip', primaryCategory: 'Triceps', trackingType: 'Rep-Based', equipment: 'Bench', defaultTrackingMetric: 'Sets, Reps, Added Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Crunch', primaryCategory: 'Abdominals', trackingType: 'Rep-Based', equipment: 'Bodyweight / Mat', defaultTrackingMetric: 'Sets, Reps', fields: ['sets', 'reps'] },
  { name: 'Oblique Crunch', primaryCategory: 'Abdominals', trackingType: 'Rep-Based', equipment: 'Bodyweight / Mat', defaultTrackingMetric: 'Sets, Reps', fields: ['sets', 'reps'] },
  { name: 'Crunch Machine', primaryCategory: 'Abdominals', trackingType: 'Rep-Based', equipment: 'Crunch Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Hanging Leg Raise', primaryCategory: 'Abdominals', trackingType: 'Rep-Based', equipment: 'Pull-Up Bar', defaultTrackingMetric: 'Sets, Reps', fields: ['sets', 'reps'] },
  { name: 'Bent Knee Reverse Crunch', primaryCategory: 'Abdominals', trackingType: 'Rep-Based', equipment: 'Bodyweight / Mat', defaultTrackingMetric: 'Sets, Reps', fields: ['sets', 'reps'] },
  { name: 'Long Arm Crunch', primaryCategory: 'Abdominals', trackingType: 'Rep-Based', equipment: 'Bodyweight / Mat', defaultTrackingMetric: 'Sets, Reps', fields: ['sets', 'reps'] },
  { name: 'Plank Get Ups', primaryCategory: 'Abdominals', trackingType: 'Duration-Based', equipment: 'Bodyweight / Mat', defaultTrackingMetric: 'Duration (mm:ss) / Reps', fields: ['duration', 'reps'] },
  { name: 'Squat', primaryCategory: 'Legs', trackingType: 'Rep-Based', equipment: 'Barbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Hack Squat', primaryCategory: 'Legs', trackingType: 'Rep-Based', equipment: 'Hack Squat Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Front Squat', primaryCategory: 'Legs', trackingType: 'Rep-Based', equipment: 'Barbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Wall Sit', primaryCategory: 'Legs', trackingType: 'Duration-Based', equipment: 'Bodyweight / Wall', defaultTrackingMetric: 'Duration (mm:ss), Sets', fields: ['duration', 'sets'] },
  { name: 'Bodyweight Glute Bridge', primaryCategory: 'Legs / Glutes', trackingType: 'Rep-Based', equipment: 'Bodyweight / Mat', defaultTrackingMetric: 'Sets, Reps', fields: ['sets', 'reps'] },
  { name: 'Seated Hip Abduction Machine', primaryCategory: 'Legs / Glutes', trackingType: 'Rep-Based', equipment: 'Hip Abduction Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Leg Press', primaryCategory: 'Legs', trackingType: 'Rep-Based', equipment: 'Leg Press Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Leg Extension', primaryCategory: 'Legs', trackingType: 'Rep-Based', equipment: 'Leg Extension Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Lying Leg Curl', primaryCategory: 'Legs', trackingType: 'Rep-Based', equipment: 'Leg Curl Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Dumbbell Romanian Deadlift', primaryCategory: 'Legs', trackingType: 'Rep-Based', equipment: 'Dumbbells', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Medicine Ball Deadlift', primaryCategory: 'Legs', trackingType: 'Rep-Based', equipment: 'Medicine Ball', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Single Leg Bodyweight Deadlift', primaryCategory: 'Legs', trackingType: 'Rep-Based', equipment: 'Bodyweight', defaultTrackingMetric: 'Sets, Reps', fields: ['sets', 'reps'] },
  { name: 'Seated Calf Raise', primaryCategory: 'Calves', trackingType: 'Rep-Based', equipment: 'Seated Calf Machine', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Standing Calf Raise', primaryCategory: 'Calves', trackingType: 'Rep-Based', equipment: 'Standing Calf Machine / Dumbbell', defaultTrackingMetric: 'Sets, Reps, Weight (kg)', fields: ['sets', 'reps', 'weight'] },
  { name: 'Rowing Machine', primaryCategory: 'Cardio / Full Body', trackingType: 'Duration-Based', equipment: 'Rowing Ergometer', defaultTrackingMetric: 'Duration (mm:ss); Distance (km), Pace', fields: ['duration', 'distance'] },
  { name: 'Treadmill Running / Walking', primaryCategory: 'Cardio / Legs', trackingType: 'Duration-Based', equipment: 'Treadmill', defaultTrackingMetric: 'Duration (mm:ss); Distance (km), Speed, Incline', fields: ['duration', 'distance'] },
  { name: 'Stair Master / Steppers', primaryCategory: 'Cardio / Legs', trackingType: 'Duration-Based', equipment: 'Stair Climber', defaultTrackingMetric: 'Duration (mm:ss); Steps / Floors', fields: ['duration'] },
  { name: 'Outdoor Walking / Running', primaryCategory: 'Cardio / Legs', trackingType: 'Duration-Based', equipment: 'Bodyweight / Outdoor', defaultTrackingMetric: 'Duration (mm:ss); Distance (km)', fields: ['duration', 'distance'] },
  { name: 'Standing Hamstring Stretch', primaryCategory: 'Flexibility / Legs', trackingType: 'Duration-Based', equipment: 'Bodyweight / Mat', defaultTrackingMetric: 'Duration (mm:ss) per leg, Sets', fields: ['duration', 'sets'] },
  { name: 'Cobra Stretch', primaryCategory: 'Flexibility / Core & Back', trackingType: 'Duration-Based', equipment: 'Bodyweight / Mat', defaultTrackingMetric: 'Duration (mm:ss), Sets', fields: ['duration', 'sets'] },
  { name: 'Child\'s Pose', primaryCategory: 'Flexibility / Back & Shoulders', trackingType: 'Duration-Based', equipment: 'Bodyweight / Mat', defaultTrackingMetric: 'Duration (mm:ss), Sets', fields: ['duration', 'sets'] },
  { name: 'Quad Stretch (Standing)', primaryCategory: 'Flexibility / Legs', trackingType: 'Duration-Based', equipment: 'Bodyweight', defaultTrackingMetric: 'Duration (mm:ss) per leg, Sets', fields: ['duration', 'sets'] },
  { name: 'Doorway Chest Stretch', primaryCategory: 'Flexibility / Chest', trackingType: 'Duration-Based', equipment: 'Doorway / Wall', defaultTrackingMetric: 'Duration (mm:ss), Sets', fields: ['duration', 'sets'] },
  { name: 'Hip Flexor Lunge Stretch', primaryCategory: 'Flexibility / Hips', trackingType: 'Duration-Based', equipment: 'Bodyweight / Mat', defaultTrackingMetric: 'Duration (mm:ss) per side, Sets', fields: ['duration', 'sets'] },
  { name: 'Dynamic Warm-Up Routine', primaryCategory: 'Flexibility / Full Body', trackingType: 'Duration-Based', equipment: 'Bodyweight', defaultTrackingMetric: 'Duration (mm:ss)', fields: ['duration'] },
  { name: 'Basketball', primaryCategory: 'Sports / Cardio', trackingType: 'Duration-Based', equipment: 'Basketball & Court', defaultTrackingMetric: 'Duration (mm:ss); Active Calories, Avg HR', fields: ['duration'] },
  { name: 'Soccer / Football', primaryCategory: 'Sports / Cardio', trackingType: 'Duration-Based', equipment: 'Soccer Ball & Pitch', defaultTrackingMetric: 'Duration (mm:ss); Distance (km), Active Calories', fields: ['duration', 'distance'] },
  { name: 'Tennis / Padel', primaryCategory: 'Sports / Agility', trackingType: 'Duration-Based', equipment: 'Racket, Ball & Court', defaultTrackingMetric: 'Duration (mm:ss); Active Calories, Sets Played', fields: ['duration'] },
  { name: 'Swimming (Laps)', primaryCategory: 'Sports / Full Body', trackingType: 'Duration-Based', equipment: 'Pool', defaultTrackingMetric: 'Duration (mm:ss); Laps / Distance (m), Stroke Type', fields: ['duration', 'distance'] },
  { name: 'Cycling (Road / Mountain)', primaryCategory: 'Sports / Cardio', trackingType: 'Duration-Based', equipment: 'Bicycle & Helmet', defaultTrackingMetric: 'Duration (mm:ss); Distance (km), Avg Speed', fields: ['duration', 'distance'] },
  { name: 'Volleyball', primaryCategory: 'Sports / Agility', trackingType: 'Duration-Based', equipment: 'Volleyball & Net', defaultTrackingMetric: 'Duration (mm:ss); Active Calories', fields: ['duration'] },
  { name: 'Badminton', primaryCategory: 'Sports / Agility', trackingType: 'Duration-Based', equipment: 'Racket, Shuttlecock & Net', defaultTrackingMetric: 'Duration (mm:ss); Active Calories', fields: ['duration'] },
  { name: 'Martial Arts / Boxing', primaryCategory: 'Sports / Full Body', trackingType: 'Duration-Based', equipment: 'Gloves / Mat / Heavy Bag', defaultTrackingMetric: 'Duration (mm:ss); Rounds, Active Calories', fields: ['duration'] },
]

const EXERCISE_GROUPS = [...new Map(EXERCISE_LIBRARY.map((exercise) => [exercise.primaryCategory, exercise.primaryCategory])).values()].sort()

const normalizeExerciseFields = (metric) => {
  const value = (metric || '').toLowerCase()
  if (value.includes('sets') && value.includes('reps') && value.includes('weight')) return ['sets', 'reps', 'weight']
  if (value.includes('sets') && value.includes('reps')) return ['sets', 'reps']
  if (value.includes('duration') && value.includes('distance')) return ['duration', 'distance']
  if (value.includes('duration') && value.includes('sets')) return ['duration', 'sets']
  if (value.includes('duration')) return ['duration']
  if (value.includes('distance')) return ['distance']
  if (value.includes('weight')) return ['weight']
  return ['sets', 'reps']
}

const getExerciseProfile = (name) => EXERCISE_LIBRARY.find((exercise) => exercise.name === name) || {
  name,
  primaryCategory: 'General',
  trackingType: 'Rep-Based',
  equipment: 'Bodyweight',
  defaultTrackingMetric: 'Sets, Reps',
  fields: ['sets', 'reps'],
}

const normalizeExerciseName = (value) => {
  const input = String(value || '').trim().toLowerCase()
  if (!input) return 'Barbell Bench Press'

  const match = EXERCISE_LIBRARY.find((exercise) => exercise.name.toLowerCase() === input)
  if (match) return match.name

  const partial = EXERCISE_LIBRARY.find((exercise) =>
    exercise.name.toLowerCase().includes(input) || input.includes(exercise.name.toLowerCase())
  )

  return partial ? partial.name : 'Barbell Bench Press'
}

const hasDuplicateExercises = (routine) => {
  const seen = new Set()
  return (routine.exercises || []).some((exercise) => {
    const next = normalizeExerciseName(exercise.name)
    if (seen.has(next)) return true
    seen.add(next)
    return false
  })
}

const sanitizeRoutine = (routine) => ({
  ...routine,
  exercises: (routine.exercises || []).map((exercise) => {
    const safeName = normalizeExerciseName(exercise.name)
    const profile = getExerciseProfile(safeName)
    const isDistanceBased = (profile.fields || ['sets', 'reps']).includes('distance')
    const nextType = isDistanceBased ? 'distance' : (profile.fields || ['sets', 'reps']).includes('duration') ? 'duration' : 'reps'

    return {
      ...exercise,
      id: exercise.id || uid(),
      name: safeName,
      type: exercise.type || nextType,
      sets: Number(exercise.sets || 0),
      reps: Number(exercise.reps || 0),
      weight: Number(exercise.weight || 0),
      duration: Number(exercise.duration || 0),
      distance: Number(exercise.distance || 0),
    }
  }),
})

const seedEntries = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1,
  date: `2026-08-${String(i + 19).padStart(2, '0')}`,
  weight: +(74 - i * .12).toFixed(1),
  water: +(2.1 + (i % 4) * .2).toFixed(1),
  calories: 480 + (i % 5) * 85,
  sleep: +(6.8 + (i % 4) * .35).toFixed(1),
  quality: 78 + (i % 5) * 4,
  custom: {},
  fasting: { start: '20:00', end: '12:00', duration: '16:8', startedAt: '2026-08-31T20:00', completed: true },
  habits: { steps: 7000 + i * 150, meditation: i % 2 === 0, supplements: true },
}))

const defaultMetrics = [
  { id: 'weight', name: 'Weight', unit: 'kg', target: 70, type: 'numeric', category: 'Overall Health', visible: true },
  { id: 'water', name: 'Water intake', unit: 'L', target: 3, type: 'numeric', category: 'Overall Health', visible: true },
  { id: 'calories', name: 'Active calories', unit: 'kcal', target: 700, type: 'numeric', category: 'Exercise Related', visible: true },
  { id: 'sleep', name: 'Sleep duration', unit: 'hrs', target: 8, type: 'duration', category: 'Overall Health', visible: true },
  { id: 'fasting', name: 'Fasting', unit: 'hrs', target: 16, type: 'duration', category: 'Overall Health', visible: true },
]

const seedWorkouts = [
  { id: 1, date: '2026-08-31', exercise: 'Barbell Deadlift', category: 'strength', weight: 100, reps: 5, duration: 0, distance: 0, sets: 3, intensity: 'High', timestamp: '18:20', frequency: '2x/week' },
  { id: 2, date: '2026-08-28', exercise: 'Barbell Bench Press', category: 'strength', weight: 80, reps: 6, duration: 0, distance: 0, sets: 4, intensity: 'Moderate', timestamp: '18:10', frequency: '2x/week' },
  { id: 3, date: '2026-08-25', exercise: 'Treadmill Running / Walking', category: 'cardio', weight: 0, reps: 0, duration: 28, distance: 5, sets: 1, intensity: 'Moderate', timestamp: '07:10', frequency: '1x/week' },
]

const defaultRoutines = [
  { id: 'routine-1', name: 'Upper Body Strength', category: 'Strength', days: ['Mon', 'Thu'], frequency: '2x/week', exercises: [{ id: uid(), name: 'Barbell Bench Press', type: 'reps', sets: 4, reps: 8, weight: 70, duration: 0, distance: 0 }, { id: uid(), name: 'Pull Up', type: 'reps', sets: 4, reps: 8, weight: 0, duration: 0, distance: 0 }], streak: 3 },
  { id: 'routine-2', name: 'Cardio Base', category: 'Cardio', days: ['Tue', 'Sat'], frequency: '2x/week', exercises: [{ id: uid(), name: 'Treadmill Running / Walking', type: 'distance', sets: 1, reps: 0, weight: 0, duration: 25, distance: 4.5 }, { id: uid(), name: 'Rowing Machine', type: 'duration', sets: 1, reps: 0, weight: 0, duration: 35, distance: 0 }], streak: 2 },
]

const seedUser = (email, name = 'Alex Smith', guest = false) => ({
  id: email,
  email,
  name,
  password: 'fitlife',
  guest,
  height: 172,
  units: 'kg',
  theme: 'dark',
  metrics: defaultMetrics,
  categories: ['Overall Health', 'Exercise Related', 'Mobility'],
  entries: seedEntries,
  workouts: seedWorkouts,
  routines: defaultRoutines,
  activeFast: null,
  meditation: [{ id: uid(), date: today, notes: 'Grateful for my energy and calm focus today.' }],
  fastingHistory: [],
})

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback
  } catch {
    return fallback
  }
}

const initialUsers = read('fitlife-users', null) || { 'alex@fitlife.app': seedUser('alex@fitlife.app') }
const nav = [['Snapshot', CircleGauge], ['Workouts', Dumbbell], ['Fasting', Clock3], ['Grateful', HeartHandshake], ['Settings', Settings]]
const dateLabel = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const currentHeadlineDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())

function App() {
  const [users, setUsers] = useState(initialUsers)
  const [session, setSession] = useState(() => read('fitlife-session', null))
  const [authMode, setAuthMode] = useState('login')
  const [view, setView] = useState('Snapshot')
  const [drawer, setDrawer] = useState(null)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const [range, setRange] = useState(7)
  const [mobileNav, setMobileNav] = useState(false)

  const user = session ? users[session] : null

  useEffect(() => localStorage.setItem('fitlife-users', JSON.stringify(users)), [users])
  useEffect(() => (session ? localStorage.setItem('fitlife-session', JSON.stringify(session)) : localStorage.removeItem('fitlife-session')), [session])
  useEffect(() => {
    if (!supabaseEnabled || !user) return
    const cloudUser = { ...user }
    delete cloudUser.password
    supabase.from('fitlife_users').upsert({ id: user.id, email: user.email, data: cloudUser, updated_at: new Date().toISOString() }).then(({ error }) => {
      if (error) console.error('Supabase sync failed:', error.message)
    })
  }, [user])
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 2800)
      return () => clearTimeout(timer)
    }
  }, [toast])
  useEffect(() => {
    document.documentElement.dataset.theme = user?.theme || 'dark'
  }, [user?.theme])

  const updateUser = (patch) => setUsers((all) => ({ ...all, [user.id]: { ...(all[user.id] || user), ...patch } }))

  if (!user) {
    return <Auth mode={authMode} setMode={setAuthMode} onAuth={(account) => { setUsers((all) => ({ ...all, [account.id]: account })); setSession(account.id) }} />
  }

  const latest = user.entries[user.entries.length - 1] || seedEntries[0]
  const chartData = user.entries.slice(-range).map((entry) => ({
    ...entry,
    day: dateLabel(entry.date),
    bmi: +(entry.weight / (user.height / 100) ** 2).toFixed(1),
  }))

  const displayed = user.metrics.filter((item) => item.visible)

  const saveEntry = (data) => {
    const next = { ...data, id: drawer?.entry?.id || uid(), date: drawer?.entry?.date || today }
    updateUser({
      entries: drawer?.entry ? user.entries.map((entry) => entry.id === drawer.entry.id ? next : entry) : [...user.entries, next],
    })
    setModal(null)
    setDrawer(null)
    setToast(drawer?.entry ? 'Entry updated' : 'Daily log saved')
  }

  const deleteEntry = (id) => {
    updateUser({ entries: user.entries.filter((entry) => entry.id !== id) })
    setToast('Entry deleted')
  }

  const createMetric = (metric) => {
    const next = {
      ...metric,
      id: uid(),
      target: metric.target === '' || metric.target == null ? null : Number(metric.target),
      visible: true,
    }
    updateUser({ metrics: [...user.metrics, next] })
    setModal(null)
    setToast(`${metric.name} added`)
  }

  const toggleMetric = (id) => updateUser({ metrics: user.metrics.map((metric) => metric.id === id ? { ...metric, visible: !metric.visible } : metric) })

  const exportData = (type) => {
    const content = type === 'json'
      ? JSON.stringify(user, null, 2)
      : `collection,date,name,details\n${[
        ...user.entries.map((entry) => ['daily entry', entry.date, 'Health log', `weight=${entry.weight}; water=${entry.water}; calories=${entry.calories}; sleep=${entry.sleep}`]),
        ...user.workouts.map((workout) => ['workout', workout.date, workout.exercise, `category=${workout.category}; sets=${workout.sets}; reps=${workout.reps}; weight=${workout.weight}; duration=${workout.duration}; distance=${workout.distance}`]),
        ...(user.routines || []).map((routine) => ['routine', today, routine.name, `frequency=${routine.frequency}; exercises=${routine.exercises.map((exercise) => exercise.name).join('|')}`]),
        ...(user.meditation || []).map((note) => ['meditation', note.date, 'Gratitude note', note.notes]),
        ...(user.activeFast ? [['fasting', user.activeFast.startDate, user.activeFast.type, `start=${user.activeFast.startTime}; end=${user.activeFast.endDate} ${user.activeFast.endTime}; duration=${user.activeFast.duration}`]] : []),
      ].map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')}`
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([content], { type: type === 'json' ? 'application/json' : 'text/csv' }))
    link.download = `${user.name.toLowerCase().replaceAll(' ', '-')}-fitlife.${type}`
    link.click()
    setToast(`Exported ${type.toUpperCase()}`)
  }

  const logout = () => {
    setSession(null)
    setView('Snapshot')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Activity size={20} /></div>
          <span>fit<span>life</span></span>
        </div>

        <div className="profile">
          <div className="avatar">{user.name.split(' ').map((n) => n[0]).join('')}</div>
          <div>
            <strong>{user.name}</strong>
            <small>{user.guest ? 'Guest preview' : 'Wellness journey'}</small>
          </div>
        </div>

        <nav>
          {nav.map(([label, Icon]) => (
            <button className={view === label ? 'active' : ''} onClick={() => { setView(label); setMobileNav(false) }} key={label}><Icon size={18} />{label}</button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button onClick={logout}><LogOut size={18} />Log out</button>
          <div className="weekly-goal">
            <Trophy size={17} />
            <div>
              <small>Weekly goal</small>
              <strong>4 / 5 workouts</strong>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header>
          <button className="menu-btn" onClick={() => setMobileNav(!mobileNav)}><Menu size={21} /></button>
          <div>
            <p className="eyebrow">{currentHeadlineDate.toUpperCase()}</p>
            <h1>{view === 'Snapshot' ? `Good morning, ${user.name.split(' ')[0]}` : view}</h1>
            <p className="subhead">Small steps today, stronger you tomorrow.</p>
          </div>
          <div className="header-actions">
            <button className="icon-btn"><Bell size={19} /></button>
            <button className="export-btn" onClick={() => exportData('json')}><Download size={16} /> Export</button>
            <button className="primary" onClick={() => setModal('entry')}><Plus size={17} /> Daily log</button>
          </div>
        </header>

        {view === 'Snapshot' && <Snapshot user={user} latest={latest} displayed={displayed} chartData={chartData} range={range} setRange={setRange} setDrawer={setDrawer} setModal={setModal} />} 
        {view === 'Workouts' && <WorkoutView user={user} updateUser={updateUser} setModal={setModal} setToast={setToast} />}
        {view === 'Fasting' && <FastingView user={user} updateUser={updateUser} />}
        {view === 'Grateful' && <GratefulView user={user} updateUser={updateUser} />}
        {view === 'Settings' && <SettingsView user={user} updateUser={updateUser} metrics={user.metrics} toggleMetric={toggleMetric} exportData={exportData} />}
      </main>

      {modal && <Modal type={modal} user={user} metrics={user.metrics} close={() => setModal(null)} save={saveEntry} createMetric={createMetric} updateUser={updateUser} />}
      {drawer && <DetailDrawer metric={drawer.metric} user={user} range={range} setRange={setRange} close={() => setDrawer(null)} save={saveEntry} deleteEntry={deleteEntry} />}
      {toast && <div className="toast"><Check size={15} />{toast}</div>}
    </div>
  )
}

function Auth({ mode, setMode, onAuth }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    const id = form.email.toLowerCase().trim()
    if (!id || !form.password) return setError('Enter an email and password.')
    if (mode === 'login') {
      const account = read('fitlife-users', initialUsers)[id]
      if (!account || account.password !== form.password) return setError('No matching local account found.')
      onAuth(account)
      return
    }
    onAuth(seedUser(id, form.name || 'New Member'))
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand"><div className="brand-mark"><Activity size={20} /></div><span>fit<span>life</span></span></div>
        <p className="eyebrow">YOUR HEALTH, IN ONE PLACE</p>
        <h1>{mode === 'login' ? 'Welcome back.' : 'Start your journey.'}</h1>
        <p className="subhead">Track the details that make you feel your best.</p>
        <form onSubmit={submit}>
          {mode === 'register' && <label>Full name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Alex Smith" /></label>}
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
          <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></label>
          {error && <p className="error">{error}</p>}
          <button className="primary auth-submit">{mode === 'login' ? 'Log in' : 'Create account'}</button>
        </form>
        <button className="guest-btn" onClick={() => onAuth(seedUser('guest@fitlife.app', 'Guest Preview', true))}>Preview as guest</button>
        <p className="auth-switch">{mode === 'login' ? 'New to FitLife?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Register' : 'Log in'}</button></p>
      </div>
    </div>
  )
}

function Snapshot({ user, latest, displayed, chartData, range, setRange, setDrawer, setModal }) {
  const bmi = latest.weight / (user.height / 100) ** 2
  const values = { weight: latest.weight, water: latest.water, calories: latest.calories, sleep: latest.sleep, fasting: latest.fasting?.duration?.split(':')[0] || 0 }

  return (
    <>
      <section className="overview-head">
        <div><h2>Health snapshot</h2><p>Your personal dashboard, shaped around what matters.</p></div>
        <button className="custom-btn" onClick={() => setModal('metric')}><Sparkles size={15} /> Add custom metric</button>
      </section>

      <div className="snapshot-grid">
        {displayed.map((metric) => <SnapshotCard key={metric.id} metric={metric} value={values[metric.id] ?? latest.custom?.[metric.id] ?? '--'} onClick={() => setDrawer({ metric })} />)}
        <button className="add-card" onClick={() => setModal('metric')}><Plus size={20} /><strong>Add a metric</strong><small>Build your own snapshot</small></button>
      </div>

      <section className="insight"><Zap size={17} /><div><strong>Personalized for you</strong><p>{user.entries.length} days of data are shaping your trends. Your BMI is {bmi.toFixed(1)}.</p></div></section>

      <div className="charts-grid">
        <Chart title="Weight & BMI trend" subtitle="Your last 14 days" controls={<div className="segmented">{[7, 30, 90].map((item) => <button className={range === item ? 'selected' : ''} onClick={() => setRange(item)} key={item}>{item}D</button>)}</div>}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="weight" stroke="var(--purple)" strokeWidth={3} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="bmi" stroke="var(--blue)" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Chart>

        <Chart title="Consistency" subtitle="Healthy behaviors this week" controls={<button className="tiny-ghost">View</button>}>
          <div className="habit-panel">
            {[{ label: 'Hydration', value: '6.4L', done: true }, { label: 'Sleep', value: '7.8h', done: true }, { label: 'Meditation', value: '4x', done: true }, { label: 'Steps', value: '45k', done: false }].map((habit) => (
              <div className="habit-stat" key={habit.label}><span className={habit.done ? 'done' : ''} /><strong>{habit.value}</strong><small>{habit.label}</small></div>
            ))}
          </div>
        </Chart>
      </div>
    </>
  )
}

function SnapshotCard({ metric, value, onClick }) {
  const hasTarget = metric.target != null && Number(metric.target) > 0 && metric.type !== 'boolean'
  const numericValue = Number(value)
  const percent = hasTarget ? Math.min((numericValue / Number(metric.target)) * 100, 100) : 0

  return (
    <button className="snapshot-card" onClick={onClick}>
      <div className="snapshot-top"><div className="metric-dot" /><span>{metric.category}</span><ChevronDown size={15} /></div>
      <strong>{metric.name}</strong>
      <div className="metric-value">{value === '--' ? '--' : value}<small>{value === '--' ? '' : metric.unit}</small></div>
      {hasTarget ? <p>Target {metric.target} {metric.unit}</p> : <p>{metric.type === 'boolean' ? 'No target needed' : 'Goal not set'}</p>}
      <div className="progress" style={{ display: hasTarget ? 'block' : 'none' }}><span style={{ width: `${percent}%` }} /></div>
    </button>
  )
}

function Chart({ title, subtitle, controls, children }) {
  return <article className="chart-card"><div className="card-heading"><div><h3>{title}</h3><p>{subtitle}</p></div>{controls}</div>{children}</article>
}

function DetailDrawer({ metric, user, range, setRange, close, save, deleteEntry }) {
  const logs = user.entries.slice(-range).reverse()
  const field = metric.id === 'weight' ? 'weight' : metric.id === 'water' ? 'water' : metric.id === 'calories' ? 'calories' : metric.id === 'sleep' ? 'sleep' : null
  const [quick, setQuick] = useState('')
  const data = user.entries.slice(-range).map((item) => ({ day: dateLabel(item.date), value: field ? item[field] : item.custom?.[metric.id] }))
  const latestValue = field ? user.entries.at(-1)?.[field] : user.entries.at(-1)?.custom?.[metric.id] || 0
  const progressPct = metric.target ? Math.min((Number(latestValue) / Number(metric.target)) * 100, 100) : 0

  return (
    <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <aside className="detail-drawer">
        <button className="modal-close" onClick={close}><X size={18} /></button>
        <p className="eyebrow">{metric.category}</p>
        <h2>{metric.name}</h2>
        <p className="subhead">Detailed history and goal progress</p>
        <div className="drawer-goal"><strong>{metric.target ? `${Math.round(progressPct)}%` : '--'}</strong><span>{metric.target ? `of your ${metric.target} ${metric.unit} target` : 'No target configured'}</span></div>
        <div className="segmented drawer-range">{[7, 30, 90].map((item) => <button className={range === item ? 'selected' : ''} onClick={() => setRange(item)} key={item}>{item}D</button>)}</div>
        <ResponsiveContainer width="100%" height={190}><AreaChart data={data}><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="day" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)' }} /><Area dataKey="value" stroke="var(--green)" fill="var(--green)" fillOpacity={0.15} /></AreaChart></ResponsiveContainer>
        <div className="quick-log"><strong>Quick log</strong><div className="quick-row"><input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder={`New ${metric.name}`} /><button className="primary" onClick={() => { const amount = Number(quick); if (!Number.isFinite(amount)) return; const next = { ...user.entries.at(-1), id: uid(), date: today, [field || 'custom']: amount }; save(next); setQuick('') }}>Save</button></div></div>
        <div className="entry-list">{logs.map((entry) => <div className="entry-row" key={entry.id}><div className="entry-date"><strong>{dateLabel(entry.date)}</strong></div><div className="entry-values"><span>{field ? entry[field] : entry.custom?.[metric.id]} {metric.unit}</span></div><button className="icon-button" onClick={() => deleteEntry(entry.id)}><Trash2 size={14} /></button></div>)}</div>
      </aside>
    </div>
  )
}

function WorkoutView({ user, updateUser, setModal, setToast }) {
  const [editingRoutine, setEditingRoutine] = useState(null)
  const totalVolume = user.workouts.reduce((sum, workout) => sum + (Number(workout.weight) * Number(workout.reps) || 0), 0)
  const streakCount = user.routines?.reduce((sum, routine) => sum + (routine.streak || 0), 0) || 0

  const addRoutine = () => {
    const newRoutine = { id: uid(), name: 'New routine', category: 'Strength', days: ['Mon', 'Thu'], frequency: '2x/week', streak: 1, exercises: [{ id: uid(), name: 'Barbell Bench Press', type: 'reps', sets: 3, reps: 8, weight: 60, duration: 0, distance: 0 }] }
    updateUser({ routines: [...(user.routines || []), newRoutine] })
    setToast('Routine created')
  }

  const saveRoutine = (routine) => {
    if (!routine || !routine.exercises?.length) {
      setToast('Add at least one exercise')
      return
    }

    if (hasDuplicateExercises(routine)) {
      setToast('No duplicate exercises in one routine')
      return
    }

    const cleaned = sanitizeRoutine(routine)
    updateUser({ routines: user.routines.map((item) => item.id === cleaned.id ? cleaned : item) })
    setEditingRoutine(null)
    setToast('Routine updated')
  }

  return (
    <>
      <section className="overview-head"><div><h2>Workout routines</h2><p>Build routines like Upper Body Exercises, then record each movement with the right measurements.</p></div><button className="primary" onClick={() => setModal('workout')}><Plus size={16} /> Log workout</button></section>
      <div className="stats-strip"><div className="mini-stat"><small>Workout volume</small><strong>{totalVolume}</strong></div><div className="mini-stat"><small>Routine streak</small><strong>{streakCount} days</strong></div><div className="mini-stat"><small>Sessions</small><strong>{user.workouts.length}</strong></div></div>
      <div className="routine-grid">{(user.routines || []).map((routine) => <div className="routine-card" key={routine.id}><div className="routine-top"><div><small>{routine.category}</small><h3>{routine.name}</h3></div><button className="icon-button" aria-label={`Edit ${routine.name}`} onClick={() => setEditingRoutine(routine)}><Pencil size={14} /></button></div><div className="routine-meta"><span>{routine.frequency}</span><span>{routine.days.join(' • ')}</span></div><div className="exercise-list">{routine.exercises.map((exercise) => <div key={exercise.id} className="exercise-item"><div><strong>{exercise.name}</strong><small>{exercise.type === 'reps' ? `${exercise.sets} sets • ${exercise.reps} reps` : exercise.type === 'duration' ? `${exercise.duration} min` : `${exercise.distance} km`}</small></div><span>{exercise.weight ? `${exercise.weight} kg` : exercise.distance ? `${exercise.distance} km` : exercise.duration ? `${exercise.duration} min` : `${exercise.reps} reps`}</span></div>)}</div><div className="routine-footer"><div className="streak-pill">🔥 {routine.streak || 1} day streak</div><button className="text-action" onClick={() => setEditingRoutine(routine)}>Edit routine</button></div></div>)}</div>
      <section className="recent"><div className="section-title"><h2>Recent workouts</h2><button className="tiny-ghost" onClick={() => setEditingRoutine(user.routines?.[0] || null)}>Bulk update</button></div>{user.workouts.map((workout) => <div className="entry-row" key={workout.id}><div className="entry-date"><strong>{workout.weight || workout.distance || workout.duration || 0}</strong><small>{workout.weight ? 'kg' : workout.distance ? 'km' : workout.duration ? 'min' : 'sets'}</small></div><div className="entry-values"><span><Dumbbell size={14} />{workout.exercise}</span><span>{workout.reps ? `${workout.reps} reps` : workout.distance ? `${workout.distance} km` : `${workout.duration} min`}</span><span>{workout.intensity}</span><span>{workout.timestamp}</span></div><b className="pr-badge">{workout.frequency || 'Habit'}</b></div>)}</section>
      {editingRoutine && <RoutineEditor routine={editingRoutine} close={() => setEditingRoutine(null)} save={saveRoutine} />}
    </>
  )
}

function RoutineEditor({ routine, close, save }) {
  const [draft, setDraft] = useState(sanitizeRoutine(routine))
  const update = (key, value) => setDraft({ ...draft, [key]: value })
  const updateExercise = (id, key, value) => setDraft({ ...draft, exercises: draft.exercises.map((exercise) => exercise.id === id ? { ...exercise, [key]: value } : exercise) })
  const removeExercise = (id) => setDraft({ ...draft, exercises: draft.exercises.filter((exercise) => exercise.id !== id) })
  const addExercise = () => setDraft({ ...draft, exercises: [...draft.exercises, { id: uid(), name: 'Barbell Bench Press', type: 'reps', sets: 3, reps: 8, weight: 60, duration: 0, distance: 0, distanceUnit: 'km/h', paceUnit: 'km/h' }] })
  const duplicateExerciseError = hasDuplicateExercises(draft)

  const formatDurationDisplay = (minutes) => {
    const totalSeconds = Math.max(0, Math.round(Number(minutes || 0) * 60))
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
    const secs = String(totalSeconds % 60).padStart(2, '0')
    return `${hours}:${mins}:${secs}`
  }

  const calculatePace = (exercise) => {
    const durationMinutes = Number(exercise.duration || 0)
    const distance = Number(exercise.distance || 0)
    const paceUnit = exercise.paceUnit || 'km/h'
    if (!durationMinutes || !distance) return '0.0'
    const hours = durationMinutes / 60
    const speed = distance / hours
    if (paceUnit === 'mi/h') return (speed * 0.621371).toFixed(1)
    if (paceUnit === 'm/s') return (speed / 3.6).toFixed(1)
    return speed.toFixed(1)
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <form className="modal routine-editor" onSubmit={(event) => {
      event.preventDefault()
      if (!draft.exercises?.length) return
      if (duplicateExerciseError) return
      save(draft)
    }}>
      <button type="button" className="modal-close" onClick={close}><X size={18} /></button>
      <p className="eyebrow">ROUTINE BUILDER</p>
      <h2>Edit routine</h2>
      <div className="form-grid">
        <label>Routine name<input value={draft.name} onChange={(event) => update('name', event.target.value)} /></label>
        <label>Category<select value={draft.category} onChange={(event) => update('category', event.target.value)}><option>Strength</option><option>Cardio</option><option>Mobility</option></select></label>
        <label>Frequency<select value={draft.frequency} onChange={(event) => update('frequency', event.target.value)}><option>1x/week</option><option>2x/week</option><option>3x/week</option><option>4x/week</option><option>5x/week</option></select></label>
        <label>Training days<input value={draft.days.join(', ')} onChange={(event) => update('days', event.target.value.split(',').map((day) => day.trim()).filter(Boolean))} /></label>
      </div>
      <div className="editor-section-heading"><div><h3>Exercises</h3><a href={EXERCISE_GUIDE_URL} target="_blank" rel="noreferrer">View illustrated exercise guide</a></div><button type="button" className="tiny-ghost" onClick={addExercise}><Plus size={14} /> Add exercise</button></div>
      {duplicateExerciseError && <p className="duplicate-warning">Two exercises cannot be the same in one routine.</p>}
      <div className="routine-exercise-editor">{draft.exercises.map((exercise) => {
        const profile = getExerciseProfile(exercise.name)
        const fields = profile.fields || ['sets', 'reps', 'weight']
        const isDistanceBased = fields.includes('distance') || fields.includes('duration') && !fields.includes('weight')
        const isRepBased = !isDistanceBased
        const exerciseGroups = EXERCISE_GROUPS.map((group) => ({
          group,
          items: EXERCISE_LIBRARY.filter((item) => item.primaryCategory === group).map((item) => item.name),
        }))

        return <div className="routine-exercise-row" key={exercise.id}>
          <div className="routine-exercise-name">
            <label className="mini-label">Exercise</label>
            <select value={exercise.name} onChange={(event) => {
              const nextName = event.target.value
              const nextProfile = getExerciseProfile(nextName)
              updateExercise(exercise.id, 'name', nextName)
              updateExercise(exercise.id, 'type', nextProfile.fields.includes('distance') ? 'distance' : nextProfile.fields.includes('duration') ? 'duration' : 'reps')
            }}>
              {exerciseGroups.map(({ group, items }) => (
                <optgroup key={group} label={group}>
                  {items.map((item) => <option key={item} value={item}>{item}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="routine-exercise-actions">
            <div className="routine-exercise-mode">
              <label className="mini-label">Type</label>
              <div className="mode-chip">{isDistanceBased ? 'Duration' : 'Rep'}</div>
            </div>
            <button type="button" className="tiny-ghost danger" onClick={() => removeExercise(exercise.id)}>Remove</button>
          </div>

          <div className="routine-exercise-fields">
            {isRepBased ? (
              <>
                <div className="routine-field"><label className="mini-label">Sets</label><input type="number" min="1" value={exercise.sets || 0} aria-label="Sets" onChange={(event) => updateExercise(exercise.id, 'sets', Number(event.target.value))} /></div>
                <div className="routine-field"><label className="mini-label">Reps</label><input type="number" min="1" value={exercise.reps || 0} aria-label="Reps" onChange={(event) => updateExercise(exercise.id, 'reps', Number(event.target.value))} /></div>
                <div className="routine-field"><label className="mini-label">Weight</label><input type="number" min="0" value={exercise.weight || 0} aria-label="Kilograms" onChange={(event) => updateExercise(exercise.id, 'weight', Number(event.target.value))} /></div>
                <div className="routine-field"><label className="mini-label">Unit</label><select value={exercise.weightUnit || 'kg'} onChange={(event) => updateExercise(exercise.id, 'weightUnit', event.target.value)}><option value="kg">kg</option><option value="lb">lb</option></select></div>
              </>
            ) : (
              <>
                <div className="routine-field"><label className="mini-label">Duration</label><input type="text" value={formatDurationDisplay(exercise.duration || 0)} aria-label="Duration in hh:mm:ss" onChange={(event) => {
                  const raw = event.target.value
                  const parts = raw.split(':').map((part) => Number(part) || 0)
                  const seconds = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts.length === 2 ? parts[0] * 60 + parts[1] : Number(raw || 0) * 60
                  updateExercise(exercise.id, 'duration', Math.max(0, seconds / 60))
                }} /></div>
                <div className="routine-field"><label className="mini-label">Distance</label><input type="number" min="0" step="0.1" value={exercise.distance || 0} aria-label="Distance" onChange={(event) => updateExercise(exercise.id, 'distance', Number(event.target.value))} /></div>
                <div className="routine-field"><label className="mini-label">Pace</label><input type="text" value={`${calculatePace(exercise)} ${exercise.paceUnit || 'km/h'}`} readOnly /></div>
                <div className="routine-field"><label className="mini-label">Unit</label><select value={exercise.paceUnit || 'km/h'} onChange={(event) => updateExercise(exercise.id, 'paceUnit', event.target.value)}><option value="km/h">km/h</option><option value="mi/h">mi/h</option><option value="m/s">m/s</option></select></div>
              </>
            )}
          </div>
        </div>
      })}</div>
      <button className="primary modal-submit" type="submit">Save routine</button>
    </form>
  </div>
}

function FastingView({ user, updateUser }) {
  const defaultFastState = (selectedDate = new Date()) => {
    const now = new Date(selectedDate)
    const startDate = now.toISOString().slice(0, 10)
    const startTime = now.toTimeString().slice(0, 5)
    const endDate = new Date(now.getTime() + 16 * 3600000).toISOString().slice(0, 10)
    const endTime = new Date(now.getTime() + 16 * 3600000).toTimeString().slice(0, 5)

    return {
      type: '16:8',
      custom: '16',
      duration: '16',
      startDate,
      endDate,
      startTime,
      endTime,
      startedAt: now.toISOString(),
      isOngoing: false,
      note: 'Your current fast is in the fat-burning window.'
    }
  }

  const [newFast, setNewFast] = useState(() => {
    const current = user.activeFast || defaultFastState()
    return { ...defaultFastState(), ...current, custom: current.custom || current.duration || '16', duration: current.duration || current.custom || '16' }
  })
  const [timeMode, setTimeMode] = useState('elapsed')
  const [now, setNow] = useState(Date.now())
  const [editingHistoryId, setEditingHistoryId] = useState(null)
  const [historyDraft, setHistoryDraft] = useState({})
  const history = user.fastingHistory || []
  const isFastingActive = Boolean(user.activeFast?.isOngoing || newFast.isOngoing)
  const lastFast = history[0] || null
  const lastFastMs = lastFast ? new Date(lastFast.endedAt || lastFast.endedAt).getTime() : 0
  const sinceLastFastMs = lastFastMs ? Math.max(0, now - lastFastMs) : 0
  const sinceLastFastLabel = lastFastMs ? `${Math.floor(sinceLastFastMs / 3600000)}h ${Math.floor((sinceLastFastMs % 3600000) / 60000)}m` : 'Not started yet'

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const startDateTime = new Date(`${newFast.startDate || today}T${newFast.startTime || '20:00'}:00`)
  const endDateTime = new Date(`${newFast.endDate || today}T${newFast.endTime || '12:00'}:00`)
  const invalidStart = startDateTime.getTime() > now
  const invalidWindow = endDateTime.getTime() < startDateTime.getTime()
  const invalidFast = invalidStart || invalidWindow

  useEffect(() => {
    if (isFastingActive && !invalidFast) updateUser({ activeFast: { ...newFast, isOngoing: true } })
  }, [newFast, invalidFast, isFastingActive])

  const plannedMs = Math.max(0, endDateTime.getTime() - startDateTime.getTime())
  const elapsedMs = isFastingActive ? Math.max(0, now - startDateTime.getTime()) : 0
  const remainingMs = isFastingActive ? Math.max(0, endDateTime.getTime() - now) : 0
  const elapsedHours = elapsedMs / 3600000
  const stageIndex = FASTING_STAGES.reduce((currentIndex, stage, index) => elapsedHours >= stage.startHours ? index : currentIndex, 0)
  const currentStage = FASTING_STAGES[stageIndex]
  const displayMs = timeMode === 'elapsed' ? elapsedMs : remainingMs
  const displayHours = Math.floor(displayMs / 3600000)
  const displayMinutes = Math.floor((displayMs % 3600000) / 60000)
  const displaySeconds = Math.floor((displayMs % 60000) / 1000)
  const percent = isFastingActive ? Math.min((elapsedMs / Math.max(plannedMs, 1)) * 100, 100) : 0

  const getDurationHours = (startDateValue, startTimeValue, endDateValue, endTimeValue) => {
    const start = new Date(`${startDateValue || today}T${startTimeValue || '20:00'}:00`).getTime()
    const end = new Date(`${endDateValue || today}T${endTimeValue || '12:00'}:00`).getTime()
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
    return Number(((end - start) / 3600000).toFixed(2))
  }

  const getPresetDurationHours = (value) => {
    if (!value || value === 'Custom') return 16
    const [fastHours] = String(value).split(':')
    const hours = Number(fastHours)
    return Number.isFinite(hours) && hours > 0 ? hours : 16
  }

  const applyPreset = (value) => {
    if (value === 'Custom') {
      setNewFast((prev) => ({ ...prev, type: 'Custom', custom: prev.custom || '16', duration: prev.custom || '16' }))
      return
    }

    const [startHour, endHour] = value.split(':')
    const start = Number(startHour)
    const end = Number(endHour)
    const startTime = `${String(start).padStart(2, '0')}:00`
    const endTime = `${String(end).padStart(2, '0')}:00`
    const nextEndDate = end <= start ? tomorrow : (newFast.endDate || tomorrow)

    setNewFast((prev) => ({
      ...prev,
      type: value,
      custom: value,
      startTime,
      endTime,
      endDate: nextEndDate,
      duration: value,
    }))
  }

  const setTypePreset = applyPreset

  const handleWindowChange = (patch) => {
    setNewFast((prev) => {
      const next = { ...prev, ...patch }
      const computedHours = getDurationHours(next.startDate, next.startTime, next.endDate, next.endTime)
      const nextType = patch.endDate || patch.endTime || patch.startDate || patch.startTime ? 'Custom' : prev.type

      return {
        ...next,
        type: nextType,
        custom: computedHours > 0 ? String(computedHours) : prev.custom || '16',
        duration: computedHours > 0 ? String(computedHours) : prev.duration || '16',
      }
    })
  }

  const startFast = () => {
    const nowDate = new Date()
    const selectedDuration = newFast.type === 'Custom'
      ? Number(newFast.custom || newFast.duration || 16)
      : getPresetDurationHours(newFast.type || '16:8')
    const nextFast = {
      ...defaultFastState(nowDate),
      type: newFast.type === 'Custom' ? 'Custom' : (newFast.type || '16:8'),
      custom: newFast.type === 'Custom' ? String(newFast.custom || newFast.duration || selectedDuration) : String(newFast.type || '16:8'),
      duration: newFast.type === 'Custom' ? String(newFast.custom || newFast.duration || selectedDuration) : String(newFast.type || '16:8'),
      startDate: nowDate.toISOString().slice(0, 10),
      startTime: nowDate.toTimeString().slice(0, 5),
      endDate: new Date(nowDate.getTime() + selectedDuration * 3600000).toISOString().slice(0, 10),
      endTime: new Date(nowDate.getTime() + selectedDuration * 3600000).toTimeString().slice(0, 5),
      startedAt: nowDate.toISOString(),
      isOngoing: true,
    }

    setNewFast(nextFast)
    updateUser({ activeFast: nextFast })
  }

  const endFast = () => {
    if (!isFastingActive) return

    const startedAt = startDateTime.toISOString()
    const endedAt = new Date().toISOString()
    const durationHours = Number(Math.max(0, (new Date(endedAt).getTime() - startDateTime.getTime()) / 3600000).toFixed(2))
    const phase = currentStage?.title || 'Fat Burning'
    const fastType = newFast.type === 'Custom' ? 'Custom' : (newFast.type || '16:8')

    const entry = {
      id: uid(),
      startedAt,
      endedAt,
      durationHours,
      durationLabel: `${Math.floor(durationHours)}h ${Math.round((durationHours % 1) * 60)}m`,
      type: fastType,
      date: new Date(endedAt).toISOString().slice(0, 10),
      phase,
      description: `Ended during ${phase.toLowerCase()}`,
    }

    const updatedHistory = [entry, ...(user.fastingHistory || [])].slice(0, 20)
    const lastEntry = user.entries.at(-1) || { id: uid(), date: today, weight: 0, water: 0, calories: 0, sleep: 0, quality: 0, custom: {}, fasting: { start: '20:00', end: '12:00', duration: '0:00', startedAt: '', completed: false }, habits: { steps: 0, meditation: false, supplements: false } }
    const latestWithFast = {
      ...lastEntry,
      date: lastEntry.date || today,
      fasting: {
        ...lastEntry.fasting,
        duration: `${Math.floor(durationHours)}:${String(Math.round((durationHours % 1) * 60)).padStart(2, '0')}`,
        startedAt,
        completed: true,
      },
    }

    const nextIdle = { ...defaultFastState(new Date(endedAt)), isOngoing: false }

    updateUser({
      activeFast: nextIdle,
      fastingHistory: updatedHistory,
      entries: user.entries.length ? user.entries.map((entry, index) => index === user.entries.length - 1 ? latestWithFast : entry) : [latestWithFast],
    })
    setNewFast(nextIdle)
    setEditingHistoryId(null)
  }

  const updateHistoryEntry = (entryId, patch) => {
    updateUser({
      fastingHistory: (user.fastingHistory || []).map((item) => item.id === entryId ? { ...item, ...patch } : item),
    })
  }

  const saveHistoryDraft = (entry) => {
    updateHistoryEntry(entry.id, {
      type: historyDraft[entry.id]?.type || entry.type,
      description: historyDraft[entry.id]?.description || entry.description,
      durationLabel: historyDraft[entry.id]?.durationLabel || entry.durationLabel,
      durationHours: Number(historyDraft[entry.id]?.durationHours || entry.durationHours || 0),
    })
    setEditingHistoryId(null)
  }

  return (
    <section className="fast-page">
      <div className="fast-card fasting-layout">
        <section className="fast-setup-section">
          <div className="fast-card-head">
            <div>
              <p className="eyebrow">FASTING</p>
              <h2>Fast tracking</h2>
            </div>
            <div className="status-pill"><TimerReset size={14} /></div>
          </div>

          <div className="fast-toolbar">
            <div className="segmented">
              <button className={timeMode === 'elapsed' ? 'selected' : ''} onClick={() => setTimeMode('elapsed')}>Elapsed</button>
              <button className={timeMode === 'remaining' ? 'selected' : ''} onClick={() => setTimeMode('remaining')}>Remaining</button>
            </div>
            <select value={newFast.type || '16:8'} onChange={(e) => setTypePreset(e.target.value)}>
              {FASTING_OPTIONS.map((option) => <option key={option} value={option}>{option === 'Custom' ? 'Custom' : option}</option>)}
            </select>
          </div>

          <div className="fast-fields">
            <label>Start time<input type="time" value={newFast.startTime || '20:00'} onChange={(e) => handleWindowChange({ startTime: e.target.value })} /></label>
            <label>Start date<input type="date" value={newFast.startDate || today} onChange={(e) => handleWindowChange({ startDate: e.target.value })} /></label>
            <label>End time<input type="time" value={newFast.endTime || '12:00'} disabled={newFast.type !== 'Custom'} onChange={(e) => handleWindowChange({ endTime: e.target.value })} /></label>
            <label>End date<input type="date" value={newFast.endDate || today} onChange={(e) => handleWindowChange({ endDate: e.target.value })} /></label>
            <label>Fasting type<select value={newFast.type || '16:8'} onChange={(e) => applyPreset(e.target.value)}>{FASTING_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
            <label>Custom duration<input value={newFast.custom || newFast.duration || '16'} disabled={newFast.type !== 'Custom'} onChange={(e) => setNewFast({ ...newFast, custom: e.target.value, type: 'Custom', duration: e.target.value })} /></label>
          </div>

          {invalidStart && <p className="fast-validation" role="alert">Start date and time cannot be in the future.</p>}
          {invalidWindow && <p className="fast-validation" role="alert">End date and time must be on or after the start date and time.</p>}
          <div className="fast-summary">
            <div><small>Elapsed</small><strong>{String(Math.floor(elapsedMs / 3600000)).padStart(2, '0')}:{String(Math.floor((elapsedMs % 3600000) / 60000)).padStart(2, '0')}</strong></div>
            <div><small>Remaining</small><strong>{String(Math.floor(remainingMs / 3600000)).padStart(2, '0')}:{String(Math.floor((remainingMs % 3600000) / 60000)).padStart(2, '0')}</strong></div>
            <div><small>Planned duration</small><strong>{newFast.duration || newFast.custom || '16:8'}</strong></div>
          </div>

          <div className="timer-visual">
            <div className="timer-ring" style={{ '--progress': `${percent}%`, '--ring-color': currentStage.color }}>
              <div className="timer-core">
                <strong>{String(displayHours).padStart(2, '0')}:{String(displayMinutes).padStart(2, '0')}:{String(displaySeconds).padStart(2, '0')}</strong>
                <span>{timeMode === 'elapsed' ? 'elapsed' : 'remaining'}</span>
              </div>
            </div>
          </div>

          <div className="fast-stage-note" style={{ '--stage-color': currentStage.color }}>
            <h3>{currentStage.label} · {currentStage.title}</h3>
            <p>{currentStage.note}</p>
            <small>{currentStage.range}</small>
          </div>

          <div className="fast-action-row">
            {isFastingActive ? (
              <button type="button" className="primary" onClick={endFast}>End Fast</button>
            ) : (
              <button type="button" className="primary" onClick={startFast}>Start Fast</button>
            )}
          </div>

          {!isFastingActive && lastFast && (
            <div className="since-last-fast">
              <small>Since last Fast</small>
              <strong>{sinceLastFastLabel}</strong>
            </div>
          )}
        </section>

        <section className="fast-stages-section">
          <div className="section-title"><div><h2>Fasting stages timeline</h2><p>See the stage your current fast is moving through.</p></div></div>
          <div className="fast-timeline">
            <div className="fast-rail" />
            {FASTING_STAGES.map((stage, index) => (
              <div key={stage.id} className={`fast-stage-node ${index === stageIndex ? 'active' : ''}`} style={{ '--stage-color': stage.color }}>
                <div className="fast-node-icon">{index % 2 === 0 ? '◔' : '◉'}</div>
                <div className="stage-copy"><strong>{stage.label}</strong><span>{stage.range}</span></div>
                <p>{stage.title}</p>
                <small>{stage.note}</small>
              </div>
            ))}
          </div>

          <div className="fast-history-block">
            <div className="section-title"><div><h2>Fast history</h2></div></div>
            <div className="fast-history-list">
              {(history.length ? history : []).map((entry) => {
                const isEditing = editingHistoryId === entry.id
                const draftValue = historyDraft[entry.id] || entry

                return (
                  <div key={entry.id} className="fast-history-item">
                    {isEditing ? (
                      <div className="fast-history-edit">
                        <label>Type<input value={draftValue.type || ''} onChange={(event) => setHistoryDraft((prev) => ({ ...prev, [entry.id]: { ...draftValue, type: event.target.value } }))} /></label>
                        <label>Duration<input value={draftValue.durationLabel || ''} onChange={(event) => setHistoryDraft((prev) => ({ ...prev, [entry.id]: { ...draftValue, durationLabel: event.target.value } }))} /></label>
                        <label>Phase<input value={draftValue.description || ''} onChange={(event) => setHistoryDraft((prev) => ({ ...prev, [entry.id]: { ...draftValue, description: event.target.value } }))} /></label>
                        <div className="fast-history-actions">
                          <button type="button" className="tiny-ghost" onClick={() => setEditingHistoryId(null)}>Cancel</button>
                          <button type="button" className="primary" onClick={() => saveHistoryDraft(entry)}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="history-topline">
                          <div>
                            <strong>{entry.type}</strong>
                            <small>{entry.date}</small>
                          </div>
                          <div className="history-duration">{entry.durationLabel || `${Math.round(entry.durationHours || 0)}h`}</div>
                        </div>
                        <div className="history-infographic">
                          <div><span>Phase</span><strong>{entry.phase || entry.description || 'Fat Burning'}</strong></div>
                          <div><span>Stopped</span><strong>{entry.description || 'Ended during a fast'}</strong></div>
                        </div>
                        <button type="button" className="tiny-ghost history-edit-btn" onClick={() => setEditingHistoryId(entry.id)}>Edit</button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}

function GratefulView({ user, updateUser }) {
  const [note, setNote] = useState('')
  const addNote = () => {
    if (!note.trim()) return
    updateUser({ meditation: [{ id: uid(), date: today, notes: note.trim() }, ...(user.meditation || [])] })
    setNote('')
  }

  return (
    <section className="grateful-page">
      <div className="overview-head"><div><h2>Grateful Meditation</h2><p>Reflect, settle, and capture one moment of gratitude.</p></div></div>
      <div className="meditation-panel"><div className="meditation-input"><NotebookPen size={18} /><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What are you grateful for today?" rows={5} /></div><button className="primary" onClick={addNote}>Save note</button></div>
      <div className="notes-list">{(user.meditation || []).map((entry) => <div key={entry.id} className="note-card"><div className="note-header"><strong>{dateLabel(entry.date)}</strong><Heart size={14} /></div><p>{entry.notes}</p></div>)}</div>
    </section>
  )
}

function SettingsView({ user, updateUser, metrics, toggleMetric, exportData }) {
  const [profile, setProfile] = useState({ name: user.name, height: user.height, units: user.units, theme: user.theme })

  return (
    <>
      <section className="overview-head"><div><h2>Profile & preferences</h2><p>These settings are isolated to {user.email}.</p></div><button className="export-btn" onClick={() => exportData('csv')}><Download size={16} /> Export CSV</button></section>
      <div className="settings-grid">
        <section className="settings-panel">
          <h3>Account details</h3>
          <label>Name<input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
          <label>Height (cm)<input type="number" value={profile.height} onChange={(e) => setProfile({ ...profile, height: Number(e.target.value) })} /></label>
          <label>Units<select value={profile.units} onChange={(e) => setProfile({ ...profile, units: e.target.value })}><option>kg</option><option>lbs</option></select></label>
          <button className="primary" onClick={() => updateUser(profile)}>Save profile</button>
        </section>

        <section className="settings-panel">
          <h3>Appearance</h3>
          <div className="theme-switch">
            <button className={profile.theme === 'light' ? 'selected' : ''} onClick={() => { setProfile({ ...profile, theme: 'light' }); updateUser({ theme: 'light' }) }}><SunMedium size={14} /> Light</button>
            <button className={profile.theme === 'dark' ? 'selected' : ''} onClick={() => { setProfile({ ...profile, theme: 'dark' }); updateUser({ theme: 'dark' }) }}><Moon size={14} /> Dark</button>
          </div>

          <h3>Custom metrics</h3>
          <div className="metric-list">{metrics.map((metric) => <div className="metric-row" key={metric.id}><div><strong>{metric.name}</strong><small>{metric.type === 'boolean' ? 'Boolean' : metric.type === 'combined' ? 'Boolean + value' : 'Numeric'}</small></div><button onClick={() => toggleMetric(metric.id)}>{metric.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button></div>)}</div>
        </section>
      </div>
    </>
  )
}

function Modal({ type, user, metrics, close, save, createMetric, updateUser }) {
  const [form, setForm] = useState(type === 'metric'
    ? { name: '', unit: 'g', target: '', type: 'numeric', category: user.categories[0] }
    : type === 'workout'
    ? { exercise: 'Barbell Deadlift', weight: 100, reps: 5, sets: 3, duration: 0, distance: 0, intensity: 'Moderate', category: 'strength', timestamp: new Date().toTimeString().slice(0, 5), frequency: '2x/week' }
      : type === 'fast'
        ? { type: user.activeFast?.type || '16:8', custom: user.activeFast?.custom || '16:8', startDate: user.activeFast?.startDate || today, endDate: user.activeFast?.endDate || today, startTime: user.activeFast?.startTime || '20:00', endTime: user.activeFast?.endTime || '12:00', duration: user.activeFast?.duration || '16:8', startedAt: user.activeFast?.startedAt || new Date().toISOString() }
        : { weight: user.entries.at(-1)?.weight || 72, water: user.entries.at(-1)?.water || 2.5, calories: user.entries.at(-1)?.calories || 650, sleep: user.entries.at(-1)?.sleep || 7.5, quality: user.entries.at(-1)?.quality || 88, custom: {}, fasting: user.entries.at(-1)?.fasting || { start: '20:00', end: '12:00', duration: '16:8', startedAt: '', completed: false }, habits: user.entries.at(-1)?.habits || { steps: 8000, meditation: false, supplements: false } })
  const [fastError, setFastError] = useState('')

  const update = (key, value) => setForm({ ...form, [key]: value })
  const metricType = form.type || 'numeric'
  const showTarget = metricType === 'numeric' || metricType === 'duration' || metricType === 'combined'

  const submit = (e) => {
    e.preventDefault()

    if (type === 'metric') {
      const target = showTarget && form.target !== '' ? Number(form.target) : null
      return createMetric({ ...form, target, type: metricType })
    }

    if (type === 'workout') {
      const workout = { ...form, id: uid(), date: today, weight: Number(form.weight), reps: Number(form.reps), sets: Number(form.sets), duration: Number(form.duration), distance: Number(form.distance) }
      updateUser({ workouts: [...user.workouts, workout] })
      close()
      return
    }

    if (type === 'fast') {
      const startDateTime = new Date(`${form.startDate}T${form.startTime}:00`)
      const endDateTime = new Date(`${form.endDate}T${form.endTime}:00`)
      if (startDateTime.getTime() > Date.now()) return setFastError('Start date and time cannot be in the future.')
      if (endDateTime.getTime() < startDateTime.getTime()) return setFastError('End date and time must be on or after the start date and time.')
      updateUser({ activeFast: { ...form, duration: form.custom || form.duration } })
      close()
      return
    }

    save({ ...form, id: uid(), date: today, weight: Number(form.weight), water: Number(form.water), calories: Number(form.calories), sleep: Number(form.sleep), quality: Number(form.quality), custom: Object.fromEntries(Object.entries(form.custom).map(([key, value]) => [key, Number(value)])) })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <form className="modal" onSubmit={submit}>
        <button type="button" className="modal-close" onClick={close}><X size={18} /></button>

        {type === 'metric' && <>
          <p className="eyebrow">METRIC BUILDER</p>
          <h2>Add custom metric</h2>
          <label>Metric name<input required placeholder="Protein intake" value={form.name} onChange={(e) => update('name', e.target.value)} /></label>
          <div className="form-grid">
            <label>Unit<input required value={form.unit} onChange={(e) => update('unit', e.target.value)} /></label>
            <label>Classification<select value={form.category} onChange={(e) => update('category', e.target.value)}>{user.categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          </div>
          <label>Metric type<select value={metricType} onChange={(e) => update('type', e.target.value)}><option value="numeric">Numeric</option><option value="duration">Duration</option><option value="rating">Rating 1-5</option><option value="boolean">Boolean done / not done</option><option value="combined">Boolean + value</option></select></label>
          {showTarget && <label>Target value<input type="number" value={form.target} onChange={(e) => update('target', e.target.value)} placeholder={metricType === 'combined' ? 'Optional target' : 'Target value'} /></label>}
          <button className="primary modal-submit" type="submit">Create metric</button>
        </>}

        {type === 'workout' && <>
          <p className="eyebrow">ROUTINE LOG</p>
          <h2>Track a session</h2>
          <label>Exercise<select className="exercise-select" value={form.exercise} onChange={(e) => update('exercise', e.target.value)}>
            {EXERCISE_GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {EXERCISE_LIBRARY.filter((exercise) => exercise.primaryCategory === group).map((exercise) => (
                  <option key={exercise.name} value={exercise.name}>{exercise.name}</option>
                ))}
              </optgroup>
            ))}
          </select></label>
          <div className="form-grid">
            <label>Category<select value={form.category} onChange={(e) => update('category', e.target.value)}><option value="strength">Strength</option><option value="cardio">Cardio</option><option value="mobility">Mobility</option></select></label>
            <label>Frequency<select value={form.frequency} onChange={(e) => update('frequency', e.target.value)}><option>2x/week</option><option>3x/week</option><option>4x/week</option><option>5x/week</option></select></label>
          </div>
          <div className="form-grid">
            <label>Weight (kg)<input type="number" value={form.weight} onChange={(e) => update('weight', e.target.value)} /></label>
            <label>Reps<input type="number" value={form.reps} onChange={(e) => update('reps', e.target.value)} /></label>
            <label>Sets<input type="number" value={form.sets} onChange={(e) => update('sets', e.target.value)} /></label>
            <label>Duration (min)<input type="number" value={form.duration} onChange={(e) => update('duration', e.target.value)} /></label>
            <label>Distance (km)<input type="number" step="0.1" value={form.distance} onChange={(e) => update('distance', e.target.value)} /></label>
            <label>Intensity<select value={form.intensity} onChange={(e) => update('intensity', e.target.value)}><option>Light</option><option>Moderate</option><option>High</option></select></label>
          </div>
          <button className="primary modal-submit" type="submit">Save workout</button>
        </>}

        {type === 'fast' && <>
          <p className="eyebrow">FASTING</p>
          <h2>Edit fast window</h2>
          <div className="form-grid">
            <label>Start date<input type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} /></label>
            <label>Start time<input type="time" value={form.startTime} onChange={(e) => update('startTime', e.target.value)} /></label>
            <label>End date<input type="date" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} /></label>
            <label>End time<input type="time" value={form.endTime} onChange={(e) => update('endTime', e.target.value)} /></label>
            <label>Type<select value={form.type} onChange={(e) => { const value = e.target.value; if (value === 'Custom') { update('type', 'Custom'); update('custom', form.custom || '16'); return } update('type', value); update('custom', value); update('duration', value) }}>
              {FASTING_OPTIONS.map((option) => <option key={option} value={option}>{option === 'Custom' ? 'Custom' : option}</option>)}
            </select></label>
            <label>Custom duration<input value={form.custom || form.duration || '16'} onChange={(e) => { update('custom', e.target.value); update('duration', e.target.value); update('type', 'Custom') }} /></label>
          </div>
          {fastError && <p className="fast-validation" role="alert">{fastError}</p>}
          <button className="primary modal-submit" type="submit">Update fast</button>
        </>}
      </form>
    </div>
  )
}

export default App
