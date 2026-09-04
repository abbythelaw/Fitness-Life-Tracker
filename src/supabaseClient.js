import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const hasSupabaseConfig = Boolean(
  supabaseUrl
  && supabaseAnonKey
  && !supabaseUrl.includes('your_supabase_url_here')
  && !supabaseAnonKey.includes('your_supabase_anon_key_here')
  && /^https:\/\/[^/]+\.supabase\.co$/.test(supabaseUrl),
)

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export const isSupabaseConfigured = Boolean(supabase)

export const toCloudProfile = (user) => {
  if (!user) return null
  const { password: _password, guest: _guest, ...profile } = user
  return profile
}

export const fromCloudProfile = (row, fallback = {}) => ({
  ...fallback,
  ...(row?.data || {}),
  id: row?.id || fallback.id,
  email: row?.email || fallback.email,
  updatedAt: row?.updated_at || fallback.updatedAt,
})

export const normalizeSupabaseExercise = (exercise) => {
  const metrics = Array.isArray(exercise.default_metrics)
    ? exercise.default_metrics
    : typeof exercise.default_metrics === 'string'
      ? JSON.parse(exercise.default_metrics || '[]')
      : []

  const metricSet = new Set(metrics)

  return {
    id: exercise.id,
    name: exercise.name,
    category: exercise.category || 'General',
    trackingType: exercise.tracking_type === 'duration_based' ? 'duration' : 'rep',
    equipment: typeof exercise.equipment === 'string'
      ? exercise.equipment.split(',').map((item) => item.trim()).filter(Boolean)
      : Array.isArray(exercise.equipment)
        ? exercise.equipment
        : [],
    metrics: {
      sets: metricSet.has('sets'),
      reps: metricSet.has('reps'),
      weight: metricSet.has('weight_kg') || metricSet.has('weight'),
      duration: metricSet.has('duration_mmss') || metricSet.has('duration'),
      distance: metricSet.has('distance_km') || metricSet.has('distance'),
      speed: metricSet.has('speed'),
      incline: metricSet.has('incline'),
      pace: metricSet.has('pace'),
      calories: metricSet.has('calories'),
    },
  }
}
