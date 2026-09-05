import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Dumbbell,
  HeartPulse,
  LogOut,
  Menu,
  NotebookPen,
  Pencil,
  Play,
  Plus,
  Save,
  Settings,
  Sparkles,
  TimerReset,
  Trash2,
  Trophy,
  X,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'
import exercisesSeed from './exercisesSeed'
import { fromCloudProfile, isSupabaseConfigured, normalizeSupabaseExercise, supabase, toCloudProfile } from './supabaseClient'

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback
  } catch {
    return fallback
  }
}

const formatDateTime = (date = new Date()) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(date)

const formatDayKey = (dateInput) => {
  const date = new Date(dateInput)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateLabel = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const formatDuration = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

const durationToInput = (durationMs = 0) => {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`
}

const inputToDurationMs = (value) => {
  const parts = String(value || '0:00').split(':').map(Number)
  if (parts.some(Number.isNaN)) return 0
  if (parts.length === 1) return Math.max(0, parts[0]) * 60000
  return Math.max(0, parts[0]) * 60000 + Math.max(0, parts[1]) * 1000
}

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000)

// Rough estimate so routine mini-cards can show a "~N min" pill without a full session.
const estimateRoutineMinutes = (routine) => Math.max(5, Math.round((routine.exercises || [])
  .reduce((total, exercise) => total + (Math.max(1, Number(exercise.sets) || 3) * 1.5), 0)))

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  if (!file) { resolve(null); return }
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

const formatPace = (minutesPerKm) => {
  if (!Number.isFinite(minutesPerKm) || minutesPerKm <= 0) return '0:00'
  const minutes = Math.floor(minutesPerKm)
  const seconds = Math.round((minutesPerKm - minutes) * 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const todayValue = (date = new Date()) => {
  const value = new Date(date)
  const pad = (part) => String(part).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

const normalizeNoteDate = (note) => {
  if (!note || !note.date) return `${todayValue()}T09:00:00`
  const value = new Date(note.date)
  if (Number.isNaN(value.getTime())) return `${todayValue()}T09:00:00`
  return toLocalDateTimeValue(value)
}

const toLocalDateTimeValue = (date) => {
  const next = new Date(date)
  const pad = (part) => String(part).padStart(2, '0')
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}:${pad(next.getSeconds())}`
}

const getDefaultExerciseMetrics = (trackingType = 'rep') => ({
  sets: trackingType === 'rep',
  reps: trackingType === 'rep',
  weight: trackingType === 'rep',
  duration: trackingType === 'duration',
  distance: trackingType === 'duration',
  speed: trackingType === 'duration',
  incline: false,
  pace: false,
  calories: false,
})

const getStageLabel = (startDate, endDate) => {
  const hours = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 3600000
  if (hours < 4) return 'FED'
  if (hours < 12) return 'Early Fasting'
  if (hours < 18) return 'Fat Burning'
  if (hours < 24) return 'Ketosis'
  return 'Autophagy'
}

const seedNotes = [
  {
    id: 1,
    title: 'Today I am grateful for',
    text: 'My steady energy, supportive routines, and the chance to keep building a stronger body and calmer mind.',
    date: todayValue(new Date(Date.now() - 86400000 * 2)),
  },
  {
    id: 2,
    title: 'Tiny wins',
    text: 'I showed up, stayed consistent, and listened to my body instead of pushing too hard.',
    date: todayValue(new Date(Date.now() - 86400000)),
  },
]

const seedRoutines = [
  {
    id: 1,
    name: 'Morning reset',
    exercises: [
      { id: 1, name: 'Mobility flow', sets: 2, reps: 10, weight: 'Bodyweight' },
      { id: 2, name: 'Goblet squat', sets: 3, reps: 12, weight: '18 kg' },
      { id: 3, name: 'Incline push-up', sets: 3, reps: 8, weight: 'Bodyweight' },
    ],
  },
  {
    id: 2,
    name: 'Lower body power',
    exercises: [
      { id: 1, name: 'Romanian deadlift', sets: 4, reps: 8, weight: '40 kg' },
      { id: 2, name: 'Walking lunges', sets: 3, reps: 12, weight: 'Bodyweight' },
      { id: 3, name: 'Calf raises', sets: 4, reps: 15, weight: '25 kg' },
    ],
  },
]

const seedExerciseLibrary = [
  {
    id: 1,
    name: 'Bench press',
    category: 'Chest',
    trackingType: 'rep',
    equipment: ['Barbell', 'Bench'],
    metrics: getDefaultExerciseMetrics('rep'),
  },
  {
    id: 2,
    name: 'Rowing',
    category: 'Cardio',
    trackingType: 'duration',
    equipment: ['Rowing machine'],
    metrics: getDefaultExerciseMetrics('duration'),
  },
  {
    id: 3,
    name: 'Goblet squat',
    category: 'Legs',
    trackingType: 'rep',
    equipment: ['Dumbbell'],
    metrics: getDefaultExerciseMetrics('rep'),
  },
]

const seedHabits = [
  {
    id: 1,
    name: 'Morning walk',
    category: 'Movement',
    measurementMode: 'minutes',
    target: 20,
    unit: 'minutes',
    icon: '🚶',
    restDay: false,
    logs: [
      { id: 1, date: formatDayKey(new Date(Date.now() - 86400000 * 3)), done: true, value: 20 },
      { id: 2, date: formatDayKey(new Date(Date.now() - 86400000 * 2)), done: true, value: 18 },
      { id: 3, date: formatDayKey(new Date(Date.now() - 86400000)), done: false, value: 0 },
    ],
  },
  {
    id: 2,
    name: 'Hydration check',
    category: 'Nutrition',
    measurementMode: 'binary',
    target: '',
    unit: 'count',
    icon: '💧',
    restDay: true,
    logs: [
      { id: 4, date: formatDayKey(new Date(Date.now() - 86400000 * 4)), done: true, value: 1 },
      { id: 5, date: formatDayKey(new Date(Date.now() - 86400000 * 2)), done: true, value: 1 },
    ],
  },
]

const seedFastingSessions = [
  {
    id: 1,
    start: new Date(Date.now() - 86400000 * 2).toISOString(),
    end: new Date(Date.now() - 86400000 * 2 + 14 * 3600000).toISOString(),
    completedHours: 14,
    type: 'standard',
    hours: 14,
  },
  {
    id: 2,
    start: new Date(Date.now() - 86400000 * 6).toISOString(),
    end: new Date(Date.now() - 86400000 * 6 + 18 * 3600000).toISOString(),
    completedHours: 18,
    type: 'standard',
    hours: 18,
  },
]

const seedLogs = [
  { id: 1, type: 'Workout', icon: '🏋️', title: 'Lower body power', date: new Date(Date.now() - 86400000 * 3).toISOString(), summary: '4 exercises • 35 min • 420 kcal' },
  { id: 2, type: 'Habit', icon: '✅', title: 'Morning walk', date: new Date(Date.now() - 86400000 * 2).toISOString(), summary: 'Completed • 20 minutes' },
  { id: 3, type: 'Fasting', icon: '⏱️', title: 'Fasting session', date: new Date(Date.now() - 86400000).toISOString(), summary: '14.0 hours • Ketosis' },
]

const defaultMetricColors = [
  { name: 'Neon Cyan', value: '#00F0FF' },
  { name: 'Hot Magenta', value: '#FF0055' },
  { name: 'Neon Emerald', value: '#10B981' },
  { name: 'Solar Amber', value: '#FFB800' },
  { name: 'Electric Blue', value: '#2563EB' },
  { name: 'Lime', value: '#00FF66' },
  { name: 'Neon Violet', value: '#8B5CF6' },
  { name: 'Rose Coral', value: '#F43F5E' },
  { name: 'Electric Emerald', value: '#10B981' },
  { name: 'Amber Flame', value: '#F59E0B' },
  { name: 'Cyan Ice', value: '#06B6D4' },
  { name: 'Hyper Lime', value: '#84CC16' },
  { name: 'Indigo Surge', value: '#6366F1' },
]

const seedHealthMetrics = [
  {
    id: 'protein-intake',
    name: 'Protein Intake',
    category: 'General Wellbeing',
    measurementType: 'numeric',
    unit: 'g',
    target: 120,
    color: '#00F0FF',
    entries: [
      { id: 'p1', date: formatDayKey(new Date(Date.now() - 86400000 * 9)), value: 98 },
      { id: 'p2', date: formatDayKey(new Date(Date.now() - 86400000 * 8)), value: 104 },
      { id: 'p3', date: formatDayKey(new Date(Date.now() - 86400000 * 7)), value: 116 },
      { id: 'p4', date: formatDayKey(new Date(Date.now() - 86400000 * 6)), value: 120 },
      { id: 'p5', date: formatDayKey(new Date(Date.now() - 86400000 * 5)), value: 110 },
      { id: 'p6', date: formatDayKey(new Date(Date.now() - 86400000 * 2)), value: 118 },
      { id: 'p7', date: formatDayKey(new Date(Date.now() - 86400000)), value: 126 },
    ],
  },
  {
    id: 'resting-heart-rate',
    name: 'Resting Heart Rate',
    category: 'Heart',
    measurementType: 'numeric',
    unit: 'bpm',
    target: 65,
    color: '#FF0055',
    entries: [
      { id: 'h1', date: formatDayKey(new Date(Date.now() - 86400000 * 8)), value: 68 },
      { id: 'h2', date: formatDayKey(new Date(Date.now() - 86400000 * 7)), value: 66 },
      { id: 'h3', date: formatDayKey(new Date(Date.now() - 86400000 * 5)), value: 63 },
      { id: 'h4', date: formatDayKey(new Date(Date.now() - 86400000 * 4)), value: 64 },
      { id: 'h5', date: formatDayKey(new Date(Date.now() - 86400000 * 3)), value: 61 },
      { id: 'h6', date: formatDayKey(new Date(Date.now() - 86400000 * 2)), value: 60 },
      { id: 'h7', date: formatDayKey(new Date(Date.now() - 86400000)), value: 58 },
    ],
  },
  {
    id: 'meditation',
    name: 'Meditation',
    category: 'Mood',
    measurementType: 'boolean',
    unit: 'done',
    target: 1,
    color: '#10B981',
    entries: [
      { id: 'm1', date: formatDayKey(new Date(Date.now() - 86400000 * 9)), value: true },
      { id: 'm2', date: formatDayKey(new Date(Date.now() - 86400000 * 8)), value: false },
      { id: 'm3', date: formatDayKey(new Date(Date.now() - 86400000 * 6)), value: true },
      { id: 'm4', date: formatDayKey(new Date(Date.now() - 86400000 * 5)), value: true },
      { id: 'm5', date: formatDayKey(new Date(Date.now() - 86400000 * 3)), value: true },
      { id: 'm6', date: formatDayKey(new Date(Date.now() - 86400000 * 2)), value: false },
      { id: 'm7', date: formatDayKey(new Date(Date.now() - 86400000)), value: true },
    ],
  },
]

// Maps legacy single `theme` field (light/dark/ocean/forest/sunset) onto the
// current Forest Calm / Ocean Breeze families, each with a light/dark mode.
const resolveTheme = (user) => {
  if (user?.themeFamily && user?.themeMode) return { family: user.themeFamily, mode: user.themeMode }
  const legacy = user?.theme || 'ocean'
  const legacyMap = {
    dark: { family: 'ocean', mode: 'dark' },
    light: { family: 'ocean', mode: 'light' },
    ocean: { family: 'ocean', mode: 'light' },
    forest: { family: 'forest', mode: 'dark' },
    sunset: { family: 'forest', mode: 'light' },
  }
  return legacyMap[legacy] || { family: 'ocean', mode: 'dark' }
}

const seedUser = (email, name = 'Alex Smith', guest = false) => ({
  id: email,
  email,
  name,
  password: 'fitlife',
  guest,
  height: 172,
  units: 'kg',
  theme: 'dark',
  themeFamily: 'ocean',
  themeMode: 'dark',
  avatarUrl: '',
  hiddenMetricIds: [],
  notes: seedNotes,
  routines: seedRoutines,
  exerciseLibrary: exercisesSeed,
  exercises: exercisesSeed,
  habits: seedHabits,
  fastingSessions: seedFastingSessions,
  workoutSessions: [],
  activeWorkout: null,
  healthMetrics: seedHealthMetrics,
  logs: seedLogs,
  exerciseEmoji: '🏋️',
})

const initialUsers = read('fitlife-users', null) || {
  'alex@fitlife.app': { ...seedUser('alex@fitlife.app'), exerciseLibrary: [...exercisesSeed], exercises: [...exercisesSeed] },
}
const nav = [['Snapshot', CircleGauge], ['My Life', NotebookPen], ['Health Metrics', Activity], ['Exercises', Dumbbell], ['Sports', Trophy], ['Habits', Activity], ['Fasting', TimerReset], ['Log History', NotebookPen], ['Grateful', NotebookPen], ['Settings', Settings]]

function App() {
  const [users, setUsers] = useState(initialUsers)
  const [session, setSession] = useState(() => isSupabaseConfigured ? null : read('fitlife-session', null))
  const [cloudReady, setCloudReady] = useState(!isSupabaseConfigured)
  const [syncState, setSyncState] = useState(isSupabaseConfigured ? 'connecting' : 'local')
  // Sync happens continuously in the background, but the label only refreshes every 10s so it doesn't flicker.
  const [displaySyncState, setDisplaySyncState] = useState(syncState)
  const lastSyncLabelUpdate = useRef(0)
  useEffect(() => {
    const minInterval = 10000
    const elapsed = Date.now() - lastSyncLabelUpdate.current
    if (elapsed >= minInterval) {
      lastSyncLabelUpdate.current = Date.now()
      setDisplaySyncState(syncState)
      return undefined
    }
    const timer = window.setTimeout(() => {
      lastSyncLabelUpdate.current = Date.now()
      setDisplaySyncState(syncState)
    }, minInterval - elapsed)
    return () => window.clearTimeout(timer)
  }, [syncState])
  const [authMode, setAuthMode] = useState('login')
  const [view, setView] = useState('Snapshot')
  const [mobileNav, setMobileNav] = useState(false)
  const [toast, setToast] = useState('')
  const [connectionError, setConnectionError] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [bulkModalOpen, setBulkModalOpen] = useState(false)

  const user = session ? users[session] : null

  // Lock body scroll whenever any modal/drawer overlay is present, so the
  // page behind a popout can't drift while the popout itself stays fixed.
  useEffect(() => {
    const overlaySelector = '.modal-backdrop, .drawer-backdrop'
    let locked = false
    let scrollY = 0

    const lock = () => {
      if (locked) return
      locked = true
      scrollY = window.scrollY
      const { style } = document.body
      style.position = 'fixed'
      style.top = `-${scrollY}px`
      style.left = '0'
      style.right = '0'
      style.width = '100%'
      style.overflow = 'hidden'
    }

    const unlock = () => {
      if (!locked) return
      locked = false
      const { style } = document.body
      style.position = ''
      style.top = ''
      style.left = ''
      style.right = ''
      style.width = ''
      style.overflow = ''
      window.scrollTo(0, scrollY)
    }

    const sync = () => {
      if (document.querySelector(overlaySelector)) lock()
      else unlock()
    }

    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      unlock()
    }
  }, [])

  useEffect(() => {
    if (!supabase) return undefined
    let active = true

    const hydrate = async (authUser) => {
      if (!authUser) {
        if (active) {
          setSession((currentSession) => currentSession === 'guest@fitlife.app' ? currentSession : null)
          setCloudReady(true)
          setSyncState('offline')
        }
        return
      }

      setCloudReady(false)
      setSyncState('syncing')
      setConnectionError('')
      const { data: row, error } = await supabase.from('fitlife_users').select('*').eq('id', authUser.id).maybeSingle()
      if (error) {
        if (active) {
          setSyncState('offline')
          setConnectionError(`Signed in, but your profile could not load: ${error.message}`)
        }
        return
      }

      const account = fromCloudProfile(
        row,
        seedUser(authUser.id, authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'FitLife member'),
      )
      if (!row) {
        const { error: insertError } = await supabase.from('fitlife_users').insert({
          id: authUser.id,
          email: authUser.email,
          data: toCloudProfile(account),
          version: 1,
        })
        if (insertError && active) {
          setConnectionError(`Signed in, but your profile could not be created: ${insertError.message}`)
        }
      }
      if (active) {
        setUsers((all) => ({ ...all, [authUser.id]: account }))
        setSession(authUser.id)
        setCloudReady(true)
        setSyncState('synced')
      }
    }

    supabase.auth.getSession().then(({ data }) => hydrate(data.session?.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => hydrate(nextSession?.user), 0)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !session || !cloudReady || !user || user.guest) return undefined
    const channel = supabase.channel(`fitlife-sync-${session}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fitlife_users', filter: `id=eq.${session}` }, (payload) => {
        if (new Date(payload.new.updated_at).getTime() > new Date(user.updatedAt || 0).getTime()) {
          setUsers((all) => ({ ...all, [session]: fromCloudProfile(payload.new, all[session]) }))
          setSyncState('synced')
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session, cloudReady, user?.updatedAt])

  useEffect(() => {
    localStorage.setItem('fitlife-users', JSON.stringify(users))
  }, [users])

  const lastSavedUser = useRef(null)
  useEffect(() => {
    if (!supabase || !session || !cloudReady || !user || user.guest || lastSavedUser.current === user) return undefined
    lastSavedUser.current = user
    const timer = window.setTimeout(async () => {
      setSyncState('syncing')
      const changedAt = new Date().toISOString()
      const { data: remote } = await supabase.from('fitlife_users').select('*').eq('id', session).maybeSingle()
      if (remote && new Date(remote.updated_at).getTime() > new Date(user.updatedAt || 0).getTime()) {
        setUsers((all) => ({ ...all, [session]: fromCloudProfile(remote, all[session]) }))
        setSyncState('synced')
        return
      }
      const { error } = await supabase.from('fitlife_users').upsert({
        id: session,
        email: user.email,
        data: toCloudProfile(user),
        updated_at: changedAt,
        version: (remote?.version || 0) + 1,
      })
      if (error) {
        setSyncState('offline')
      } else {
        setUsers((all) => ({ ...all, [session]: { ...all[session], updatedAt: changedAt } }))
        setSyncState('synced')
      }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [users, session, cloudReady])

  useEffect(() => {
    if (session) {
      localStorage.setItem('fitlife-session', JSON.stringify(session))
    } else {
      localStorage.removeItem('fitlife-session')
    }
  }, [session])

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = window.setTimeout(() => setToast(''), 2200)
      return () => window.clearTimeout(timer)
    }
  }, [toast])

  useEffect(() => {
    const { family, mode } = resolveTheme(user)
    document.documentElement.dataset.theme = family
    document.documentElement.dataset.mode = mode
  }, [user?.themeFamily, user?.themeMode, user?.theme])

  const updateUser = (patch) => {
    if (!user) return
    setUsers((all) => ({ ...all, [user.id]: { ...user, ...patch, updatedAt: new Date().toISOString() } }))
  }

  if (!user) {
    return (
      <Auth
        mode={authMode}
        setMode={setAuthMode}
        onAuth={(account) => {
          setUsers((all) => ({ ...all, [account.id]: account }))
          setSession(account.id)
        }}
          connectionError={connectionError}
          supabaseEnabled={isSupabaseConfigured}
      />
    )
  }

  const logout = () => {
    if (supabase) supabase.auth.signOut({ scope: 'local' })
    setSession(null)
    setView('Snapshot')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Activity size={20} />
          </div>
          <span>
            fit<span>life</span>
          </span>
        </div>

        <div className="profile-card">
          {user.avatarUrl ? (
            <img className="avatar avatar-image" src={user.avatarUrl} alt={user.name} />
          ) : (
            <div className="avatar">{user.name.split(' ').map((part) => part[0]).join('')}</div>
          )}
          <div>
            <strong>{user.name}</strong>
            <small>{user.guest ? 'Guest preview' : displaySyncState === 'synced' ? 'Synced across devices' : displaySyncState}</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav.map(([label, Icon]) => (
            <button
              key={label}
              className={view === label ? 'active' : ''}
              onClick={() => {
                setView(label)
                setMobileNav(false)
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button className="logout-button" onClick={logout}>
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMobileNav(!mobileNav)}>
            <Menu size={21} />
          </button>

          <div>
            <p className="eyebrow">{formatDateTime(currentTime).toUpperCase()}</p>
            <h1>{view === 'Snapshot' ? `Good morning, ${user.name.split(' ')[0]}` : view}</h1>
            <p className="subhead">Small steps today, stronger you tomorrow.</p>
          </div>

          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="primary-button" onClick={() => setBulkModalOpen(true)}>
              <NotebookPen size={16} />
              Log day
            </button>
            <button className="primary-button" onClick={() => setView('Grateful')}>
              <Sparkles size={16} />
              Gratitude note
            </button>
          </div>
        </header>

        {view === 'Snapshot' && <Snapshot user={user} updateUser={updateUser} setToast={setToast} setView={setView} />}
        {view === 'My Life' && <MyLifeView user={user} updateUser={updateUser} setToast={setToast} />}
        {view === 'Health Metrics' && <HealthMetricsView user={user} updateUser={updateUser} setToast={setToast} />}
        {view === 'Exercises' && <ExercisesView user={user} updateUser={updateUser} setToast={setToast} />}
        {view === 'Sports' && <SportsHubView user={user} updateUser={updateUser} setToast={setToast} />}
        {view === 'Habits' && <HabitView user={user} updateUser={updateUser} setToast={setToast} />}
        {view === 'Fasting' && <FastingView user={user} updateUser={updateUser} setToast={setToast} />}
        {view === 'Log History' && <LogHistoryView user={user} updateUser={updateUser} setToast={setToast} />}
        {view === 'Grateful' && <GratefulView user={user} updateUser={updateUser} setToast={setToast} />}
        {view === 'Settings' && <SettingsView user={user} updateUser={updateUser} setToast={setToast} onSignOutAll={() => supabase?.auth.signOut({ scope: 'global' })} />}
      </main>

      {toast && <div className="toast">{toast}</div>}

      {bulkModalOpen && (
        <BulkRecordModal user={user} updateUser={updateUser} setToast={setToast} onClose={() => setBulkModalOpen(false)} />
      )}
    </div>
  )
}

function Auth({ mode, setMode, onAuth, connectionError, supabaseEnabled }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const id = form.email.toLowerCase().trim()
    if (!id || !form.password) {
      setError('Enter an email and password.')
      return
    }

    if (supabaseEnabled && supabase) {
      setLoading(true)
      setError('')
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: id, password: form.password })
        : await supabase.auth.signUp({
            email: id,
            password: form.password,
            options: { data: { full_name: form.name.trim() || 'New Member' } },
          })
      setLoading(false)
      if (result.error) {
        setError(result.error.message)
      } else if (mode === 'register' && !result.data.session) {
        setError('Check your email to confirm your account, then log in.')
      }
      return
    }

    if (mode === 'login') {
      const account = read('fitlife-users', initialUsers)[id]
      if (!account || account.password !== form.password) {
        setError('No matching local account found.')
        return
      }
      onAuth(account)
      return
    }

    onAuth(seedUser(id, form.name || 'New Member'))
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand">
          <div className="brand-mark">
            <Activity size={20} />
          </div>
          <span>
            fit<span>life</span>
          </span>
        </div>

        <p className="eyebrow">YOUR HEALTH, IN ONE PLACE</p>
        <h1>{mode === 'login' ? 'Welcome back.' : 'Start your journey.'}</h1>
        <p className="subhead">Track the details that make you feel your best.</p>

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <label>
              Full name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Alex Smith" />
            </label>
          )}

          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" />
          </label>

          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="••••••••" />
          </label>

          {(error || connectionError) && <p className="error">{error || connectionError}</p>}

          <button className="primary-button auth-submit" type="submit">
            {loading ? 'Connecting...' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <button type="button" className="guest-button" onClick={() => onAuth(seedUser('guest@fitlife.app', 'Guest Preview', true))}>
          Preview as guest
        </button>

        <p className="auth-switch">
          {mode === 'login' ? 'New to FitLife?' : 'Already have an account?'}{' '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
            {mode === 'login' ? 'Register' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}

const getLastNDayKeys = (count, offsetDays = 0) => {
  const today = new Date()
  const days = []
  for (let index = 0; index < count; index += 1) {
    days.push(formatDayKey(new Date(today.getTime() - (index + offsetDays) * 86400000)))
  }
  return days
}

const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null)

function FocusForToday({ metrics, habits }) {
  const sleepMetric = metrics.find((metric) => /sleep/i.test(metric.name) || /sleep/i.test(metric.category || ''))

  const sleepInsight = (() => {
    if (!sleepMetric) {
      return {
        tone: 'neutral',
        title: 'Add a Sleep metric to unlock recovery insights',
        detail: 'Log nightly sleep hours or score as a custom metric so we can track your 7-day trend.',
        stat: '--',
        unit: '',
        barPercent: null,
      }
    }
    const entryByDay = new Map((sleepMetric.entries || []).map((entry) => [formatDayKey(entry.date), Number(entry.value) || 0]))
    const recentDays = getLastNDayKeys(7, 0)
    const priorDays = getLastNDayKeys(7, 7)
    const recentValues = recentDays.map((day) => entryByDay.get(day)).filter((value) => value !== undefined)
    const priorValues = priorDays.map((day) => entryByDay.get(day)).filter((value) => value !== undefined)
    const recentAvg = average(recentValues)
    const priorAvg = average(priorValues)
    const unit = sleepMetric.unit || ''
    // Reference scale for the mini bar — the metric's own target, or a sensible sleep-hours default.
    const scale = Number(sleepMetric.target) || 8

    if (recentAvg === null) {
      return {
        tone: 'neutral',
        title: `No ${sleepMetric.name.toLowerCase()} logged this week`,
        detail: 'Log a value for the last 7 days to see your recovery trend here.',
        stat: '--',
        unit,
        barPercent: null,
      }
    }

    const stat = recentAvg.toFixed(1)
    const barPercent = Math.max(4, Math.min(100, Math.round((recentAvg / scale) * 100)))

    if (priorAvg === null || priorAvg === 0) {
      return {
        tone: 'good',
        title: `${sleepMetric.name} averaging ${stat} ${unit}`.trim(),
        detail: 'Keep logging daily so we can compare week-over-week trends.',
        stat,
        unit,
        barPercent,
      }
    }

    const pctChange = Math.round(((recentAvg - priorAvg) / priorAvg) * 100)
    if (pctChange <= -10) {
      return {
        tone: 'alert',
        title: `Sleep score dropped ${Math.abs(pctChange)}% this week`,
        detail: 'Prioritize recovery today — earlier bedtime, hydration, and a lighter training load.',
        stat,
        unit,
        barPercent,
      }
    }
    if (pctChange >= 10) {
      return {
        tone: 'good',
        title: `Sleep score improved ${pctChange}% this week`,
        detail: 'Recovery is trending up — a great day to push intensity if you feel ready.',
        stat,
        unit,
        barPercent,
      }
    }
    return {
      tone: 'neutral',
      title: `Sleep score steady at ${stat} ${unit}`.trim(),
      detail: 'No major shift this week — maintain your current recovery routine.',
      stat,
      unit,
      barPercent,
    }
  })()

  const habitInsight = (() => {
    if (!habits.length) {
      return {
        tone: 'neutral',
        title: 'No habits set up yet',
        detail: 'Add a habit to start tracking your daily completion rate.',
        rate: 0,
        delta: null,
      }
    }
    const todayKey = todayValue()
    const activeToday = habits.filter((habit) => !(habit.restDay && new Date().getDay() === 0))
    const doneToday = activeToday.filter((habit) => (habit.logs || []).some((entry) => entry.date === todayKey && entry.done)).length
    const todayRate = activeToday.length ? Math.round((doneToday / activeToday.length) * 100) : 0

    const historicalDays = getLastNDayKeys(30, 1)
    const historicalRates = historicalDays.map((day) => {
      const dayActive = habits.filter((habit) => !(habit.restDay && new Date(day).getDay() === 0))
      if (!dayActive.length) return null
      const dayDone = dayActive.filter((habit) => (habit.logs || []).some((entry) => entry.date === day && entry.done)).length
      return (dayDone / dayActive.length) * 100
    }).filter((value) => value !== null)
    const historicalAvg = average(historicalRates)

    if (historicalAvg === null) {
      return {
        tone: 'neutral',
        title: `${doneToday}/${activeToday.length} habits completed today (${todayRate}%)`,
        detail: 'Keep logging daily to build a historical average for comparison.',
        rate: todayRate,
        delta: null,
      }
    }

    const delta = Math.round(todayRate - historicalAvg)
    if (delta <= -15) {
      return {
        tone: 'alert',
        title: `Habit completion is ${Math.abs(delta)}% below your average today`,
        detail: `You're at ${todayRate}% vs a ${Math.round(historicalAvg)}% 30-day average — knock out one more habit to catch up.`,
        rate: todayRate,
        delta,
      }
    }
    if (delta >= 15) {
      return {
        tone: 'good',
        title: `Habit completion is ${delta}% above your average today`,
        detail: `${todayRate}% completed vs your usual ${Math.round(historicalAvg)}% — great consistency.`,
        rate: todayRate,
        delta,
      }
    }
    return {
      tone: 'neutral',
      title: `${doneToday}/${activeToday.length} habits completed today (${todayRate}%)`,
      detail: `In line with your ${Math.round(historicalAvg)}% 30-day average.`,
      rate: todayRate,
      delta,
    }
  })()

  return (
    <section className="focus-today-panel">
      <div className="focus-today-heading">
        <h2>Focus for today</h2>
        <p>Recommendations pulled from your logged history.</p>
      </div>
      <div className="focus-today-grid">
        <article className={`focus-today-card tone-${sleepInsight.tone}`}>
          <span className="focus-today-label">Sleep quality</span>
          <div className="focus-stat-row">
            <strong className="focus-stat-number">
              {sleepInsight.stat}
              {sleepInsight.stat !== '--' && sleepInsight.unit && <small className="focus-stat-unit"> {sleepInsight.unit}</small>}
            </strong>
            {sleepInsight.barPercent !== null && (
              <div className="focus-mini-bar-track" aria-hidden="true">
                <div className={`focus-mini-bar-fill tone-${sleepInsight.tone}`} style={{ width: `${sleepInsight.barPercent}%` }} />
              </div>
            )}
          </div>
          <p className="focus-stat-caption">{sleepInsight.title}</p>
          <p>{sleepInsight.detail}</p>
        </article>
        <article className={`focus-today-card tone-${habitInsight.tone}`}>
          <span className="focus-today-label">Habit completion</span>
          <div className="focus-stat-row">
            <ProgressRing percent={habitInsight.rate} tone={habitInsight.tone} />
            {habitInsight.delta !== null && (
              <span className={`focus-delta-badge tone-${habitInsight.tone}`}>
                {habitInsight.delta >= 0 ? '+' : ''}{habitInsight.delta}% vs usual
              </span>
            )}
          </div>
          <p className="focus-stat-caption">{habitInsight.title}</p>
          <p>{habitInsight.detail}</p>
        </article>
      </div>
    </section>
  )
}

function ProgressRing({ percent, tone = 'neutral', size = 64, strokeWidth = 7 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, percent))
  const offset = circumference * (1 - clamped / 100)
  const toneColor = tone === 'alert' ? 'var(--accent-crimson)' : tone === 'good' ? 'var(--accent-primary)' : 'var(--accent-yellow)'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="focus-ring" role="img" aria-label={`${Math.round(clamped)}% completed`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--line)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={toneColor}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="focus-ring-text">{Math.round(clamped)}%</text>
    </svg>
  )
}

function BulkRecordModal({ user, updateUser, setToast, onClose }) {
  const allMetrics = user.healthMetrics?.length ? user.healthMetrics : seedHealthMetrics
  const hiddenMetricIds = user.hiddenMetricIds || []
  const metrics = allMetrics.filter((metric) => !hiddenMetricIds.includes(metric.id))
  const habits = user.habits || []
  const [dateKey, setDateKey] = useState(todayValue())
  const [metricValues, setMetricValues] = useState({})
  const [habitValues, setHabitValues] = useState({})

  const setMetricValue = (metricId, value) => setMetricValues((current) => ({ ...current, [metricId]: value }))
  const setHabitValue = (habitId, value) => setHabitValues((current) => ({ ...current, [habitId]: value }))

  const handleSave = () => {
    let touched = 0

    const nextMetrics = allMetrics.map((metric) => {
      const raw = metricValues[metric.id]
      if (raw === undefined || raw === '' || raw === false) return metric
      touched += 1
      const value = metric.measurementType === 'boolean' ? true : Number(raw)
      const entries = (metric.entries || []).filter((entry) => formatDayKey(entry.date) !== dateKey)
      return { ...metric, entries: [...entries, { id: uid(), date: dateKey, value }] }
    })

    const nextHabits = habits.map((habit) => {
      const raw = habitValues[habit.id]
      if (raw === undefined || raw === '' || raw === false) return habit
      touched += 1
      const trackingType = habit.trackingType || (habit.measurementMode === 'binary' ? 'boolean' : 'numeric')
      const value = trackingType === 'boolean' ? true : raw
      const target = Number(habit.targetValue ?? habit.target) || 1
      const done = trackingType === 'boolean' || trackingType === 'time' ? true : Number(value) >= target
      const logs = (habit.logs || []).filter((entry) => entry.date !== dateKey)
      return { ...habit, logs: [...logs, { id: uid(), date: dateKey, done, value }] }
    })

    if (!touched) {
      setToast('Add at least one value before saving.')
      return
    }

    updateUser({ healthMetrics: nextMetrics, habits: nextHabits })
    setToast(`Logged ${touched} ${touched === 1 ? 'entry' : 'entries'} for ${dateKey}`)
    onClose()
  }

  return (
    <div className="modal-backdrop metric-modal-backdrop" onClick={onClose}>
      <div className="metric-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="metric-modal-header">
          <div>
            <p className="eyebrow">BULK RECORD</p>
            <h3>Log your day</h3>
          </div>
          <button className="icon-button subtle" onClick={onClose} aria-label="Close bulk record form">
            <X size={15} />
          </button>
        </div>

        <label className="field-label">
          Date
          <input type="date" value={dateKey} max={todayValue()} onChange={(event) => setDateKey(event.target.value)} />
        </label>

        <div className="metric-form-grid">
          {metrics.map((metric) => (
            <label key={metric.id} className="field-label">
              {metric.name} {metric.unit ? `(${metric.unit})` : ''}
              {metric.measurementType === 'boolean' ? (
                <div className="checkbox-row">
                  <input type="checkbox" checked={!!metricValues[metric.id]} onChange={(event) => setMetricValue(metric.id, event.target.checked)} />
                  <span>Mark completed</span>
                </div>
              ) : (
                <input
                  type="number"
                  value={metricValues[metric.id] ?? ''}
                  placeholder={metric.measurementType === 'scale' ? '0-10' : metric.target ? `Target ${metric.target}` : 'Value'}
                  onChange={(event) => setMetricValue(metric.id, event.target.value)}
                />
              )}
            </label>
          ))}

          {habits.map((habit) => {
            const trackingType = habit.trackingType || (habit.measurementMode === 'binary' ? 'boolean' : 'numeric')
            return (
              <label key={habit.id} className="field-label">
                {habit.icon} {habit.name} {habit.unit && trackingType !== 'boolean' ? `(${habit.unit})` : ''}
                {trackingType === 'boolean' ? (
                  <div className="checkbox-row">
                    <input type="checkbox" checked={!!habitValues[habit.id]} onChange={(event) => setHabitValue(habit.id, event.target.checked)} />
                    <span>Mark done</span>
                  </div>
                ) : (
                  <input
                    type={trackingType === 'time' ? 'time' : 'number'}
                    value={habitValues[habit.id] ?? ''}
                    placeholder={habit.target ? `Target ${habit.target}` : 'Value'}
                    onChange={(event) => setHabitValue(habit.id, event.target.value)}
                  />
                )}
              </label>
            )
          })}
        </div>

        <div className="routine-actions-row">
          <button className="secondary-button" onClick={onClose}>
            <X size={15} />
            Cancel
          </button>
          <button className="primary-button" onClick={handleSave}>
            <Save size={15} />
            Save all entries
          </button>
        </div>
      </div>
    </div>
  )
}

const INSIGHT_GROUPS = ['Physical & Recovery', 'Nutrition & Hydration', 'Mindfulness & Habits']

const classifyMetric = (metric) => {
  const text = `${metric.category || ''} ${metric.name || ''}`.toLowerCase()
  if (/protein|water|hydrat|calorie|nutrition|meal|diet/.test(text)) return 'Nutrition & Hydration'
  if (/meditat|mood|habit|focus|mindful|gratitude/.test(text)) return 'Mindfulness & Habits'
  return 'Physical & Recovery'
}

// Merges each metric's recent entries into one date-aligned series, normalized
// to % of target so wildly different units (bpm, g, hours) can share one chart.
const buildInsightSeries = (groupMetrics, days = 14) => {
  const today = new Date()
  const series = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * 86400000)
    const key = formatDayKey(date)
    const point = { date: formatDateLabel(key) }
    groupMetrics.forEach((metric) => {
      const entry = (metric.entries || []).find((item) => formatDayKey(item.date) === key)
      if (!entry) {
        point[metric.id] = null
        return
      }
      const target = Number(metric.target || 0)
      if (metric.measurementType === 'boolean') {
        point[metric.id] = entry.value ? 100 : 0
      } else if (target > 0) {
        point[metric.id] = Math.round((Number(entry.value || 0) / target) * 100)
      } else {
        point[metric.id] = Number(entry.value || 0)
      }
    })
    series.push(point)
  }
  return series
}

const buildHabitCompletionSeries = (habits, days = 14) => {
  const today = new Date()
  const series = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * 86400000)
    const key = formatDayKey(date)
    const eligible = habits.filter((habit) => !(habit.restDay && date.getDay() === 0))
    const done = eligible.filter((habit) => (habit.logs || []).some((log) => log.date === key && log.done))
    series.push({ date: formatDateLabel(key), completion: eligible.length ? Math.round((done.length / eligible.length) * 100) : null })
  }
  return series
}

function CategoryInsightsPanel({ metrics, habits }) {
  const groups = INSIGHT_GROUPS.map((group) => ({
    name: group,
    metrics: metrics.filter((metric) => classifyMetric(metric) === group),
  }))
  const habitSeries = buildHabitCompletionSeries(habits || [])
  const hasAnyData = groups.some((group) => group.metrics.length) || (habits || []).length

  if (!hasAnyData) return null

  return (
    <section className="insights-panel">
      <div className="overview-head">
        <div>
          <h2>Classified infographics</h2>
          <p>Trends grouped by category over the last 14 days.</p>
        </div>
      </div>
      <div className="insights-grid">
        {groups.map((group) => {
          if (group.name === 'Mindfulness & Habits' && !group.metrics.length) {
            if (!(habits || []).length) return null
            return (
              <article key={group.name} className="panel-card insights-card">
                <p className="eyebrow">{group.name.toUpperCase()}</p>
                <h3>Daily habit completion</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={habitSeries}>
                    <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" width={34} />
                    <Tooltip contentStyle={{ background: 'var(--panel-alt)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 }} />
                    <Line type="monotone" dataKey="completion" name="Habit completion" stroke="#10B981" strokeWidth={2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </article>
            )
          }
          if (!group.metrics.length) return null
          const series = buildInsightSeries(group.metrics)
          return (
            <article key={group.name} className="panel-card insights-card">
              <p className="eyebrow">{group.name.toUpperCase()}</p>
              <h3>{group.name}</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={series}>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} unit="%" width={34} />
                  <Tooltip contentStyle={{ background: 'var(--panel-alt)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {group.metrics.map((metric) => (
                    <Line key={metric.id} type="monotone" dataKey={metric.id} name={metric.name} stroke={metric.color || '#00F0FF'} strokeWidth={2} dot={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </article>
          )
        })}
      </div>
    </section>
  )
}

const getActivityDayScore = (user, dateInput, domain) => {
  const key = formatDayKey(dateInput)
  const metrics = user.healthMetrics || []
  const metricEntries = metrics.map((metric) => {
    const entry = (metric.entries || []).find((item) => formatDayKey(item.date) === key)
    if (!entry) return 0
    if (metric.measurementType === 'boolean') return entry.value ? 1 : 0
    const target = Number(metric.target || 0)
    return target > 0 ? Math.min(1, Number(entry.value || 0) / target) : Number(entry.value || 0) > 0 ? 0.5 : 0
  })
  const habitDone = (user.habits || []).filter((habit) => (habit.logs || []).some((log) => log.date === key && log.done)).length
  const notes = (user.notes || []).filter((note) => formatDayKey(normalizeNoteDate(note)) === key).length
  const workouts = (user.workoutSessions || []).filter((session) => formatDayKey(session.endedAt || session.startedAt) === key).length
  if (domain === 'health') {
    const healthMetrics = metrics.filter((metric) => /sleep|heart|water|hydrat|recovery|energy/i.test(`${metric.name} ${metric.category}`))
    return healthMetrics.length ? healthMetrics.reduce((total, metric) => total + (metricEntries[metrics.indexOf(metric)] || 0), 0) / healthMetrics.length : 0
  }
  if (domain === 'mindfulness') return Math.min(1, (habitDone + notes) / Math.max(1, (user.habits || []).length + 1))
  if (domain === 'sports') return workouts ? Math.min(1, workouts / 2) : 0
  return Math.min(1, metricEntries.reduce((total, value) => total + value, 0) / Math.max(1, metricEntries.length))
}

const recentDates = (count) => Array.from({ length: count }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() - (count - 1 - index))
  return date
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

// Simple streak helpers reused by the individual habit heatmap cards.
const getHabitStreak = (habit) => {
  const entries = new Set((habit.logs || []).filter((entry) => entry.done).map((entry) => entry.date))
  let streak = 0
  let cursor = new Date()
  while (entries.has(formatDayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// Longest historical run of consecutive completed days, scanning back a full year.
const getBestHabitStreak = (habit) => {
  const doneDates = new Set((habit.logs || []).filter((entry) => entry.done).map((entry) => entry.date))
  const cursor = new Date()
  cursor.setDate(cursor.getDate() - 365)
  let best = 0
  let current = 0
  for (let index = 0; index < 366; index += 1) {
    if (doneDates.has(formatDayKey(cursor))) {
      current += 1
      best = Math.max(best, current)
    } else {
      current = 0
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return best
}


const getCurrentMonthCompletion = (habit) => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const totalDays = monthEnd.getDate()
  const doneDays = (habit.logs || []).filter((entry) => {
    const date = new Date(entry.date)
    return date >= monthStart && date <= monthEnd && entry.done
  }).length
  return totalDays ? Math.round((doneDays / totalDays) * 100) : 0
}

const habitCategoryAccent = (habit) => {
  if (habit.accentColor) return habit.accentColor
  const text = `${habit.category || ''} ${habit.name || ''}`.toLowerCase()
  if (/mindful|meditat|gratitude|journal|read|sugar|mental|spirit/.test(text)) return '#00E5FF'
  if (/movement|physical|walk|run|hydrat|water|sleep/.test(text)) return '#00FF66'
  return 'var(--accent-primary)'
}

const mixHexColors = (hexA, hexB, ratio) => {
  const amount = clamp(ratio, 0, 1)
  const parse = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16))
  const [ar, ag, ab] = parse(hexA)
  const [br, bg, bb] = parse(hexB)
  const mix = (a, b) => Math.round(a + (b - a) * amount).toString(16).padStart(2, '0')
  return `#${mix(ar, br)}${mix(ag, bg)}${mix(ab, bb)}`
}

// Blends two hex colors together (0 = pure a, 1 = pure b).
const lerpHexColor = (hexA, hexB, ratio) => mixHexColors(hexA, hexB, ratio)

// Bilinear color interpolation across the 4 corners of the bivariate diamond.
const bivariateCellColor = (corners, rowFraction, colFraction) => {
  const topColor = lerpHexColor(corners.top.color, corners.right.color, colFraction)
  const bottomColor = lerpHexColor(corners.left.color, corners.bottom.color, colFraction)
  return lerpHexColor(topColor, bottomColor, rowFraction)
}

const nearestCorner = (corners, rowFraction, colFraction) => {
  if (rowFraction < 0.5) return colFraction < 0.5 ? corners.top : corners.right
  return colFraction < 0.5 ? corners.left : corners.bottom
}

const findLatestMetricEntry = (metrics, pattern) => {
  const candidates = metrics.filter((metric) => pattern.test(`${metric.name} ${metric.category}`))
  let best = null
  candidates.forEach((metric) => {
    const entries = (metric.entries || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date))
    if (entries[0] && (!best || new Date(entries[0].date) > new Date(best.entry.date))) best = { metric, entry: entries[0] }
  })
  return best
}

const normalizeMetricScore = (metric, entry, fallback = 55) => {
  if (!entry) return fallback
  if (metric.measurementType === 'boolean') return entry.value ? 100 : 20
  const target = Number(metric.target) || Number(entry.value) || 1
  return Math.min(100, Math.round((Number(entry.value) / target) * 100))
}

// Actual logged sleep score (0-100) for a specific day, or null when nothing was logged that day.
const getSleepScoreForDay = (user, dateInput) => {
  const key = formatDayKey(dateInput)
  const metrics = user.healthMetrics?.length ? user.healthMetrics : seedHealthMetrics
  const sleepMetrics = metrics.filter((metric) => /sleep/i.test(`${metric.name} ${metric.category}`))
  const scores = sleepMetrics
    .map((metric) => (metric.entries || []).find((entry) => formatDayKey(entry.date) === key) && normalizeMetricScore(metric, (metric.entries || []).find((entry) => formatDayKey(entry.date) === key)))
    .filter((value) => value !== null && value !== undefined)
  return scores.length ? Math.round(scores.reduce((total, value) => total + value, 0) / scores.length) : null
}

// Y-Axis Readiness = (Sleep Score + Energy Score) / 2, X-Axis Strain = Active / Target calories.
const computeHealthReadinessStrain = (user) => {
  const metrics = user.healthMetrics?.length ? user.healthMetrics : seedHealthMetrics
  const sleep = findLatestMetricEntry(metrics, /sleep/i)
  const energy = findLatestMetricEntry(metrics, /energy|mood|meditat/i)
  const sleepScore = sleep ? normalizeMetricScore(sleep.metric, sleep.entry, 60) : 60
  const energyScore = energy ? normalizeMetricScore(energy.metric, energy.entry, 55) : 55
  const readiness = Math.round((sleepScore + energyScore) / 2)

  const todayKey = todayValue()
  const todaySessions = (user.workoutSessions || []).filter((session) => formatDayKey(session.endedAt || session.startedAt) === todayKey)
  const activeCalories = todaySessions.reduce((total, session) => total + (Number(session.caloriesBurned) || Math.round((Number(session.durationMinutes) || 0) * 7)), 0)
  const targetCalories = Number(user.targetCalories) || 500
  const strain = Math.min(100, Math.round((activeCalories / targetCalories) * 100))

  return { readiness, strain, sleepScore, energyScore, activeCalories, targetCalories }
}

// Y-Axis Duration/Volume vs X-Axis RPE/Intensity, based on the last 7 days of workouts.
const computeSportsVolumeIntensity = (user) => {
  const recent = recentDates(7).map((date) => formatDayKey(date))
  const sessions = (user.workoutSessions || []).filter((session) => recent.includes(formatDayKey(session.endedAt || session.startedAt)))
  const totalDuration = sessions.reduce((total, session) => total + (Number(session.durationMinutes) || Math.round((session.durationMs || 0) / 60000)), 0)
  const volume = Math.min(100, Math.round((totalDuration / 180) * 100))
  const intensityScores = sessions.map((session) => {
    const durationMinutes = Number(session.durationMinutes) || Math.round((session.durationMs || 0) / 60000) || 1
    const distanceKm = Number(session.distanceKm) || 0
    if (distanceKm > 0) return Math.min(100, Math.round((distanceKm / (durationMinutes / 60)) * 10))
    return 50
  })
  const intensity = intensityScores.length ? Math.round(intensityScores.reduce((total, value) => total + value, 0) / intensityScores.length) : 35

  return { volume, intensity, totalDuration, sessionsCount: sessions.length }
}

// Y-Axis Habit Completion % vs X-Axis Sleep Quality / REM.
const computeHabitsSleepMatrix = (user) => {
  const habits = user.habits || []
  const days = recentDates(7).map((date) => formatDayKey(date))
  const eligibleLogs = habits.flatMap((habit) => days
    .map((key) => ({ habit, key }))
    .filter(({ habit: habitItem, key: entryKey }) => !(habitItem.restDay && new Date(`${entryKey}T00:00:00`).getDay() === 0)))
  const doneCount = eligibleLogs.filter(({ habit: habitItem, key: entryKey }) => (habitItem.logs || []).some((entry) => entry.date === entryKey && entry.done)).length
  const completion = eligibleLogs.length ? Math.round((doneCount / eligibleLogs.length) * 100) : 0

  const metrics = user.healthMetrics?.length ? user.healthMetrics : seedHealthMetrics
  const sleep = findLatestMetricEntry(metrics, /sleep|rem/i)
  const sleepScore = sleep ? normalizeMetricScore(sleep.metric, sleep.entry, 60) : 60

  return { completion, sleepScore }
}

// Latest sleep/energy-style score on or before a given day, for historical (non-"today") coordinate lookups.
const findMetricScoreOnOrBefore = (metrics, pattern, dateInput, fallback) => {
  const key = formatDayKey(dateInput)
  const candidates = metrics.filter((metric) => pattern.test(`${metric.name} ${metric.category}`))
  let best = null
  candidates.forEach((metric) => {
    const entries = (metric.entries || []).filter((entry) => formatDayKey(entry.date) <= key).sort((a, b) => new Date(b.date) - new Date(a.date))
    if (entries[0] && (!best || new Date(entries[0].date) > new Date(best.entry.date))) best = { metric, entry: entries[0] }
  })
  return best ? normalizeMetricScore(best.metric, best.entry, fallback) : fallback
}

// Historical Readiness × Strain coordinates for one specific day (mirrors computeHealthReadinessStrain).
const getHealthDayCoordinates = (user, dateInput) => {
  const metrics = user.healthMetrics?.length ? user.healthMetrics : seedHealthMetrics
  const sleepScore = findMetricScoreOnOrBefore(metrics, /sleep/i, dateInput, 60)
  const energyScore = findMetricScoreOnOrBefore(metrics, /energy|mood|meditat/i, dateInput, 55)
  const readiness = Math.round((sleepScore + energyScore) / 2)

  const key = formatDayKey(dateInput)
  const daySessions = (user.workoutSessions || []).filter((session) => formatDayKey(session.endedAt || session.startedAt) === key)
  const activeCalories = daySessions.reduce((total, session) => total + (Number(session.caloriesBurned) || Math.round((Number(session.durationMinutes) || 0) * 7)), 0)
  const targetCalories = Number(user.targetCalories) || 500
  const strain = Math.min(100, Math.round((activeCalories / targetCalories) * 100))
  return { x: strain, y: readiness }
}

// Historical Volume × Intensity coordinates for the 7-day window ending on a specific day.
const getSportsDayCoordinates = (user, dateInput) => {
  const windowKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(dateInput)
    date.setDate(date.getDate() - index)
    return formatDayKey(date)
  })
  const sessions = (user.workoutSessions || []).filter((session) => windowKeys.includes(formatDayKey(session.endedAt || session.startedAt)))
  const totalDuration = sessions.reduce((total, session) => total + (Number(session.durationMinutes) || Math.round((session.durationMs || 0) / 60000)), 0)
  const volume = Math.min(100, Math.round((totalDuration / 180) * 100))
  const intensityScores = sessions.map((session) => {
    const durationMinutes = Number(session.durationMinutes) || Math.round((session.durationMs || 0) / 60000) || 1
    const distanceKm = Number(session.distanceKm) || 0
    if (distanceKm > 0) return Math.min(100, Math.round((distanceKm / (durationMinutes / 60)) * 10))
    return 50
  })
  const intensity = intensityScores.length ? Math.round(intensityScores.reduce((total, value) => total + value, 0) / intensityScores.length) : 0
  return { x: intensity, y: volume }
}

// Historical Habit Completion % × Sleep Quality coordinates for the 7-day window ending on a specific day.
const getHabitsDayCoordinates = (user, dateInput) => {
  const habits = user.habits || []
  const windowKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(dateInput)
    date.setDate(date.getDate() - index)
    return formatDayKey(date)
  })
  const eligibleLogs = habits.flatMap((habit) => windowKeys
    .map((key) => ({ habit, key }))
    .filter(({ habit: habitItem, key: entryKey }) => !(habitItem.restDay && new Date(`${entryKey}T00:00:00`).getDay() === 0)))
  const doneCount = eligibleLogs.filter(({ habit: habitItem, key: entryKey }) => (habitItem.logs || []).some((entry) => entry.date === entryKey && entry.done)).length
  const completion = eligibleLogs.length ? Math.round((doneCount / eligibleLogs.length) * 100) : 0

  const metrics = user.healthMetrics?.length ? user.healthMetrics : seedHealthMetrics
  const sleepScore = findMetricScoreOnOrBefore(metrics, /sleep|rem/i, dateInput, 60)
  return { x: sleepScore, y: completion }
}

const getDomainDayCoordinates = (domain, user, dateInput) => {
  if (domain === 'health') return getHealthDayCoordinates(user, dateInput)
  if (domain === 'sports') return getSportsDayCoordinates(user, dateInput)
  return getHabitsDayCoordinates(user, dateInput)
}

function BivariateDiamond({ eyebrow, title, xLabel, yLabel, xValue, yValue, corners, exactLabel, gridSize = 3, xSeven, ySeven, xThirty, yThirty, hasData = true }) {
  const [activeKey, setActiveKey] = useState(null)
  const [visible, setVisible] = useState({ x: true, seven: true, thirty: true })
  const cells = []
  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const rowFraction = row / (gridSize - 1)
      const colFraction = col / (gridSize - 1)
      const color = bivariateCellColor(corners, rowFraction, colFraction)
      const corner = nearestCorner(corners, rowFraction, colFraction)
      cells.push({ row, col, color, corner, key: `${row}-${col}` })
    }
  }
  const activeCell = cells.find((cell) => cell.key === activeKey)
  const pointCorner = nearestCorner(corners, 1 - yValue / 100, xValue / 100)
  const displayCorner = activeCell?.corner || pointCorner
  const markerInfo = [
    { key: 'x', label: 'X', visible: visible.x, x: xValue, y: yValue, className: 'marker-x' },
    { key: 'seven', label: '7d', visible: visible.seven, x: xSeven ?? xValue, y: ySeven ?? yValue, className: 'marker-seven' },
    { key: 'thirty', label: '30d', visible: visible.thirty, x: xThirty ?? xValue, y: yThirty ?? yValue, className: 'marker-thirty' },
  ]

  return (
    <article className="panel-card bivariate-diamond-card">
      <div className="activity-heatmap-heading">
        <div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div>
        <span className="heatmap-legend-label">{exactLabel}</span>
      </div>
      {!hasData && (
        <p className="bivariate-sample-notice">No data logged yet for this matrix — showing an illustrative sample.</p>
      )}
      <div className="bivariate-diamond-body">
        <span className="bivariate-corner-label bivariate-corner-top" aria-hidden="true">{corners.top.label}</span>
        <span className="bivariate-corner-label bivariate-corner-left" aria-hidden="true">{corners.left.label}</span>
        <span className="bivariate-corner-label bivariate-corner-right" aria-hidden="true">{corners.right.label}</span>
        <span className="bivariate-corner-label bivariate-corner-bottom" aria-hidden="true">{corners.bottom.label}</span>
        <div className={`bivariate-diamond-wrap ${!hasData ? 'illustrative' : ''}`}>
          <div className="bivariate-diamond-grid" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gridTemplateRows: `repeat(${gridSize}, 1fr)` }}>
            {cells.map((cell) => (
              <button
                key={cell.key}
                type="button"
                className={`bivariate-cell ${activeKey === cell.key ? 'active' : ''}`}
                style={{ background: cell.color }}
                title={`${cell.corner.label}: ${cell.corner.advice}`}
                aria-label={`${cell.corner.label}: ${cell.corner.advice}`}
                onMouseEnter={() => setActiveKey(cell.key)}
                onFocus={() => setActiveKey(cell.key)}
                onClick={() => setActiveKey(cell.key)}
              />
            ))}
            {markerInfo.filter((item) => item.visible).map((item) => (
              <span
                key={item.key}
                className={`bivariate-marker ${item.className}`}
                style={{ left: `${item.x}%`, top: `${100 - item.y}%` }}
                title={`${item.label}: ${yLabel} ${Math.round(item.y)}% • ${xLabel} ${Math.round(item.x)}%`}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="bivariate-axis-caption"><span>{yLabel} ↕</span><span>{xLabel} ↔</span></div>
      <div className="bivariate-toggle-row">
        {['x', 'seven', 'thirty'].map((key) => {
          const labels = { x: 'X', seven: '7d', thirty: '30d' }
          const isVisible = visible[key]
          return (
            <button
              key={key}
              type="button"
              className={`bivariate-toggle-chip ${isVisible ? 'active' : ''}`}
              onClick={() => setVisible((current) => ({ ...current, [key]: !current[key] }))}
            >
              {labels[key]}
            </button>
          )
        })}
      </div>
      <div className="bivariate-info-panel">
        <span className="bivariate-active-badge" style={{ '--badge-color': displayCorner.color }}>
          <Sparkles size={12} /> {displayCorner.label}
        </span>
        <p>{displayCorner.advice}</p>
      </div>
    </article>
  )
}

// 30-day GitHub-style micro heatmap rendered beneath a bivariate diamond for the same domain.
// Each tile is colored from the domain's own quadrant palette using that day's real X/Y coordinates,
// so hovering or clicking a tile surfaces that specific day's score, quadrant tag, and color tier.
function DomainMiniHeatmap({ user, domain, corners, xLabel, yLabel, label }) {
  const [selectedKey, setSelectedKey] = useState(null)
  const tiles = recentDates(30).map((date) => {
    const { x, y } = getDomainDayCoordinates(domain, user, date)
    const rowFraction = clamp(1 - y / 100, 0, 1)
    const colFraction = clamp(x / 100, 0, 1)
    return {
      key: formatDayKey(date),
      date,
      x,
      y,
      color: bivariateCellColor(corners, rowFraction, colFraction),
      corner: nearestCorner(corners, rowFraction, colFraction),
    }
  })
  const selected = tiles.find((tile) => tile.key === selectedKey) || tiles[tiles.length - 1]

  return (
    <div className="mini-heatmap-card">
      <p className="eyebrow mini-heatmap-label">{label}</p>
      <div className="mini-heatmap-grid">
        {tiles.map((tile) => {
          const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(tile.date)
          return (
            <button
              key={tile.key}
              type="button"
              className={`mini-heatmap-tile ${selectedKey === tile.key ? 'active' : ''}`}
              style={{ background: tile.color }}
              onMouseEnter={() => setSelectedKey(tile.key)}
              onFocus={() => setSelectedKey(tile.key)}
              onClick={() => setSelectedKey(tile.key)}
              title={`${dateLabel}: ${yLabel} ${tile.y}% • ${xLabel} ${tile.x}% — ${tile.corner.label}`}
              aria-label={`${dateLabel}: ${tile.corner.label}`}
            />
          )
        })}
      </div>
      {selected && (
        <div className="mini-heatmap-info">
          <span className="bivariate-active-badge" style={{ '--badge-color': selected.corner.color }}>
            <Sparkles size={11} /> {selected.corner.label}
          </span>
          <small>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(selected.date)} • {yLabel} {selected.y}% • {xLabel} {selected.x}%</small>
        </div>
      )}
    </div>
  )
}

function SnapshotHeatmaps({ user }) {
  const health = computeHealthReadinessStrain(user)
  const sports = computeSportsVolumeIntensity(user)
  const habitsMatrix = computeHabitsSleepMatrix(user)

  const healthSeven = { readiness: clamp(health.readiness + 6, 0, 100), strain: clamp(health.strain + 10, 0, 100) }
  const healthThirty = { readiness: clamp(health.readiness - 8, 0, 100), strain: clamp(health.strain - 12, 0, 100) }
  const sportsSeven = { intensity: clamp(sports.intensity + 10, 0, 100), volume: clamp(sports.volume + 8, 0, 100) }
  const sportsThirty = { intensity: clamp(sports.intensity - 8, 0, 100), volume: clamp(sports.volume - 12, 0, 100) }
  const habitSeven = { sleepScore: clamp(habitsMatrix.sleepScore - 10, 0, 100), completion: clamp(habitsMatrix.completion + 8, 0, 100) }
  const habitThirty = { sleepScore: clamp(habitsMatrix.sleepScore + 8, 0, 100), completion: clamp(habitsMatrix.completion - 10, 0, 100) }

  // Only trust the live/7d/30d markers once the user has actually logged something for that domain.
  const healthHasData = (user.healthMetrics || []).some((metric) => (metric.entries || []).length > 0) || (user.workoutSessions || []).length > 0
  const sportsHasData = (user.workoutSessions || []).length > 0
  const habitsHasData = (user.habits || []).some((habit) => (habit.logs || []).length > 0)

  const healthCorners = {
    top: { label: 'Peak Prime / Recharged', color: '#D4A373', advice: 'Readiness is high and strain is low — a great day to push a hard session.' },
    right: { label: 'Heroic Effort / Overreach', color: '#028090', advice: 'You are pushing hard while still recovered. Keep an eye on fatigue creeping in.' },
    left: { label: 'Resting / Passive Recovery', color: '#FAEDCD', advice: 'Low readiness and low strain — an easy, restorative day.' },
    bottom: { label: 'High Stress / Systemic Burnout', color: '#00A896', advice: 'Readiness is low but strain is high. Prioritize sleep and active recovery today.' },
  }
  const sportsCorners = {
    top: { label: 'Aerobic Base / Zone 2', color: '#6B21A8', advice: 'High volume, low intensity — solid aerobic base-building work.' },
    right: { label: 'Peak Endurance Overhaul', color: '#D97706', advice: 'High volume and high intensity. Make sure recovery days follow.' },
    left: { label: 'Active Recovery / Walk', color: '#B45309', advice: 'Low volume and low intensity — a light, active recovery day.' },
    bottom: { label: 'HIIT / Anaerobic Burst', color: '#E9F5DB', advice: 'Short and intense. Great for anaerobic gains, watch your recovery time.' },
  }
  const habitsCorners = {
    top: { label: 'Running on Fumes', color: '#EA580C', advice: 'Habits are on track but rest is low. Protect your sleep to sustain this.' },
    right: { label: 'Unstoppable Flow State', color: '#3B82F6', advice: 'High rest and high consistency — this is your peak performance zone.' },
    left: { label: 'Disrupted Rhythm', color: '#F3F4F6', advice: 'Both rest and consistency are low. Consider resetting your routine.' },
    bottom: { label: 'Passive Reset Day', color: '#00E5FF', advice: 'Rest is strong but habits slipped. A gentle day to ease back in.' },
  }

  return (
    <section className="snapshot-heatmaps">
      <div className="overview-head"><div><h2>Activity at a glance</h2><p>Bivariate matrices plotting how your health, training, and habits intersect right now.</p></div></div>
      <div className="snapshot-heatmap-grid">
        <div className="snapshot-heatmap-cell">
        <BivariateDiamond
          eyebrow="HEALTH & RECOVERY"
          title="Readiness × Strain"
          xLabel="Training Load / Stress"
          yLabel="Physiological Readiness"
          xValue={health.strain}
          yValue={health.readiness}
          xSeven={healthSeven.strain}
          ySeven={healthSeven.readiness}
          xThirty={healthThirty.strain}
          yThirty={healthThirty.readiness}
          exactLabel={`Readiness ${health.readiness}% • Strain ${health.strain}%`}
          corners={healthCorners}
          hasData={healthHasData}
        />
        <DomainMiniHeatmap user={user} domain="health" corners={healthCorners} xLabel="Strain" yLabel="Readiness" label="30-DAY HEALTH TREND" />
        </div>
        <div className="snapshot-heatmap-cell">
        <BivariateDiamond
          eyebrow="SPORTS & WORKOUTS"
          title="Volume × Intensity"
          xLabel="RPE / Intensity"
          yLabel="Duration / Volume"
          xValue={sports.intensity}
          yValue={sports.volume}
          xSeven={sportsSeven.intensity}
          ySeven={sportsSeven.volume}
          xThirty={sportsThirty.intensity}
          yThirty={sportsThirty.volume}
          exactLabel={`Volume ${sports.volume}% • Intensity ${sports.intensity}%`}
          corners={sportsCorners}
          hasData={sportsHasData}
        />
        <DomainMiniHeatmap user={user} domain="sports" corners={sportsCorners} xLabel="Intensity" yLabel="Volume" label="30-DAY TRAINING TREND" />
        </div>
        <div className="snapshot-heatmap-cell">
        <BivariateDiamond
          eyebrow="HABITS & MINDFULNESS"
          title="Consistency × Rest"
          xLabel="Sleep Quality / REM"
          yLabel="Habit Completion %"
          xValue={habitsMatrix.sleepScore}
          yValue={habitsMatrix.completion}
          xSeven={habitSeven.sleepScore}
          ySeven={habitSeven.completion}
          xThirty={habitThirty.sleepScore}
          yThirty={habitThirty.completion}
          exactLabel={`Habits ${habitsMatrix.completion}% • Sleep ${habitsMatrix.sleepScore}%`}
          corners={habitsCorners}
          hasData={habitsHasData}
        />
        <DomainMiniHeatmap user={user} domain="mindfulness" corners={habitsCorners} xLabel="Sleep" yLabel="Completion" label="30-DAY HABITS TREND" />
        </div>
      </div>

    </section>
  )
}

function ExploreDataQuickNav({ setView }) {
  const links = [
    { label: 'Snapshots', icon: '📊', detail: 'Global heatmaps & bivariate overviews', view: 'Snapshot' },
    { label: 'Health Metrics', icon: '🩺', detail: 'Daily trackers & inputs', view: 'Health Metrics' },
    { label: 'Sports & Workouts', icon: '🏃', detail: 'Strava feed & activity logs', view: 'Sports' },
    { label: 'My Life', icon: '🗓️', detail: 'Master calendar & daily journal', view: 'My Life' },
  ]

  return (
    <section className="explore-data-nav">
      <div className="overview-head"><div><h2>Explore your data</h2><p>Jump straight to the view you need.</p></div></div>
      <div className="explore-data-chip-row">
        {links.map((link) => (
          <button key={link.view} type="button" className="explore-data-chip" onClick={() => setView(link.view)}>
            <span className="explore-data-chip-icon">{link.icon}</span>
            <span>
              <strong>{link.label}</strong>
              <small>{link.detail}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function HabitMiniHeatmapCard({ habit, updateUser, user, setToast }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const todayKey = todayValue()
  const now = new Date()
  const calendarStart = new Date(now)
  calendarStart.setDate(now.getDate() - now.getDay() - (7 * 11))

  const days = Array.from({ length: 84 }, (_, index) => {
    const date = new Date(calendarStart)
    date.setDate(calendarStart.getDate() + index)
    return { key: formatDayKey(date), date }
  })
  const monthLabels = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(calendarStart)
    date.setDate(calendarStart.getDate() + (index * 7))
    const previousDate = new Date(date)
    previousDate.setDate(date.getDate() - 7)
    return date.getMonth() !== previousDate.getMonth() || index === 0
      ? date.toLocaleDateString(undefined, { month: 'short' })
      : ''
  })

  const entries = new Map((habit.logs || []).map((entry) => [entry.date, entry]))
  const streak = getHabitStreak(habit)
  const monthCompletion = getCurrentMonthCompletion(habit)
  const isDoneToday = entries.get(todayKey)?.done
  const accent = habitCategoryAccent(habit)
  const selected = selectedDay ? { key: selectedDay, entry: entries.get(selectedDay) } : null

  const toggleToday = () => {
    const nextDone = !isDoneToday
    const nextLogs = (habit.logs || []).filter((entry) => entry.date !== todayKey)
    const updatedHabit = {
      ...habit,
      logs: [...nextLogs, { id: uid(), date: todayKey, done: nextDone, value: nextDone ? Number(habit.target) || 1 : 0 }],
    }
    updateUser({ habits: (user.habits || []).map((item) => item.id === habit.id ? updatedHabit : item) })
    setToast(nextDone ? 'Habit marked complete' : 'Habit marked incomplete')
  }

  const setHabitAccentColor = (color) => {
    updateUser({ habits: (user.habits || []).map((item) => item.id === habit.id ? { ...item, accentColor: color } : item) })
    setColorPickerOpen(false)
  }

  return (
    <article className="habit-mini-card panel-card">
      <div className="habit-mini-head">
        <div>
          <strong>{habit.icon} {habit.name}</strong>
          <small>{habit.category}</small>
        </div>
        <div className="habit-mini-actions">
          <span className="habit-streak-badge">🔥 {streak} day streak</span>
          <button
            type="button"
            className="habit-color-swatch-button"
            style={{ '--swatch-color': accent }}
            onClick={() => setColorPickerOpen((open) => !open)}
            aria-label="Change contribution color"
            title="Change contribution color"
          >
            <span className="habit-color-swatch-dot" />
          </button>
          <button type="button" className={`habit-quick-check ${isDoneToday ? 'done' : ''}`} onClick={toggleToday}>
            ✓
          </button>
        </div>
      </div>

      {colorPickerOpen && (
        <div className="color-grid habit-color-picker">
          {defaultMetricColors.map((color) => (
            <button
              key={color.value}
              type="button"
              className={`color-dot ${accent === color.value ? 'selected' : ''}`}
              style={{ background: color.value }}
              onClick={() => setHabitAccentColor(color.value)}
              aria-label={color.name}
            />
          ))}
        </div>
      )}

      <div className="habit-mini-calendar">
        <div className="habit-mini-months" aria-hidden="true">
          {monthLabels.map((label, index) => <span key={`month-${index}`}>{label}</span>)}
        </div>
        <div className="habit-mini-calendar-body">
          <div className="habit-mini-weekdays" aria-hidden="true">
            <span />
            <span>M</span><span />
            <span>W</span><span />
            <span>F</span><span />
          </div>
          <div className="habit-mini-grid" role="grid" aria-label={`${habit.name} contribution calendar`}>
            {days.map(({ key, date }) => {
          const entry = entries.get(key)
          const done = entry?.done
          const isFuture = key > todayKey
          const fill = !done ? '#1E293B' : accent
          return (
            <button
              key={key}
              type="button"
              disabled={isFuture}
              className={`habit-mini-tile ${done ? 'done' : ''} ${isFuture ? 'future-date' : ''}`}
              style={{ background: fill }}
              title={`${key}: ${done ? 'Completed' : 'Not completed'}`}
              onClick={() => setSelectedDay(key)}
            />
          )
            })}
          </div>
        </div>
      </div>

      <div className="habit-mini-footer">
        <span>Monthly completion: {monthCompletion}%</span>
      </div>

      {selected && (
        <div className="habit-popover habit-mini-popover">
          <strong>{formatDateLabel(selected.key)}</strong>
          <p>{selected.entry?.done ? 'Completed' : 'Not completed'}</p>
        </div>
      )}
    </article>
  )
}

function Snapshot({ user, updateUser, setToast, setView }) {
  const metrics = user.healthMetrics?.length ? user.healthMetrics : seedHealthMetrics
  const hiddenHabitIds = user.hiddenHabitIds || []
  const visibleHabits = (user.habits || []).filter((habit) => !hiddenHabitIds.includes(habit.id))

  return (
    <>
      <ExploreDataQuickNav setView={setView} />

      <FocusForToday metrics={metrics} habits={visibleHabits} />

      <CategoryInsightsPanel metrics={metrics} habits={visibleHabits} />

      <SnapshotHeatmaps user={user} />

      <section className="habit-mini-grid-wrap">
        <div className="overview-head">
          <div>
            <h2>Habit contributions</h2>
            <p>Each habit, tracked day by day.</p>
          </div>
        </div>
        <div className="habit-mini-grid-list">
          {visibleHabits.map((habit) => (
            <HabitMiniHeatmapCard key={habit.id} habit={habit} updateUser={updateUser} setToast={setToast} />
          ))}
        </div>
      </section>
    </>
  )
}

function HealthMetricsView({ user, updateUser, setToast }) {
  const defaultMetricCategories = ['Heart', 'Mobility', 'General Wellbeing', 'Sleep', 'Mood', 'Exercise Related', 'Overall Health', 'Uncategorized']
  const hiddenMetricIds = user.hiddenMetricIds || []
  const hiddenHabitIds = user.hiddenHabitIds || []
  const metrics = (user.healthMetrics?.length ? user.healthMetrics : seedHealthMetrics).filter((metric) => !hiddenMetricIds.includes(metric.id))
  const visibleHabits = (user.habits || []).filter((habit) => !hiddenHabitIds.includes(habit.id))
  const [metricModalOpen, setMetricModalOpen] = useState(false)
  const [chartWindow, setChartWindow] = useState(7)
  const [metricForm, setMetricForm] = useState({
    id: uid(),
    name: '',
    category: 'Heart',
    measurementType: 'numeric',
    unit: '',
    target: '',
    color: '#00F0FF',
    chartType: 'line',
    customCategory: '',
  })
  const [selectedMetricId, setSelectedMetricId] = useState(null)
  const [entryEditor, setEntryEditor] = useState(null)

  const closeMetricDetail = () => {
    setSelectedMetricId(null)
    setEntryEditor(null)
  }
  const closeMetricModal = () => {
    setMetricModalOpen(false)
    setSelectedMetricId(null)
  }
  const metricCategories = [...new Set([...defaultMetricCategories, ...metrics.map((metric) => metric.category).filter(Boolean)])]

  const resetMetricForm = () => {
    setMetricForm({
      id: uid(),
      name: '',
      category: 'Heart',
      measurementType: 'numeric',
      unit: '',
      target: '',
      color: '#00F0FF',
      chartType: 'line',
      customCategory: '',
    })
  }

  const mutateMetrics = (nextMetrics) => {
    updateUser({ healthMetrics: nextMetrics })
  }

  const getEntryValue = (metric, entry) => {
    if (!entry) return null
    if (metric.measurementType === 'boolean') return entry.value ? 'Completed' : 'Not done'
    if (metric.measurementType === 'scale') return `${Number(entry.value ?? 0)}/10`
    if (metric.measurementType === 'duration') return `${Number(entry.value ?? 0)} ${metric.unit || 'min'}`
    return `${Number(entry.value ?? 0)} ${metric.unit || ''}`.trim()
  }

  const getMetricLatestEntry = (metric) => {
    const entries = [...(metric.entries || [])].sort((a, b) => new Date(b.date) - new Date(a.date))
    return entries[0] || null
  }

  const getMetricStreak = (metric) => {
    const uniqueDays = [...new Set((metric.entries || []).map((entry) => formatDayKey(entry.date)))].sort()
    if (!uniqueDays.length) return 0
    let streak = 0
    const today = new Date()
    for (let offset = 0; offset < 90; offset += 1) {
      const day = formatDayKey(new Date(today.getTime() - offset * 86400000))
      const entry = (metric.entries || []).find((item) => formatDayKey(item.date) === day)
      const dayHasValue = metric.measurementType === 'boolean' ? !!entry?.value : !!entry && Number(entry.value) > 0
      if (dayHasValue) {
        streak += 1
      } else if (offset > 0) {
        break
      }
    }
    return streak
  }

  const getMetricProgress = (metric) => {
    const goalDetails = getMetricGoalDetails(metric, getMetricLatestEntry(metric))
    if (goalDetails) return goalDetails.progress
    const entry = getMetricLatestEntry(metric)
    if (!entry) return 0
    const raw = Number(entry.value)
    const target = Number(metric.target || 0)
    if (!Number.isFinite(raw) || !Number.isFinite(target) || target <= 0) return metric.measurementType === 'boolean' ? (entry.value ? 100 : 0) : 0
    if (metric.measurementType === 'boolean') return entry.value ? 100 : 0
    if (metric.measurementType === 'scale') return Math.min(100, Math.round((raw / 10) * 100))
    if (metric.measurementType === 'duration') return Math.min(100, Math.round((raw / target) * 100))
    return Math.min(100, Math.round((raw / target) * 100))
  }

  const getMetricGoalDetails = (metric, latestEntry) => {
    const current = metric.measurementType === 'boolean' ? (latestEntry?.value ? 1 : 0) : Number(latestEntry?.value)
    const target = metric.measurementType === 'boolean' ? 1 : Number(metric.target)
    if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return null
    const lowerIsBetter = /weight|body fat|resting heart/i.test(metric.name || '')
    const progress = lowerIsBetter ? Math.min(100, Math.round((target / Math.max(current, target)) * 100)) : Math.min(100, Math.round((current / target) * 100))
    const distance = Math.abs(target - current)
    return { current, target, progress, distance, lowerIsBetter }
  }

  const getMetricHeatmap = (metric) => {
    const today = new Date()
    // Align the grid to Monday so each column always lines up with the M/T/W/Th/F/S/S header.
    const daysSinceMonday = (today.getDay() + 6) % 7
    const gridStart = new Date(today)
    gridStart.setDate(today.getDate() - daysSinceMonday - 28)

    const days = []
    for (let index = 0; index < 35; index += 1) {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + index)
      const key = formatDayKey(date)
      const entry = (metric.entries || []).find((item) => formatDayKey(item.date) === key)
      const raw = Number(entry?.value ?? 0)
      const target = Number(metric.target || 0)
      let intensity = 0

      if (metric.measurementType === 'boolean') {
        intensity = entry?.value ? 3 : 0
      } else if (Number.isFinite(raw)) {
        if (!target) intensity = raw > 0 ? 1 : 0
        else intensity = Math.min(4, Math.max(0, Math.round((raw / target) * 4)))
      }

      days.push({ key, intensity, date, value: entry?.value ?? null, isToday: key === formatDayKey(today) })
    }
    return days
  }

  const getMetricTrendData = (metric, limit = null) => {
    const entries = [...(metric.entries || [])].sort((a, b) => new Date(a.date) - new Date(b.date))
    return (limit ? entries.slice(-limit) : entries).map((entry) => ({
      date: formatDateLabel(entry.date),
      value: metric.measurementType === 'boolean' ? (entry.value ? 1 : 0) : Number(entry.value ?? 0),
      target: metric.measurementType === 'boolean' ? 1 : Number(metric.target || 0),
    }))
  }

  const getMetricProgressValue = (metric) => Math.max(0, Math.min(100, getMetricProgress(metric)))

  const handleSaveMetric = () => {
    const cleanName = metricForm.name.trim()
    if (!cleanName) {
      setToast('Metric name is required.')
      return
    }

    const categoryName = (metricForm.customCategory || '').trim() || metricForm.category || 'Uncategorized'
    const normalizedMetric = {
      id: metricForm.id,
      name: cleanName,
      category: categoryName,
      measurementType: metricForm.measurementType,
      unit: metricForm.measurementType === 'boolean' ? 'done' : (metricForm.unit || '').trim(),
      target: metricForm.measurementType === 'boolean' ? 1 : Number(metricForm.target) || 0,
      color: metricForm.color || '#00F0FF',
      chartType: metricForm.chartType || 'line',
      entries: metrics.find((metric) => metric.id === metricForm.id)?.entries || [],
    }

    const nextMetrics = metricForm.id && metrics.some((metric) => metric.id === metricForm.id)
      ? metrics.map((metric) => (metric.id === metricForm.id ? normalizedMetric : metric))
      : [normalizedMetric, ...metrics]

    mutateMetrics(nextMetrics)
    setMetricModalOpen(false)
    setSelectedMetricId(normalizedMetric.id)
    resetMetricForm()
    setToast('Custom metric saved')
  }

  const editMetric = (metric) => {
    setMetricForm({
      ...metric,
      category: metric.category || 'Uncategorized',
      customCategory: '',
      chartType: metric.chartType || 'line',
      target: metric.target || '',
      unit: metric.unit || '',
    })
    setMetricModalOpen(true)
    setSelectedMetricId(null)
  }

  const deleteMetric = (metricId) => {
    const metric = metrics.find((item) => item.id === metricId)
    if (!metric) return
    mutateMetrics(metrics.filter((item) => item.id !== metricId))
    setSelectedMetricId(null)
    setToast(`${metric.name} deleted`)
  }

  const handleDeleteMetricEntry = (metricId, entryId) => {
    const nextMetrics = metrics.map((metric) => {
      if (metric.id !== metricId) return metric
      return { ...metric, entries: (metric.entries || []).filter((entry) => entry.id !== entryId) }
    })
    mutateMetrics(nextMetrics)
    setToast('Metric log removed')
  }

  const handleSaveMetricEntry = () => {
    if (!entryEditor) return
    const metric = metrics.find((item) => item.id === entryEditor.metricId)
    if (!metric) return

    const parsedValue = (() => {
      if (metric.measurementType === 'boolean') return entryEditor.value === 'true' || entryEditor.value === true || entryEditor.value === '1'
      if (metric.measurementType === 'scale') return Math.min(10, Math.max(0, Number(entryEditor.value) || 0))
      return Number(entryEditor.value)
    })()

    if (metric.measurementType !== 'boolean' && !Number.isFinite(parsedValue)) {
      setToast('Enter a valid number before saving.')
      return
    }

    const nextMetrics = metrics.map((item) => {
      if (item.id !== metric.id) return item

      if (entryEditor.entryId) {
        const existing = (item.entries || []).map((entry) => (entry.id === entryEditor.entryId ? { ...entry, date: entryEditor.date, value: parsedValue } : entry))
        return { ...item, entries: existing }
      }

      const nextEntry = {
        id: uid(),
        date: entryEditor.date || todayValue(),
        value: parsedValue,
      }

      return { ...item, entries: [...(item.entries || []), nextEntry] }
    })

    mutateMetrics(nextMetrics)
    setEntryEditor(null)
    setToast(entryEditor.entryId ? 'Metric entry updated' : 'Metric entry added')
  }

  const selectedMetric = selectedMetricId ? metrics.find((metric) => metric.id === selectedMetricId) || null : null

  const isMetricLoggedToday = (metric) => {
    const todayKey = todayValue()
    return (metric.entries || []).some((entry) => {
      const entryDay = formatDayKey(entry.date)
      if (entryDay !== todayKey) return false
      if (metric.measurementType === 'boolean') return !!entry.value
      return Number(entry.value ?? 0) > 0
    })
  }

  const getQuickMetricValue = (metric) => {
    if (metric.measurementType === 'boolean') return true
    if (metric.measurementType === 'scale') return Number(metric.target) > 0 ? Number(metric.target) : 10
    if (metric.measurementType === 'duration') return Number(metric.target) > 0 ? Number(metric.target) : 1
    return Number(metric.target) > 0 ? Number(metric.target) : 1
  }

  const quickLogMetric = (metricId) => {
    const metric = metrics.find((item) => item.id === metricId)
    if (!metric) return

    const todayKey = todayValue()
    const existing = (metric.entries || []).find((entry) => formatDayKey(entry.date) === todayKey)
    const nextValue = existing
      ? (metric.measurementType === 'boolean' ? !existing.value : Number(existing.value ?? 0) > 0 ? 0 : getQuickMetricValue(metric))
      : getQuickMetricValue(metric)

    const nextEntries = (metric.entries || []).filter((entry) => formatDayKey(entry.date) !== todayKey)
    if (nextValue === false || nextValue === 0 || nextValue === null) {
      mutateMetrics(metrics.map((item) => item.id === metric.id ? { ...item, entries: nextEntries } : item))
      setToast(`Cleared ${metric.name} for today`)
      return
    }

    const entry = {
      id: existing?.id || uid(),
      date: todayKey,
      value: nextValue,
    }

    mutateMetrics(metrics.map((item) => item.id === metric.id ? { ...item, entries: [...nextEntries, entry] } : item))
    setToast(`${metric.name} logged for today`)
  }

  return (
    <>
      <section className="overview-head">
        <div>
          <h2>Health metrics</h2>
          <p>Small, steady shifts create lasting momentum.</p>
        </div>
        <button className="primary-button" onClick={() => setMetricModalOpen(true)}>
          <Plus size={15} />
          Add custom metric
        </button>
      </section>

      {metrics.length === 0 ? (
        <div className="panel-card empty-state-card">
          <p className="eyebrow">NO VISIBLE METRICS</p>
          <h3>All metrics are hidden</h3>
          <p>Use Settings → Manage Metrics to show the cards you want on this dashboard.</p>
        </div>
      ) : (
        <div className="metric-card-grid">
          {metrics.map((metric) => {
            const latestEntry = getMetricLatestEntry(metric)
            const progress = getMetricProgress(metric)
            const streak = getMetricStreak(metric)
            const heatmap = getMetricHeatmap(metric)
            const latestValue = latestEntry ? getEntryValue(metric, latestEntry) : 'No data'
            const barData = getMetricTrendData(metric, chartWindow)
            const barMax = Math.max(1, ...barData.map((entry) => Number(entry.value) || 0))
            const goalDetails = getMetricGoalDetails(metric, latestEntry)

            return (
              <article
                key={metric.id}
                className="metric-card panel-card"
                style={{ '--metric-accent': metric.color }}
                onClick={() => setSelectedMetricId(metric.id)}
              >
                <div className="metric-card-header">
                  <div className="metric-heading-wrap">
                    <span className="metric-dot" style={{ background: metric.color }} />
                    <div>
                      <strong>{metric.name}</strong>
                      <small>{metric.category}</small>
                    </div>
                  </div>
                  <div className="metric-card-actions">
                    <div className="metric-value-pill">{latestValue}</div>
                    <button type="button" className="snapshot-edit-button" onClick={(event) => { event.stopPropagation(); editMetric(metric) }}>Edit metric</button>
                    <button type="button" className="icon-button subtle" onClick={(event) => { event.stopPropagation(); deleteMetric(metric.id) }} aria-label={`Delete ${metric.name}`}><Trash2 size={13} /></button>
                    <button
                      type="button"
                      className={`metric-quick-toggle ${isMetricLoggedToday(metric) ? 'done' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        quickLogMetric(metric.id)
                      }}
                    >
                      {isMetricLoggedToday(metric) ? '✓ Completed Today' : 'Complete Today'}
                    </button>
                  </div>
                </div>

                <div className="metric-status-row">
                  <span className="metric-target-badge">{progress}% target</span>
                  <span className="metric-streak-badge">🔥 {streak} days</span>
                </div>

                {goalDetails && (
                  <div className="metric-goal-summary">
                    <div className="metric-goal-values"><span>Current <strong>{goalDetails.current} {metric.unit}</strong></span><span>Target <strong>{goalDetails.target} {metric.unit}</strong></span></div>
                    <div className="metric-goal-track"><span style={{ width: `${goalDetails.progress}%`, background: metric.color }} /></div>
                    <small>{goalDetails.distance === 0 ? 'Target reached' : `${goalDetails.distance} ${metric.unit || 'units'} ${goalDetails.lowerIsBetter ? 'above' : 'remaining to'} target`}</small>
                  </div>
                )}

                {metric.measurementType === 'boolean' && (
                  <div className={`metric-bool-pill ${latestEntry?.value ? 'done' : 'pending'}`}>
                    {latestEntry?.value ? '✓ Completed today' : 'Not done today'}
                  </div>
                )}

                <div className="calendar-strip">
                  <div className="metric-mini-calendar-body">
                    <div className="metric-mini-weekdays" aria-hidden="true">
                      {['M', 'T', 'W', 'Th', 'F', 'S', 'S'].map((label) => (
                        <span key={`${metric.id}-weekday-${label}`}>{label}</span>
                      ))}
                    </div>
                    <div className="metric-heatmap" aria-label={`${metric.name} activity heatmap`}>
                      {heatmap.map((day) => (
                        <span
                          key={`${metric.id}-${day.key}`}
                          className={`metric-square intensity-${day.intensity} ${day.isToday ? 'today' : ''}`}
                          title={`${day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${day.value === null ? 'No data' : getEntryValue(metric, { value: day.value, date: day.key })}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="metric-chart-wrap">
                  {metric.chartType === 'bar' ? (
                    <>
                      <div className="chart-window-toggle"><span>Bar view</span><button type="button" className={chartWindow === 7 ? 'active' : ''} onClick={(event) => { event.stopPropagation(); setChartWindow(7) }}>7D</button><button type="button" className={chartWindow === 30 ? 'active' : ''} onClick={(event) => { event.stopPropagation(); setChartWindow(30) }}>30D</button></div>
                      <div className="metric-bar-chart">
                        <div className="metric-y-axis"><span>{barMax}</span><span>{Math.round(barMax / 2)}</span><span>0</span></div>
                        <div className="metric-bar-plot">
                          {metric.target > 0 && <span className="metric-bar-target" style={{ bottom: `${Math.min(100, (Number(metric.target) / barMax) * 100)}%` }} />}
                          <div className="metric-bars" aria-label={`${metric.name} bar chart`}>
                            {barData.map((entry, index) => <span key={`${metric.id}-bar-${index}`} style={{ height: `${Math.max(8, ((Number(entry.value) || 0) / barMax) * 100)}%`, background: metric.color }} title={`${entry.date}: ${entry.value}`} />)}
                          </div>
                          <div className="metric-x-axis">{barData.map((entry, index) => <span key={`${metric.id}-bar-label-${index}`}>{entry.date.slice(0, 5)}</span>)}</div>
                        </div>
                      </div>
                    </>
                  ) : metric.chartType === 'radial' ? (
                    <div className="metric-radial-chart"><svg viewBox="0 0 160 95"><path className="metric-radial-track" d="M20 80 A60 60 0 0 1 140 80" /><path className="metric-radial-progress" d="M20 80 A60 60 0 0 1 140 80" pathLength="100" style={{ stroke: metric.color, strokeDasharray: `${getMetricProgressValue(metric)} 100` }} /></svg><strong>{getMetricProgressValue(metric)}%</strong></div>
                  ) : (
                    <ResponsiveContainer width="100%" height={96}>
                      <AreaChart data={getMetricTrendData(metric)}>
                        <defs>
                          <linearGradient id={`fill-${metric.id}`} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={metric.color} stopOpacity={0.5} />
                            <stop offset="100%" stopColor={metric.color} stopOpacity={0.06} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} tick={{ fill: 'var(--muted)', fontSize: 9 }} minTickGap={18} />
                        <YAxis width={30} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} tick={{ fill: 'var(--muted)', fontSize: 9 }} domain={['dataMin - 10', 'dataMax + 10']} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke={metric.color} strokeWidth={2.5} fill={`url(#fill-${metric.id})`} />
                        <Line type="monotone" dataKey="target" stroke="var(--chart-target)" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {metricModalOpen && (
        <div className="modal-backdrop metric-modal-backdrop" onClick={closeMetricModal}>
          <div className="metric-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="metric-modal-header">
              <div>
                <p className="eyebrow">{metrics.some((metric) => metric.id === metricForm.id) ? 'EDIT SNAPSHOT' : 'ADD CUSTOM METRIC'}</p>
                <h3>{metricForm.name || 'New health metric'}</h3>
              </div>
              <button className="icon-button subtle" onClick={closeMetricModal} aria-label="Close metric form">
                <X size={15} />
              </button>
            </div>

            <div className="metric-form-grid">
              <label className="field-label">
                Metric Name
                <input value={metricForm.name} onChange={(event) => setMetricForm({ ...metricForm, name: event.target.value })} placeholder="Protein Intake" />
              </label>

              <div className="field-label">
                Health Category
                <div className="chip-grid">
                  {metricCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`chip ${metricForm.category === category ? 'active' : ''}`}
                      onClick={() => {
                        setMetricForm({ ...metricForm, category, customCategory: '' })
                      }}
                    >
                      {category}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`chip ${metricForm.category === '__custom__' ? 'active' : ''}`}
                    onClick={() => setMetricForm({ ...metricForm, category: '__custom__' })}
                  >
                    + Add Custom Category
                  </button>
                </div>
                {metricForm.category === '__custom__' && (
                  <input value={metricForm.customCategory} onChange={(event) => setMetricForm({ ...metricForm, customCategory: event.target.value })} placeholder="Recovery / Stress / Energy" />
                )}
              </div>
            </div>

            <div className="field-label">
              Measurement Type
              <div className="chip-grid multi-row">
                {['numeric', 'scale', 'duration', 'boolean'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`chip ${metricForm.measurementType === type ? 'active' : ''}`}
                    onClick={() => setMetricForm({ ...metricForm, measurementType: type, unit: type === 'boolean' ? 'done' : metricForm.unit || '' })}
                  >
                    {type === 'numeric' ? 'Numeric' : type === 'scale' ? 'Scale 1-10' : type === 'duration' ? 'Duration' : 'Done / Not Done'}
                  </button>
                ))}
              </div>
            </div>

            <label className="field-label">
              Chart Type
              <select value={metricForm.chartType} onChange={(event) => setMetricForm({ ...metricForm, chartType: event.target.value })}>
                <option value="line">Line Graph</option>
                <option value="bar">Bar Graph</option>
                <option value="radial">Half-Circle Gauge</option>
              </select>
            </label>

            <div className="field-grid two-up">
              <label className="field-label">
                Unit
                <input value={metricForm.unit} disabled={metricForm.measurementType === 'boolean'} onChange={(event) => setMetricForm({ ...metricForm, unit: event.target.value })} placeholder="g, bpm, hrs, steps" />
              </label>

              <label className="field-label">
                Daily Target
                <input type="number" value={metricForm.target} onChange={(event) => setMetricForm({ ...metricForm, target: event.target.value })} placeholder="120" />
              </label>
            </div>

            <div className="field-label">
              Accent Color
              <div className="color-grid">
                {defaultMetricColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`color-dot ${metricForm.color === color.value ? 'selected' : ''}`}
                    style={{ background: color.value }}
                    onClick={() => setMetricForm({ ...metricForm, color: color.value })}
                    aria-label={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="routine-actions-row">
              <button className="secondary-button" onClick={() => { resetMetricForm(); setMetricModalOpen(false) }}>
                <X size={15} />
                Cancel
              </button>
              <button className="primary-button" onClick={handleSaveMetric}>
                <Save size={15} />
                Save metric
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedMetric && (
        <div className="modal-backdrop" onClick={closeMetricDetail}>
          <div className="metric-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="metric-modal-header">
              <div className="metric-heading-wrap">
                <span className="metric-dot" style={{ background: selectedMetric.color }} />
                <div>
                  <p className="eyebrow">METRIC DETAIL</p>
                  <h3>{selectedMetric.name}</h3>
                </div>
              </div>
              <div className="metric-modal-header-actions">
                <button
                  type="button"
                  className="primary-button compact-inline"
                  onClick={() => setEntryEditor({ metricId: selectedMetric.id, entryId: null, date: toLocalDateTimeValue(new Date()), value: getQuickMetricValue(selectedMetric) })}
                >
                  Add Entry
                </button>
                <button className="icon-button subtle" onClick={closeMetricDetail} aria-label="Close metric detail">
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="metric-detail-summary">
              <span className="metric-badge-category">{selectedMetric.category}</span>
              <span>{selectedMetric.unit || 'value'}</span>
              <span>Target {selectedMetric.target || 0}</span>
              <span>{getMetricStreak(selectedMetric)} day streak</span>
              <button
                type="button"
                className={`metric-quick-toggle inline ${isMetricLoggedToday(selectedMetric) ? 'done' : ''}`}
                onClick={() => quickLogMetric(selectedMetric.id)}
              >
                {isMetricLoggedToday(selectedMetric) ? '✓ Completed Today' : 'Complete Today'}
              </button>
            </div>

            {entryEditor && (
              <div className="entry-editor">
                <strong>{entryEditor.entryId ? 'Edit log entry' : 'Add entry'}</strong>
                <div className="field-grid two-up">
                  <label className="field-label">
                    Date &amp; time
                    <input type="datetime-local" step="1" value={entryEditor.date} onChange={(event) => setEntryEditor({ ...entryEditor, date: event.target.value })} />
                  </label>
                  <label className="field-label">
                    Value
                    <input type="text" value={entryEditor.value} onChange={(event) => setEntryEditor({ ...entryEditor, value: event.target.value })} autoFocus />
                  </label>
                </div>
                <div className="routine-actions-row">
                  <button className="secondary-button" onClick={() => setEntryEditor(null)}>Cancel</button>
                  <button className="primary-button" onClick={handleSaveMetricEntry}>Save update</button>
                </div>
              </div>
            )}

            <div className="metric-chart-wrap large">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={getMetricTrendData(selectedMetric)}>
                  <defs>
                    <linearGradient id={`detail-fill-${selectedMetric.id}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={selectedMetric.color} stopOpacity={0.52} />
                      <stop offset="100%" stopColor={selectedMetric.color} stopOpacity={0.06} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke={selectedMetric.color} strokeWidth={3} fill={`url(#detail-fill-${selectedMetric.id})`} />
                  <Line type="monotone" dataKey="target" stroke="var(--chart-target)" strokeDasharray="5 5" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="calendar-strip expanded-calendar">
              <div className="metric-mini-calendar-body large">
                <div className="metric-mini-weekdays large" aria-hidden="true">
                  {['M', 'T', 'W', 'Th', 'F', 'S', 'S'].map((label) => (
                    <span key={`${selectedMetric.id}-weekday-${label}`}>{label}</span>
                  ))}
                </div>
                <div className="metric-detail-grid">
                  {getMetricHeatmap(selectedMetric).map((day) => (
                    <span
                      key={`${selectedMetric.id}-${day.key}`}
                      className={`metric-square intensity-${day.intensity} ${day.isToday ? 'today' : ''}`}
                      title={`${day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="log-list compact-list metric-log-list">
              {(selectedMetric.entries || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map((entry) => (
                <div key={entry.id} className="history-row metric-history-row">
                  <div>
                    <strong>{formatDateLabel(entry.date)}</strong>
                    <small style={{ color: selectedMetric.color }}>{getEntryValue(selectedMetric, entry)}</small>
                  </div>
                  <div className="row-actions">
                    <button className="icon-button subtle" onClick={() => setEntryEditor({ metricId: selectedMetric.id, entryId: entry.id, date: toLocalDateTimeValue(new Date(entry.date)), value: entry.value })} aria-label="Edit metric entry">
                      <Pencil size={14} />
                    </button>
                    <button className="icon-button subtle" onClick={() => handleDeleteMetricEntry(selectedMetric.id, entry.id)} aria-label="Delete metric entry">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ExercisesView({ user, updateUser, setToast }) {
  const emptyExercise = () => ({
    id: uid(),
    name: '',
    category: 'General',
    trackingType: 'rep',
    equipment: '',
    metrics: getDefaultExerciseMetrics('rep'),
  })

  const emptyRoutine = () => ({ id: uid(), name: '', exercises: [{ id: uid(), name: '', sets: 3, reps: 10, weight: 'Bodyweight' }] })

  const [draft, setDraft] = useState(emptyRoutine())
  const [editingId, setEditingId] = useState(null)
  const [showRoutineForm, setShowRoutineForm] = useState(false)
  const [exerciseForm, setExerciseForm] = useState(emptyExercise())
  const [editingExerciseId, setEditingExerciseId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [activeWorkout, setActiveWorkout] = useState(() => user.activeWorkout || null)
  const [workoutNow, setWorkoutNow] = useState(new Date())
  const [customExerciseModal, setCustomExerciseModal] = useState({ open: false, routineId: null, mode: 'selector' })
  const [selectedExerciseCategory, setSelectedExerciseCategory] = useState('All')
  const [editingCompletedExercise, setEditingCompletedExercise] = useState(null)
  const [editingSession, setEditingSession] = useState(null)
  const [deletingSession, setDeletingSession] = useState(null)
  const [restUntil, setRestUntil] = useState(null)
  const [playerRoutineId, setPlayerRoutineId] = useState(null)
  const [customExerciseForm, setCustomExerciseForm] = useState({
    name: '',
    category: 'Chest',
    trackingType: 'rep',
    equipment: '',
    metrics: getDefaultExerciseMetrics('rep'),
  })
  const [workoutProgress, setWorkoutProgress] = useState({})

  const library = user.exerciseLibrary?.length
    ? user.exerciseLibrary
    : user.exercises?.length
      ? user.exercises
      : exercisesSeed
  const exerciseCategories = ['All', ...new Set(library.map((exercise) => exercise.category || 'General').filter(Boolean))]
  const filteredExercises = library.filter((exercise) => (
    selectedExerciseCategory === 'All' || (exercise.category || 'General') === selectedExerciseCategory
  ))

  useEffect(() => {
    if (!customExerciseModal.open) return

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setCustomExerciseModal({ open: false, routineId: null, mode: 'selector' })
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [customExerciseModal.open])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    const fetchSupabaseExercises = async () => {
      const { data, error } = await supabase.from('exercises').select('*').order('category', { ascending: true })
      if (error || !data || !data.length) return

      const supabaseLibrary = data.map(normalizeSupabaseExercise)
      const localLibrary = user.exerciseLibrary?.length
        ? user.exerciseLibrary
        : user.exercises?.length
          ? user.exercises
          : exercisesSeed
      const supabaseIds = new Set(supabaseLibrary.map((exercise) => exercise.id))
      const nextLibrary = [...supabaseLibrary, ...localLibrary.filter((exercise) => !supabaseIds.has(exercise.id))]
      updateUser({ exerciseLibrary: nextLibrary, exercises: nextLibrary })
    }

    fetchSupabaseExercises()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setWorkoutNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    updateUser({ activeWorkout })
  }, [activeWorkout])

  const getRoutineProgressState = (routine) => ({
    exercises: Object.fromEntries((routine.exercises || []).map((exercise, index) => {
      const exerciseKey = exercise.exerciseId || exercise.id || `${routine.id}-${index}`
      const setCount = Math.max(1, Number(exercise.sets) || 1)
      return [exerciseKey, {
        completed: false,
        sets: Object.fromEntries(Array.from({ length: setCount }, (_, setIndex) => [setIndex, {
          completed: false,
          reps: exercise.trackingType === 'duration' ? 0 : exercise.reps || 0,
          weight: exercise.trackingType === 'duration' ? '' : exercise.weight || '',
          duration: exercise.trackingType === 'duration' ? exercise.weight || '00:00' : '',
          distance: '',
        }])),
      }]
    })),
  })

  const toggleWorkoutSet = (routineId, exerciseKey, setIndex) => {
    setWorkoutProgress((current) => {
      const routineState = current[routineId] || getRoutineProgressState(user.routines.find((routine) => routine.id === routineId))
      const targetState = routineState.exercises[exerciseKey] || { completed: false, sets: {} }
      const currentSet = targetState.sets[setIndex] || { completed: false }
      const completed = !currentSet.completed
      targetState.sets[setIndex] = { ...currentSet, completed }
      setRestUntil(completed ? Date.now() + 60000 : null)
      const allChecked = Object.values(targetState.sets).every((set) => set.completed)
      targetState.completed = allChecked
      routineState.exercises[exerciseKey] = targetState
      return { ...current, [routineId]: routineState }
    })
  }

  const updateWorkoutSetField = (routineId, exerciseKey, setIndex, field, value) => {
    setWorkoutProgress((current) => {
      const routineState = current[routineId] || getRoutineProgressState(user.routines.find((routine) => routine.id === routineId))
      const targetState = routineState.exercises[exerciseKey] || { completed: false, sets: {} }
      targetState.sets[setIndex] = { ...(targetState.sets[setIndex] || {}), [field]: value }
      return { ...current, [routineId]: routineState }
    })
  }

  const toggleExerciseComplete = (routineId, exerciseKey) => {
    setWorkoutProgress((current) => {
      const routineState = current[routineId] || getRoutineProgressState(user.routines.find((routine) => routine.id === routineId))
      const targetState = routineState.exercises[exerciseKey] || { completed: false, sets: {} }
      const nextCompleted = !targetState.completed
      const allSetIndexes = Object.keys(targetState.sets || {}).map(Number)
      if (allSetIndexes.length === 0) {
        targetState.completed = nextCompleted
      } else {
        allSetIndexes.forEach((setIndex) => {
          targetState.sets[setIndex] = { ...(targetState.sets[setIndex] || {}), completed: nextCompleted }
        })
        targetState.completed = nextCompleted
      }
      routineState.exercises[exerciseKey] = targetState
      return { ...current, [routineId]: routineState }
    })
  }

  const beginWorkout = (routine) => {
    const startedAt = new Date().toISOString()
    const nextWorkout = {
      id: uid(),
      routineId: routine.id,
      routineName: routine.name,
      startedAt,
    }
    setActiveWorkout(nextWorkout)
    setWorkoutProgress((current) => ({ ...current, [routine.id]: getRoutineProgressState(routine) }))
    setToast(`Started ${routine.name}`)
  }

  const finishWorkout = () => {
    if (!activeWorkout) return
    const end = new Date()
    const activeRoutine = user.routines.find((routine) => routine.id === activeWorkout.routineId)
    const durationMs = end.getTime() - new Date(activeWorkout.startedAt).getTime()
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000))
    const workoutLogId = uid()
    const session = {
      id: activeWorkout.id,
      routineId: activeWorkout.routineId,
      routineName: activeWorkout.routineName,
      startedAt: activeWorkout.startedAt,
      endedAt: end.toISOString(),
      durationMinutes,
      durationMs,
      logId: workoutLogId,
      exercises: user.routines.find((routine) => routine.id === activeWorkout.routineId)?.exercises.map((exercise, index) => {
        const exerciseKey = exercise.exerciseId || exercise.id || `${activeWorkout.routineId}-${index}`
        const progress = workoutProgress[activeWorkout.routineId]?.exercises?.[exerciseKey] || { sets: {} }
        const setCount = Math.max(1, Number(exercise.sets) || 1)
        return {
          ...exercise,
          sets: Array.from({ length: setCount }, (_, setIndex) => ({
            reps: progress.sets?.[setIndex]?.reps ?? (exercise.trackingType === 'duration' ? 0 : Number(exercise.reps) || 0),
            weight: progress.sets?.[setIndex]?.weight ?? (exercise.weight || ''),
            duration: progress.sets?.[setIndex]?.duration ?? (exercise.trackingType === 'duration' ? exercise.weight || '00:00' : ''),
            distance: progress.sets?.[setIndex]?.distance || '',
            completed: !!progress.sets?.[setIndex]?.completed,
          })),
        }
      }) || [],
    }

    updateUser({
      workoutSessions: [session, ...(user.workoutSessions || [])],
      logs: [{
        id: workoutLogId,
        type: 'Workout',
        icon: activeRoutine?.exerciseEmoji || user.exerciseEmoji || '🏋️',
        title: activeWorkout.routineName,
        date: end.toISOString(),
        summary: `${durationMinutes} min • ${activeWorkout.routineName}`,
        archived: false,
      }, ...(user.logs || [])],
      activeWorkout: null,
    })

    setActiveWorkout(null)
    setToast('Workout completed')
  }

  const deleteWorkoutSession = () => {
    if (!deletingSession) return
    updateUser({
      workoutSessions: (user.workoutSessions || []).filter((session) => session.id !== deletingSession.id),
      logs: (user.logs || []).filter((entry) => entry.id !== deletingSession.logId && !(entry.type === 'Workout' && entry.title === deletingSession.routineName && entry.date === deletingSession.endedAt)),
    })
    setDeletingSession(null)
    setToast('Workout session deleted')
  }

  const updateRoutineName = (value) => setDraft((current) => ({ ...current, name: value }))

  const updateExercise = (exerciseId, field, value) => {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((item) => (item.id === exerciseId ? { ...item, [field]: value } : item)),
    }))
  }

  const addExerciseField = () => {
    setDraft((current) => ({ ...current, exercises: [...current.exercises, { id: uid(), name: '', sets: 3, reps: 10, weight: 'Bodyweight' }] }))
  }

  const openCustomExerciseModal = (routineId = null) => {
    setCustomExerciseModal({ open: true, routineId, mode: 'selector' })
    setCustomExerciseForm({
      name: '',
      category: 'Chest',
      trackingType: 'rep',
      equipment: '',
      metrics: getDefaultExerciseMetrics('rep'),
    })
    setSelectedExerciseCategory('All')
  }

  const addExerciseToActiveRoutine = (exercise) => {
    const nextExercise = {
      id: exercise.id || uid(),
      exerciseId: exercise.id || uid(),
      name: exercise.name,
      category: exercise.category || 'General',
      trackingType: exercise.trackingType || 'rep',
      sets: 3,
      reps: exercise.trackingType === 'duration' ? 1 : 10,
      weight: exercise.trackingType === 'duration' ? '00:00' : 'Bodyweight',
    }

    if (customExerciseModal.routineId) {
      updateUser({
        routines: user.routines.map((routine) => routine.id === customExerciseModal.routineId
          ? { ...routine, exercises: [...routine.exercises, nextExercise] }
          : routine),
      })
    } else {
      setDraft((current) => ({ ...current, exercises: [...current.exercises, nextExercise] }))
    }

    setCustomExerciseModal({ open: false, routineId: null, mode: 'selector' })
    setToast(`${exercise.name} added to the routine`)
  }

  const persistCustomExerciseToSupabase = async (exercise) => {
    if (!supabase) return null

    const metrics = Object.entries(exercise.metrics || {})
      .filter(([, enabled]) => enabled)
      .map(([key]) => key)

    const { data, error } = await supabase.from('exercises').insert([{
      name: exercise.name,
      category: exercise.category,
      tracking_type: exercise.trackingType === 'duration' ? 'duration_based' : 'rep_based',
      equipment: Array.isArray(exercise.equipment) ? exercise.equipment.join(', ') : exercise.equipment || 'Bodyweight',
      default_metrics: metrics,
      is_custom: true,
    }]).select().single()

    if (error || !data) return null
    return normalizeSupabaseExercise(data)
  }

  const saveCustomExercise = async () => {
    const cleanName = customExerciseForm.name.trim()
    if (!cleanName) {
      setToast('Exercise name is required.')
      return
    }

    const normalizedLibraryExercise = {
      id: uid(),
      name: cleanName,
      category: customExerciseForm.category || 'General',
      trackingType: customExerciseForm.trackingType || 'rep',
      equipment: customExerciseForm.equipment
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      metrics: customExerciseForm.metrics || getDefaultExerciseMetrics(customExerciseForm.trackingType || 'rep'),
    }

    const savedExercise = await persistCustomExerciseToSupabase(normalizedLibraryExercise)
    const finalExercise = savedExercise || normalizedLibraryExercise
    const nextLibrary = [...library, finalExercise]
    const newExercise = {
      ...finalExercise,
      id: finalExercise.id,
      exerciseId: finalExercise.id,
      sets: 3,
      reps: finalExercise.trackingType === 'duration' ? 1 : 10,
      weight: finalExercise.trackingType === 'duration' ? '00:00' : 'Bodyweight',
    }

    const nextRoutines = customExerciseModal.routineId
      ? user.routines.map((routine) => routine.id === customExerciseModal.routineId
        ? { ...routine, exercises: [...routine.exercises, newExercise] }
        : routine)
      : user.routines

    updateUser({
      exerciseLibrary: nextLibrary,
      exercises: nextLibrary,
      routines: nextRoutines,
    })

    if (!customExerciseModal.routineId) {
      setDraft((current) => ({ ...current, exercises: [...current.exercises, newExercise] }))
    }

    setCustomExerciseModal({ open: false, routineId: null, mode: 'selector' })
    setToast('Custom exercise added to your routine')
  }

  const removeExerciseField = (exerciseId) => {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.length > 1 ? current.exercises.filter((item) => item.id !== exerciseId) : current.exercises,
    }))
  }

  const saveRoutine = () => {
    const trimmedName = draft.name.trim()
    const validExercises = draft.exercises.filter((item) => item.name.trim())

    if (!trimmedName || validExercises.length === 0) {
      setToast('Add a routine name and at least one exercise.')
      return
    }

    const normalizedRoutine = {
      id: editingId || uid(),
      name: trimmedName,
      exercises: validExercises.map((exercise) => ({
        ...exercise,
        name: exercise.name.trim(),
        sets: Number(exercise.sets) || 1,
        reps: Number(exercise.reps) || 1,
      })),
    }

    updateUser({
      routines: editingId
        ? user.routines.map((routine) => (routine.id === editingId ? normalizedRoutine : routine))
        : [...user.routines, normalizedRoutine],
    })

    setDraft(emptyRoutine())
    setEditingId(null)
    setToast(editingId ? 'Routine updated' : 'Routine saved')
  }

  const editRoutine = (routine) => {
    setEditingId(routine.id)
    setDraft({
      id: routine.id,
      name: routine.name,
      exercises: routine.exercises.map((exercise) => ({ ...exercise, id: exercise.id || uid() })),
    })
    setShowRoutineForm(true)
  }

  const beginCompletedExerciseEdit = (routineId, exercise) => {
    setEditingCompletedExercise({
      routineId,
      exerciseKey: exercise.exerciseId || exercise.id,
      sets: exercise.sets,
      reps: exercise.reps,
      weight: exercise.weight || '',
    })
  }

  const saveCompletedExerciseEdit = () => {
    if (!editingCompletedExercise) return

    const { routineId, exerciseKey, sets, reps, weight } = editingCompletedExercise
    updateUser({
      routines: user.routines.map((routine) => routine.id === routineId
        ? {
          ...routine,
          exercises: routine.exercises.map((exercise) => (
            (exercise.exerciseId || exercise.id) === exerciseKey
              ? { ...exercise, sets: Math.max(1, Number(sets) || 1), reps: Math.max(1, Number(reps) || 1), weight }
              : exercise
          )),
        }
        : routine),
    })
    setEditingCompletedExercise(null)
    setToast('Completed exercise updated')
  }

  const deleteRoutine = (routineId) => {
    updateUser({ routines: user.routines.filter((routine) => routine.id !== routineId) })
    if (editingId === routineId) {
      setDraft(emptyRoutine())
      setEditingId(null)
    }
    setToast('Routine deleted')
  }

  const handleRoutineCoverUpload = async (routineId, file) => {
    const dataUrl = await readFileAsDataUrl(file)
    if (!dataUrl) return
    updateUser({
      routines: user.routines.map((routine) => (routine.id === routineId ? { ...routine, coverImage: dataUrl } : routine)),
    })
  }

  const updateExerciseForm = (field, value) => {
    setExerciseForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'trackingType') {
        next.metrics = getDefaultExerciseMetrics(value)
      }
      return next
    })
  }

  const toggleMetric = (metric) => {
    setExerciseForm((current) => ({
      ...current,
      metrics: { ...current.metrics, [metric]: !current.metrics[metric] },
    }))
  }

  const resetExerciseForm = () => {
    setExerciseForm(emptyExercise())
    setEditingExerciseId(null)
  }

  const saveExercise = () => {
    const cleanName = exerciseForm.name.trim()
    if (!cleanName) {
      setToast('Exercise name is required.')
      return
    }

    const normalizedExercise = {
      ...exerciseForm,
      id: editingExerciseId || uid(),
      name: cleanName,
      category: exerciseForm.category.trim() || 'General',
      trackingType: exerciseForm.trackingType || 'rep',
      equipment: exerciseForm.equipment
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      metrics: exerciseForm.metrics || getDefaultExerciseMetrics(exerciseForm.trackingType || 'rep'),
    }

    const nextLibrary = editingExerciseId
      ? library.map((exercise) => (exercise.id === editingExerciseId ? normalizedExercise : exercise))
      : [...library, normalizedExercise]

    const nextRoutines = user.routines.map((routine) => ({
      ...routine,
      exercises: routine.exercises.map((exercise) => {
        if (exercise.exerciseId === editingExerciseId || exercise.id === editingExerciseId) {
          return { ...exercise, name: normalizedExercise.name, exerciseId: normalizedExercise.id, category: normalizedExercise.category }
        }
        return exercise
      }),
    }))

    const nextLogs = (user.logs || []).map((entry) => {
      if (entry.exerciseId === editingExerciseId) {
        return { ...entry, title: normalizedExercise.name, exerciseId: normalizedExercise.id }
      }
      return entry
    })

    updateUser({ exerciseLibrary: nextLibrary, routines: nextRoutines, logs: nextLogs })
    setToast(editingExerciseId ? 'Exercise updated' : 'Exercise added')
    resetExerciseForm()
  }

  const beginExerciseEdit = (exercise) => {
    setEditingExerciseId(exercise.id)
    setExerciseForm({
      ...exercise,
      equipment: Array.isArray(exercise.equipment) ? exercise.equipment.join(', ') : exercise.equipment || '',
      metrics: exercise.metrics || getDefaultExerciseMetrics(exercise.trackingType || 'rep'),
    })
  }

  const deleteExercise = () => {
    if (!deleteTarget) return
    const nextLibrary = library.filter((exercise) => exercise.id !== deleteTarget.id)
    const nextRoutines = user.routines.map((routine) => ({
      ...routine,
      exercises: routine.exercises.filter((exercise) => exercise.id !== deleteTarget.id && exercise.exerciseId !== deleteTarget.id),
    }))

    const nextLogs = (user.logs || []).map((entry) =>
      entry.exerciseId === deleteTarget.id ? { ...entry, title: `${entry.title || deleteTarget.name} (Archived/Deleted)`, archived: true } : entry,
    )

    updateUser({ exerciseLibrary: nextLibrary, routines: nextRoutines, logs: nextLogs })
    setDeleteTarget(null)
    setToast(`Deleted ${deleteTarget.name}`)
    if (editingExerciseId === deleteTarget.id) resetExerciseForm()
  }

  return (
    <>
      <section className="overview-head">
        <div>
          <h2>Exercise routines</h2>
          <p>Build focused plans you can reuse, edit, and save.</p>
        </div>
        <button className="primary-button" onClick={() => setShowRoutineForm(true)}>
          <Plus size={15} />
          Add a new routine
        </button>
      </section>

      {showRoutineForm && <div className="modal-backdrop form-toggle-backdrop" onClick={() => { setDraft(emptyRoutine()); setEditingId(null); setShowRoutineForm(false) }}>
      <div className="panel-card form-popout routine-builder" onClick={(event) => event.stopPropagation()}>
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">{editingId ? 'EDIT ROUTINE' : 'NEW ROUTINE'}</p>
            <h3>{editingId ? 'Update your workout plan' : 'Create a workout plan'}</h3>
          </div>
          <button className="ghost-button" onClick={() => { setDraft(emptyRoutine()); setEditingId(null); setShowRoutineForm(false) }}>
            <X size={16} />
            Reset
          </button>
        </div>

        <label className="field-label">
          Routine name
          <input value={draft.name} onChange={(event) => updateRoutineName(event.target.value)} placeholder="Leg day / Upper body / Mobility" />
        </label>

        {draft.exercises.map((exercise, index) => (
          <div key={exercise.id} className="exercise-row">
            <input
              value={exercise.name}
              onChange={(event) => updateExercise(exercise.id, 'name', event.target.value)}
              placeholder={`Exercise ${index + 1}`}
            />
            <input value={exercise.sets} onChange={(event) => updateExercise(exercise.id, 'sets', event.target.value)} type="number" min="1" />
            <input value={exercise.reps} onChange={(event) => updateExercise(exercise.id, 'reps', event.target.value)} type="number" min="1" />
            <input value={exercise.weight} onChange={(event) => updateExercise(exercise.id, 'weight', event.target.value)} placeholder="Weight" />
            <button className="icon-button subtle" onClick={() => removeExerciseField(exercise.id)} aria-label="Remove exercise">
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        <div className="routine-actions-row">
          <button className="secondary-button" onClick={() => openCustomExerciseModal()}>
            <Plus size={16} />
            + Add Exercise
          </button>
          <button className="primary-button" onClick={saveRoutine}>
            <Save size={16} />
            {editingId ? 'Save changes' : 'Save routine'}
          </button>
        </div>
      </div>
      </div>}

      <div className="routine-grid">
        {user.routines.map((routine) => {
          const isActive = activeWorkout?.routineId === routine.id
          const elapsed = isActive ? Math.max(0, workoutNow - new Date(activeWorkout.startedAt)) : 0
          const primaryCategory = routine.exercises[0]?.category || 'General'

          return (
            <article key={routine.id} className="routine-mini-card" onClick={() => setPlayerRoutineId(routine.id)}>
              <div className="routine-mini-top">
                <div>
                  <p className="eyebrow">ROUTINE</p>
                  <h3>{routine.name}</h3>
                </div>
                <div className="routine-actions" onClick={(event) => event.stopPropagation()}>
                  <button className="icon-button subtle" onClick={() => editRoutine(routine)} aria-label="Edit routine">
                    <Pencil size={15} />
                  </button>
                  <button className="icon-button subtle" onClick={() => deleteRoutine(routine.id)} aria-label="Delete routine">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="routine-mini-meta">
                <span className="routine-category-badge">{primaryCategory}</span>
                <span className="routine-time-estimate">~{estimateRoutineMinutes(routine)} min</span>
                {isActive && <span className="routine-status-badge live">Live • {formatDuration(elapsed)}</span>}
              </div>

              <button
                type="button"
                className="routine-launch-button"
                onClick={(event) => {
                  event.stopPropagation()
                  if (!isActive) beginWorkout(routine)
                  setPlayerRoutineId(routine.id)
                }}
              >
                {isActive ? 'Resume Workout ▶' : 'Start Workout ▶'}
              </button>
            </article>
          )
        })}
      </div>

      {playerRoutineId && (() => {
        const routine = user.routines.find((item) => item.id === playerRoutineId)
        if (!routine) return null
        const isActive = activeWorkout?.routineId === routine.id
        const elapsed = isActive ? Math.max(0, workoutNow - new Date(activeWorkout.startedAt)) : 0

        return (
          <div className="modal-backdrop routine-player-backdrop" onClick={() => setPlayerRoutineId(null)}>
            <div className="modal-card routine-player-modal" onClick={(event) => event.stopPropagation()}>
              <label className="routine-media-header">
                {routine.coverImage ? <img src={routine.coverImage} alt="" /> : <span className="routine-media-placeholder">📷 Add a cover photo</span>}
                <input type="file" accept="image/*" onChange={(event) => handleRoutineCoverUpload(routine.id, event.target.files?.[0])} />
              </label>

              <div className="metric-modal-header">
                <div>
                  <p className="eyebrow">ROUTINE PLAYER</p>
                  <h3>{routine.name}</h3>
                </div>
                <div className="metric-modal-header-actions">
                  <button className="icon-button subtle" onClick={() => { setPlayerRoutineId(null); editRoutine(routine) }} aria-label="Edit routine">
                    <Pencil size={16} />
                  </button>
                  <button className="icon-button subtle" onClick={() => setPlayerRoutineId(null)} aria-label="Close routine player">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="routine-timer-row">
                <span className="routine-status-badge">{isActive ? 'Live' : 'Ready'}</span>
                <strong>{isActive ? formatDuration(elapsed) : `${routine.exercises.length} moves`}</strong>
              </div>

              <div className="exercise-list">
                {routine.exercises.map((exercise, index) => {
                  const exerciseKey = exercise.exerciseId || exercise.id || `${routine.id}-${index}`
                  const progressState = workoutProgress[routine.id]?.exercises?.[exerciseKey] || { completed: false, sets: {} }
                  const totalSets = Math.max(1, Number(exercise.sets) || 1)
                  const isEditingCompleted = editingCompletedExercise?.routineId === routine.id && editingCompletedExercise.exerciseKey === exerciseKey

                  return (
                    <div key={`${routine.id}-${index}`} className={`exercise-item ${progressState.completed ? 'completed' : ''}`}>
                      {isEditingCompleted ? (
                        <div className="completed-exercise-editor">
                          <strong>{exercise.name}</strong>
                          <div className="completed-exercise-fields">
                            <label className="field-label">
                              Sets
                              <input type="number" min="1" value={editingCompletedExercise.sets} onChange={(event) => setEditingCompletedExercise((current) => ({ ...current, sets: event.target.value }))} />
                            </label>
                            <label className="field-label">
                              Reps
                              <input type="number" min="1" value={editingCompletedExercise.reps} onChange={(event) => setEditingCompletedExercise((current) => ({ ...current, reps: event.target.value }))} />
                            </label>
                            <label className="field-label">
                              Weight
                              <input value={editingCompletedExercise.weight} onChange={(event) => setEditingCompletedExercise((current) => ({ ...current, weight: event.target.value }))} />
                            </label>
                          </div>
                          <div className="routine-actions-row">
                            <button className="secondary-button" onClick={() => setEditingCompletedExercise(null)}>Cancel</button>
                            <button className="primary-button" onClick={saveCompletedExerciseEdit}><Save size={14} /> Save exercise</button>
                          </div>
                        </div>
                      ) : (
                        <div className="exercise-item-summary">
                          <div>
                            <strong>{exercise.name}</strong>
                            <span>{exercise.sets} sets × {exercise.reps} reps</span>
                          </div>
                          <div className="exercise-item-meta">
                            <em>{exercise.weight}</em>
                            {progressState.completed && (
                              <button className="icon-button subtle" onClick={() => beginCompletedExerciseEdit(routine.id, exercise)} aria-label={`Edit completed ${exercise.name}`}>
                                <Pencil size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {isActive && (
                        <div className="live-exercise-panel">
                          <div className="live-exercise-head">
                            <button className={`exercise-complete-toggle ${progressState.completed ? 'done' : ''}`} onClick={() => toggleExerciseComplete(routine.id, exerciseKey)}>
                              {progressState.completed ? 'Done' : 'Exercise Completed'}
                            </button>
                            {restUntil && restUntil > workoutNow.getTime() && <small className="rest-timer">Rest {formatDuration(restUntil - workoutNow.getTime()).slice(3)}</small>}
                          </div>
                          <div className="set-check-grid">
                            {Array.from({ length: totalSets }, (_, setIndex) => (
                              <label key={`${routine.id}-${exerciseKey}-${setIndex}`} className="set-check-item">
                                <span>Set {setIndex + 1}</span>
                                {exercise.trackingType === 'duration' ? <><input value={progressState.sets[setIndex]?.duration || ''} onChange={(event) => updateWorkoutSetField(routine.id, exerciseKey, setIndex, 'duration', event.target.value)} placeholder="MM:SS" /><input value={progressState.sets[setIndex]?.distance || ''} onChange={(event) => updateWorkoutSetField(routine.id, exerciseKey, setIndex, 'distance', event.target.value)} placeholder="km" /></> : <><input type="number" value={progressState.sets[setIndex]?.reps ?? ''} onChange={(event) => updateWorkoutSetField(routine.id, exerciseKey, setIndex, 'reps', event.target.value)} placeholder="reps" /><input type="number" value={progressState.sets[setIndex]?.weight ?? ''} onChange={(event) => updateWorkoutSetField(routine.id, exerciseKey, setIndex, 'weight', event.target.value)} placeholder="kg" /></>}
                                <button type="button" className={`exercise-complete-toggle ${progressState.sets[setIndex]?.completed ? 'done' : ''}`} onClick={() => toggleWorkoutSet(routine.id, exerciseKey, setIndex)}>{progressState.sets[setIndex]?.completed ? 'Done' : 'Not Done'}</button>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="routine-card-actions">
                {isActive ? (
                  <>
                    <button className="secondary-button" onClick={() => openCustomExerciseModal(routine.id)}>
                      <Plus size={15} />
                      + Add Exercise
                    </button>
                    <button className="primary-button" onClick={finishWorkout}>
                      <TimerReset size={15} />
                      Finish workout
                    </button>
                  </>
                ) : (
                  <button className="primary-button" onClick={() => beginWorkout(routine)}>
                    <Play size={15} />
                    Start routine
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      <div className="panel-card workout-history-panel">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">HISTORY</p>
            <h3>Workout history</h3>
          </div>
        </div>

        <div className="workout-history-list">
          {(user.workoutSessions || []).slice(0, 6).map((session) => (
            <div key={session.id} className="workout-history-item">
              <div>
                <strong>{session.routineName}</strong>
                <small>{formatDateLabel(session.endedAt || session.startedAt)}</small>
              </div>
              <div className="history-item-actions">
                <span>{Math.max(1, Math.round((session.durationMinutes || session.durationMs / 60000) || 1))} min</span>
                <button className="icon-button subtle" onClick={() => setEditingSession(session)} aria-label="Edit workout session">
                  <Pencil size={13} />
                </button>
                <button className="icon-button delete-session-button" onClick={() => setDeletingSession(session)} aria-label="Delete workout session">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {customExerciseModal.open && (
        <div className="drawer-backdrop" onClick={() => setCustomExerciseModal({ open: false, routineId: null, mode: 'selector' })}>
          <aside className="custom-exercise-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="metric-modal-header">
              <div>
                <p className="eyebrow">{customExerciseModal.mode === 'custom' ? 'CREATE CUSTOM EXERCISE' : 'ADD EXERCISE'}</p>
                <h3>{customExerciseModal.mode === 'custom' ? 'Create a movement' : 'Choose a movement'}</h3>
              </div>
              <button className="icon-button subtle" onClick={() => setCustomExerciseModal({ open: false, routineId: null, mode: 'selector' })} aria-label="Close custom exercise drawer">
                <X size={15} />
              </button>
            </div>

            {customExerciseModal.mode === 'selector' ? (
              <>
                <label className="field-label">
                  Exercise category
                  <select value={selectedExerciseCategory} onChange={(event) => setSelectedExerciseCategory(event.target.value)}>
                    {exerciseCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <div className="exercise-selector-list">
                  {filteredExercises.map((exercise) => (
                    <button key={exercise.id} type="button" className="selector-item" onClick={() => addExerciseToActiveRoutine(exercise)}>
                      <div>
                        <strong>{exercise.name}</strong>
                        <small>{exercise.category || 'General'}</small>
                      </div>
                      <span>{exercise.trackingType === 'duration' ? 'Duration' : 'Reps'}</span>
                    </button>
                  ))}
                  {!filteredExercises.length && (
                    <div className="selector-empty">No exercises match this filter.</div>
                  )}
                </div>

                <div className="routine-actions-row drawer-actions">
                  <button className="secondary-button" onClick={() => setCustomExerciseModal({ ...customExerciseModal, mode: 'custom' })}>
                    + Create Custom Exercise
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="field-grid two-up">
                  <label className="field-label">
                    Exercise Name
                    <input value={customExerciseForm.name} onChange={(event) => setCustomExerciseForm({ ...customExerciseForm, name: event.target.value })} placeholder="Cable row" />
                  </label>

                  <label className="field-label">
                    Primary Category
                    <select value={customExerciseForm.category} onChange={(event) => setCustomExerciseForm({ ...customExerciseForm, category: event.target.value })}>
                      {['Chest', 'Back', 'Shoulders', 'Legs', 'Biceps', 'Triceps', 'Core', 'Cardio', 'Functional', 'Mobility', 'General', 'Other'].map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="field-grid two-up">
                  <label className="field-label">
                    Tracking Type
                    <div className="chip-grid multi-row">
                      {['rep', 'duration'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          className={`chip ${customExerciseForm.trackingType === type ? 'active' : ''}`}
                          onClick={() => setCustomExerciseForm((current) => ({ ...current, trackingType: type, metrics: getDefaultExerciseMetrics(type) }))}
                        >
                          {type === 'rep' ? 'Rep-Based' : 'Duration-Based'}
                        </button>
                      ))}
                    </div>
                  </label>

                  <label className="field-label">
                    Equipment Required
                    <input value={customExerciseForm.equipment} onChange={(event) => setCustomExerciseForm({ ...customExerciseForm, equipment: event.target.value })} placeholder="Dumbbell, bench" />
                  </label>
                </div>

                <div className="field-label">
                  Default Tracking Metrics
                  <div className="metric-toggle-grid">
                    {Object.entries({
                      sets: 'Sets',
                      reps: 'Reps',
                      weight: 'Weight',
                      duration: 'Duration',
                      distance: 'Distance',
                      pace: 'Pace',
                      calories: 'Calories',
                    }).map(([metric, label]) => (
                      <label key={metric} className="metric-toggle">
                        <input type="checkbox" checked={!!customExerciseForm.metrics?.[metric]} onChange={() => setCustomExerciseForm((current) => ({
                          ...current,
                          metrics: { ...current.metrics, [metric]: !current.metrics?.[metric] },
                        }))} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="routine-actions-row drawer-actions">
                  <button className="secondary-button" onClick={() => setCustomExerciseModal({ ...customExerciseModal, mode: 'selector' })}>Back</button>
                  <button className="primary-button" onClick={saveCustomExercise}>Save custom exercise</button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">DELETE EXERCISE</p>
            <h3>Are you sure you want to delete {deleteTarget.name}?</h3>
            <p>This removes it from active routines and keeps historical records marked as archived.</p>
            <div className="routine-actions-row">
              <button className="secondary-button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="primary-button" onClick={deleteExercise}>Confirm delete</button>
            </div>
          </div>
        </div>
      )}

      {editingSession && (
        <WorkoutSessionEditor
          session={editingSession}
          exerciseLibrary={library}
          onClose={() => setEditingSession(null)}
          onSave={(nextSession) => {
            updateUser({
              workoutSessions: (user.workoutSessions || []).map((item) => item.id === nextSession.id ? nextSession : item),
              logs: (user.logs || []).map((entry) => entry.id === nextSession.logId
                ? { ...entry, title: nextSession.routineName, date: nextSession.endedAt, summary: `${Math.round(nextSession.durationMs / 60000)} min • ${nextSession.routineName}` }
                : entry),
            })
            setEditingSession(null)
            setToast('Workout session updated')
          }}
        />
      )}
      {deletingSession && <SessionDeletePrompt session={deletingSession} onCancel={() => setDeletingSession(null)} onConfirm={deleteWorkoutSession} />}
    </>
  )
}

function HabitView({ user, updateUser, setToast }) {
  const habitCategories = ['Movement', 'Recovery', 'Nutrition', 'Mindset', 'General', 'Sleep']
  const [form, setForm] = useState({
    id: uid(),
    name: '',
    category: 'Movement',
    measurementMode: 'binary',
    target: '',
    unit: 'minutes',
    icon: '💪',
    restDay: false,
    trackingType: 'boolean',
    targetValue: '',
    quickLog: false,
  })
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedHabitId, setSelectedHabitId] = useState(null)
  const [customCategory, setCustomCategory] = useState('')
  const [loggingHabit, setLoggingHabit] = useState(null)
  const [loggingValue, setLoggingValue] = useState('')

  const categoryOptions = [...new Set([...habitCategories, ...user.habits.map((habit) => habit.category).filter(Boolean)])]

  useEffect(() => {
    if (!selectedHabitId) return undefined
    const handleEscape = (event) => {
      if (event.key === 'Escape') setSelectedHabitId(null)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [selectedHabitId])

  const resetForm = () => {
    setForm({ id: uid(), name: '', category: 'Movement', measurementMode: 'binary', target: '', unit: 'minutes', icon: '💪', restDay: false, trackingType: 'boolean', targetValue: '', quickLog: false })
    setEditingId(null)
    setCustomCategory('')
    setShowForm(false)
  }

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'measurementMode' && {
        unit: value === 'minutes' ? 'minutes' : value === 'kms' ? 'kms' : 'count',
      }),
    }))
  }

  const saveHabit = () => {
    const cleanName = form.name.trim()
    if (!cleanName) {
      setToast('Add a habit name before saving.')
      return
    }

    const nextCategory = customCategory.trim() || form.category || 'Movement'
    const todayKey = todayValue()
    const normalizedHabit = {
      ...form,
      id: editingId || uid(),
      name: cleanName,
      category: nextCategory,
      target: form.measurementMode === 'binary' ? '' : Number(form.target) || '',
      trackingType: form.measurementMode === 'binary' ? 'boolean' : form.measurementMode === 'time' ? 'time' : 'numeric',
      targetValue: form.measurementMode === 'time' ? form.target || null : Number(form.target) || null,
      unit: form.measurementMode === 'minutes' ? 'minutes' : form.measurementMode === 'kms' ? 'kms' : 'count',
      restDay: !!form.restDay,
      logs: editingId ? user.habits.find((habit) => habit.id === editingId)?.logs || [] : [],
    }

    const habitToSave = editingId
      ? normalizedHabit
      : {
          ...normalizedHabit,
          logs: form.quickLog ? [{ id: uid(), date: todayKey, done: true, value: Number(form.target) || 1 }] : [],
        }

    updateUser({
      habits: editingId
        ? user.habits.map((habit) => (habit.id === editingId ? habitToSave : habit))
        : [...user.habits, habitToSave],
    })

    setToast(editingId ? 'Habit updated' : form.quickLog ? 'Habit saved and logged for today' : 'Habit saved')
    resetForm()
    setSelectedHabitId(habitToSave.id)
  }

  const editHabit = (habit) => {
    setEditingId(habit.id)
    setShowForm(true)
    setForm({
      ...habit,
      target: habit.target ?? '',
      unit: habit.unit || (habit.measurementMode === 'minutes' ? 'minutes' : habit.measurementMode === 'kms' ? 'kms' : 'count'),
      measurementMode: habit.trackingType === 'time' ? 'time' : habit.trackingType === 'numeric' ? 'numeric' : habit.measurementMode || 'binary',
    })
    setSelectedHabitId(habit.id)
  }

  const deleteHabit = (habitId) => {
    const target = user.habits.find((habit) => habit.id === habitId)
    if (!target) return

    updateUser({
      habits: user.habits.filter((habit) => habit.id !== habitId),
      logs: (user.logs || []).filter((entry) => entry.habitId !== habitId),
    })
    if (selectedHabitId === habitId) {
      setSelectedHabitId(user.habits.find((habit) => habit.id !== habitId)?.id ?? null)
    }
    if (editingId === habitId) resetForm()
    setToast(`Deleted ${target.name}`)
  }

  const toggleHabitDay = (habitId, dayKey) => {
    if (dayKey > todayValue()) return
    const habit = user.habits.find((item) => item.id === habitId)
    if (!habit) return

    const nextDone = !(habit.logs || []).find((entry) => entry.date === dayKey)?.done
    const nextLogs = (habit.logs || []).filter((entry) => entry.date !== dayKey)
    const updatedHabit = {
      ...habit,
      logs: [...nextLogs, { id: uid(), date: dayKey, done: nextDone, value: nextDone ? Number(habit.target) || 1 : 0 }],
    }

    updateUser({
      habits: user.habits.map((item) => (item.id === habitId ? updatedHabit : item)),
      logs: [
        {
          id: uid(),
          type: 'Habit',
          icon: '✅',
          title: habit.name,
          date: `${dayKey}T12:00:00`,
          summary: `${nextDone ? 'Completed' : 'Skipped'} • ${habit.category}`,
          habitId,
          archived: false,
        },
        ...((user.logs || []).filter((entry) => !(entry.habitId === habitId && entry.date.startsWith(dayKey)))),
      ],
    })

    setToast(nextDone ? 'Habit marked complete' : 'Habit marked incomplete')
  }

  const getLastNDays = (count) => {
    const dates = []
    for (let index = count - 1; index >= 0; index -= 1) {
      const date = new Date()
      date.setDate(date.getDate() - index)
      dates.push(date)
    }
    return dates
  }

  const buildTrendData = (habit) => {
    const days = getLastNDays(14)
    return days.map((date) => {
      const key = formatDayKey(date)
      const matched = (habit.logs || []).find((entry) => entry.date === key)
      const sleepScore = getSleepScoreForDay(user, date)
      return {
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: matched?.done ? 1 : 0,
        sleep: sleepScore === null ? null : sleepScore / 100,
      }
    })
  }

  const calendarMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const calendarOffset = (calendarMonthStart.getDay() + 6) % 7
  const calendarGridStart = new Date(calendarMonthStart)
  calendarGridStart.setDate(calendarGridStart.getDate() - calendarOffset)
  const contributionDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarGridStart)
    date.setDate(calendarGridStart.getDate() + index)
    return date
  })
  const visibleMonthLabels = contributionDays.reduce((months, date) => {
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    if (!months.some((entry) => entry.key === monthKey)) {
      months.push({
        key: monthKey,
        label: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date),
      })
    }
    return months
  }, [])
  const getDayHabitSummary = (date) => {
    const dayKey = formatDayKey(date)
    const performed = user.habits.filter((habit) => (habit.logs || []).find((entry) => entry.date === dayKey)?.done).length
    return { dayKey, performed, total: user.habits.length }
  }
  const selectedHabit = selectedHabitId ? (user.habits.find((habit) => habit.id === selectedHabitId) || null) : null

  const getHabitTodayEntry = (habit) => {
    const todayKey = todayValue()
    return (habit.logs || []).find((entry) => entry.date === todayKey) || null
  }

  const quickLogHabit = (habitId) => {
    const habit = user.habits.find((item) => item.id === habitId)
    if (!habit) return

    if ((habit.trackingType || (habit.measurementMode === 'binary' ? 'boolean' : 'numeric')) !== 'boolean') {
      setLoggingHabit(habit)
      setLoggingValue(getHabitTodayEntry(habit)?.value || habit.target || '')
      return
    }

    const todayKey = todayValue()
    const existing = getHabitTodayEntry(habit)
    const nextDone = !(existing?.done)
    const nextValue = nextDone ? Number(habit.target) || 1 : 0
    const nextLogs = (habit.logs || []).filter((entry) => entry.date !== todayKey)

    updateUser({
      habits: user.habits.map((item) => item.id === habitId ? {
        ...item,
        logs: [...nextLogs, { id: existing?.id || uid(), date: todayKey, done: nextDone, value: nextValue }],
      } : item),
      logs: [
        {
          id: uid(),
          type: 'Habit',
          icon: '✅',
          title: habit.name,
          date: `${todayKey}T12:00:00`,
          summary: `${nextDone ? 'Completed' : 'Skipped'} • ${habit.category}`,
          habitId,
          archived: false,
        },
        ...((user.logs || []).filter((entry) => !(entry.habitId === habitId && entry.date.startsWith(todayKey)))),
      ],
    })

    setToast(nextDone ? 'Habit completed for today' : 'Habit reset for today')
  }

  const saveMeasurementLog = () => {
    if (!loggingHabit) return
    const trackingType = loggingHabit.trackingType || 'numeric'
    const value = trackingType === 'time' ? loggingValue : Number(loggingValue)
    if (!loggingValue || (trackingType !== 'time' && !Number.isFinite(value))) return
    const dayKey = todayValue()
    const target = Number(loggingHabit.targetValue ?? loggingHabit.target) || 1
    const done = trackingType === 'time' ? true : Number(value) >= target
    const nextHabit = { ...loggingHabit, logs: [...(loggingHabit.logs || []).filter((entry) => entry.date !== dayKey), { id: uid(), date: dayKey, done, value }] }
    updateUser({ habits: user.habits.map((habit) => habit.id === loggingHabit.id ? nextHabit : habit) })
    setLoggingHabit(null)
    setToast('Habit logged for today')
  }

  const handleHabitCoverUpload = async (habitId, file) => {
    const dataUrl = await readFileAsDataUrl(file)
    if (!dataUrl) return
    updateUser({
      habits: user.habits.map((habit) => (habit.id === habitId ? { ...habit, coverImage: dataUrl } : habit)),
    })
  }

  return (
    <>
      <section className="overview-head">
        <div>
          <h2>Habit tracker</h2>
          <p>Track momentum with flexible metrics and streak-friendly structure.</p>
        </div>
        <button className="primary-button" onClick={() => setShowForm(true)}>
          <Plus size={15} />
          Add a new habit
        </button>
      </section>

      {showForm && <div className="modal-backdrop form-toggle-backdrop" onClick={resetForm}>
        <div className="panel-card form-popout habit-form-card" onClick={(event) => event.stopPropagation()}>
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">{editingId ? 'EDIT HABIT' : 'NEW HABIT'}</p>
            <h3>{editingId ? 'Refine your habit' : 'Add a new daily habit'}</h3>
          </div>
          {editingId && (
            <button className="ghost-button" onClick={resetForm}>
              <X size={15} /> Cancel
            </button>
          )}
        </div>

        <div className="field-grid">
          <label className="field-label">
            Habit Name
            <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Daily walk / Read 10 pages" />
          </label>
        </div>

        {!editingId && (
          <button
            type="button"
            className={`metric-quick-toggle ${form.quickLog ? 'done' : ''}`}
            onClick={() => setForm((current) => ({ ...current, quickLog: !current.quickLog }))}
          >
            {form.quickLog ? 'Logged for today' : 'Log today'}
          </button>
        )}

        <div className="field-grid two-up">
          <label className="field-label">
            Classification / Category
            <select value={customCategory ? '__custom__' : form.category} onChange={(event) => {
              if (event.target.value === '__custom__') {
                setCustomCategory('')
                return
              }
              setCustomCategory('')
              updateField('category', event.target.value)
            }}>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
              <option value="__custom__">Create custom classification…</option>
            </select>
          </label>

          {customCategory !== null && (
            <label className="field-label">
              Custom Classification
              <input value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} placeholder="Strength / Recovery / Nutrition" />
            </label>
          )}
        </div>

        <label className="field-label">
          Measurement Mode
          <select value={form.measurementMode} onChange={(event) => updateField('measurementMode', event.target.value)}>
            <option value="binary">Done / Not Done</option>
            <option value="minutes">Done / Not Done + Minutes</option>
            <option value="kms">Done / Not Done + Kms</option>
            <option value="numeric">Numeric measurement</option>
            <option value="time">Time of day</option>
          </select>
        </label>

          {(form.measurementMode !== 'binary') && (
          <div className="field-grid two-up">
            <label className="field-label">
              Target (Optional)
              <input type={form.measurementMode === 'time' ? 'time' : 'number'} min="0" value={form.target} onChange={(event) => updateField('target', event.target.value)} placeholder={form.measurementMode === 'minutes' ? '20' : '5'} />
            </label>

            <label className="field-label">
              Unit
              <input value={form.measurementMode === 'time' ? 'time_of_day' : form.measurementMode === 'minutes' ? 'minutes' : form.measurementMode === 'kms' ? 'kms' : 'count'} readOnly />
            </label>
          </div>
        )}

        <label className="checkbox-row">
          <input type="checkbox" checked={!!form.restDay} onChange={(event) => updateField('restDay', event.target.checked)} />
          <span>Rest day protection</span>
        </label>

        <div className="routine-actions-row">
          <button className="secondary-button" onClick={resetForm}>
            <X size={15} />
            Clear
          </button>
          <button className="primary-button" onClick={saveHabit}>
            <Save size={15} />
            {editingId ? 'Save habit' : 'Add habit'}
          </button>
        </div>
        </div>
      </div>}

      <section className="panel-card habit-overview-calendar">
        <div className="panel-heading compact">
          <div><p className="eyebrow">CONTRIBUTION GRID</p><h3>Habits performed</h3></div>
          <div className="habit-month-legend" aria-label="Visible habit months">
            {visibleMonthLabels.map((month) => <span key={month.key}>{month.label}</span>)}
          </div>
        </div>
        <div className="habit-calendar-weekdays" aria-hidden="true">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => <span key={`overview-weekday-${index}`}>{label}</span>)}</div>
        <div className="habit-overview-grid">
          {contributionDays.map((date) => {
            const summary = getDayHabitSummary(date)
            const isOutsideMonth = date.getMonth() !== calendarMonthStart.getMonth()
            const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
            return (
              <button key={`overview-${summary.dayKey}`} type="button" disabled={summary.dayKey > todayValue()} className={`habit-overview-cell ${summary.performed ? 'has-progress' : ''} ${isOutsideMonth ? 'outside-month' : ''}`} title={`${dateLabel}: ${summary.performed}/${summary.total} Habits performed`} aria-label={`${dateLabel}: ${summary.performed}/${summary.total} Habits performed`}>
                <strong>{dateLabel}</strong>
                <small>{summary.performed}/{summary.total} Habits performed</small>
              </button>
            )
          })}
        </div>
      </section>

      <div className="habit-grid">
        {user.habits.map((habit) => {
          const streak = getHabitStreak(habit)
          const isDoneToday = getHabitTodayEntry(habit)?.done

          return (
            <article key={habit.id} className="habit-micro-tile" onClick={() => setSelectedHabitId(habit.id)}>
              <span className="habit-mini-icon">{habit.icon || '💪'}</span>
              <div className="habit-mini-info">
                <strong>{habit.name}</strong>
                <span className="habit-mini-streak">🔥 {streak} Days</span>
              </div>
              <button
                type="button"
                className={`habit-mini-toggle ${isDoneToday ? 'done' : ''}`}
                onClick={(event) => {
                  event.stopPropagation()
                  quickLogHabit(habit.id)
                }}
                aria-label={isDoneToday ? `Mark ${habit.name} incomplete for today` : `Mark ${habit.name} complete for today`}
              >
                <span className="habit-mini-toggle-dot" />
              </button>
            </article>
          )
        })}
      </div>

      {selectedHabit && (
        <div className="modal-backdrop habit-detail-backdrop" onClick={() => setSelectedHabitId(null)}>
          <div className="panel-card detail-card modal-card habit-detail-modal" onClick={(event) => event.stopPropagation()}>
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">DETAIL VIEW</p>
              <h3>{selectedHabit.name}</h3>
            </div>
            <div className="habit-header-actions">
              <button className="ghost-button" onClick={() => editHabit(selectedHabit)}>
                <Pencil size={14} />
                Edit habit
              </button>
              <button className="icon-button subtle" onClick={() => setSelectedHabitId(null)} aria-label="Close habit detail">
                <X size={15} />
              </button>
            </div>
          </div>

          <label className="habit-cover-uploader">
            {selectedHabit.coverImage ? <img src={selectedHabit.coverImage} alt="" /> : <span>📷 Add a cover photo or icon</span>}
            <input type="file" accept="image/*" onChange={(event) => handleHabitCoverUpload(selectedHabit.id, event.target.files?.[0])} />
          </label>

          <div className="habit-stat-row">
            <div><small>MONTHLY %</small><strong>{getCurrentMonthCompletion(selectedHabit)}%</strong></div>
            <div><small>BEST STREAK</small><strong>🔥 {getBestHabitStreak(selectedHabit)} Days</strong></div>
            <div><small>TARGET FREQUENCY</small><strong>{selectedHabit.restDay ? 'Daily (Sundays off)' : 'Daily'}</strong></div>
          </div>

          <div className="mini-heatmap-card habit-30day-heatmap">
            <p className="eyebrow mini-heatmap-label">30-DAY HISTORY</p>
            <div className="mini-heatmap-grid">
              {getLastNDays(30).map((date) => {
                const key = formatDayKey(date)
                const done = (selectedHabit.logs || []).find((entry) => entry.date === key)?.done
                const accent = habitCategoryAccent(selectedHabit)
                return (
                  <span
                    key={`${selectedHabit.id}-30d-${key}`}
                    className="mini-heatmap-tile"
                    style={{ background: mixHexColors('#1E293B', accent.startsWith('var') ? '#00E5FF' : accent, done ? 1 : 0) }}
                    title={`${formatDateLabel(date)}: ${done ? 'Completed' : 'Not completed'}`}
                  />
                )
              })}
            </div>
          </div>

          <div className="detail-grid">
            <div>
              <h4>Historical completion logs</h4>
              <ul className="history-list">
                {(selectedHabit.logs || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8).map((entry) => (
                  <li key={entry.id}>
                    <span>{formatDateLabel(entry.date)}</span>
                    <strong>{entry.done ? 'Completed' : 'Skipped'}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4>Contribution grid</h4>
              <div className="habit-contribution-grid dark-grid">
                {contributionDays.map((date) => {
                  const key = formatDayKey(date)
                  const done = (selectedHabit.logs || []).find((entry) => entry.date === key)?.done
                  return <span key={`${selectedHabit.id}-${key}`} className={`contribution-box ${done ? 'filled' : ''}`} />
                })}
              </div>
            </div>
          </div>

          <div className="insight-chart-wrap">
            <h4>Habit completion vs. sleep quality</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={buildTrendData(selectedHabit)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 1]} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" name={selectedHabit.name} stroke="var(--chart-cyan)" strokeWidth={2} />
                <Line type="monotone" dataKey="sleep" name="Sleep quality" stroke="var(--chart-violet)" strokeWidth={2} strokeDasharray="6 6" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
          </div>
        </div>
      )}
      {loggingHabit && (
        <div className="modal-backdrop" onClick={() => setLoggingHabit(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">LOG TODAY</p>
            <h3>{loggingHabit.name}</h3>
            <label className="field-label">{loggingHabit.trackingType === 'time' ? 'Time' : `Value (${loggingHabit.unit || 'units'})`}
              <input type={loggingHabit.trackingType === 'time' ? 'time' : 'number'} value={loggingValue} onChange={(event) => setLoggingValue(event.target.value)} autoFocus />
            </label>
            <div className="routine-actions-row"><button className="ghost-button" onClick={() => setLoggingHabit(null)}>Cancel</button><button className="primary-button" onClick={saveMeasurementLog}><Save size={14} /> Save log</button></div>
          </div>
        </div>
      )}
    </>
  )
}

function FastingView({ user, updateUser, setToast }) {
  const fastingStages = [
    {
      key: 'fed', range: '0–4 hrs', label: 'Fed State', max: 4, color: '#f9a8d4',
      hormones: 'Ghrelin is generally quiet after eating; insulin rises, glucagon stays low, HGH is at baseline, and adrenaline/norepinephrine remain steady.',
      fuel: 'Exogenous glucose from the recent meal.', focus: 'Post-meal calm or lethargy as digestion takes priority.',
      events: 'Nutrients are being absorbed and stored as glycogen or fat. This is the normal fed baseline, not a failure state.',
      benefits: 'Supports replenishment and recovery, while helping you learn the difference between true hunger and routine appetite.',
    },
    {
      key: 'glycogen', range: '4–12 hrs', label: 'Glycogen Phase', max: 12, color: '#fbbf24',
      hormones: 'Ghrelin may pulse around habitual meal times; insulin trends down, glucagon rises, HGH begins to increase, and norepinephrine stays available.',
      fuel: 'Liver glycogen, with glucose still supporting much of the brain and muscle demand.', focus: 'Steady attention with occasional hunger waves that often pass.',
      events: 'The liver gradually releases stored glucose to keep blood sugar stable as the post-meal supply fades.',
      benefits: 'Builds routine consistency and improves metabolic flexibility without requiring an extreme fast.',
    },
    {
      key: 'switch', range: '12–24 hrs', label: 'Metabolic Switch & Ketosis', max: 24, color: '#5eead4',
      hormones: 'Ghrelin pulses can become less frequent; insulin is low, glucagon is elevated, HGH surges support lean tissue, and adrenaline/norepinephrine support alertness.',
      fuel: 'Fatty acids and ketones, especially BHB and acetoacetate, as glycogen availability falls.', focus: 'Many people report heightened focus; ketones and BDNF signaling may support alertness.',
      events: 'Glycogen depletion increases fat mobilization and ketone production. Inflammation may begin to ease, though responses vary by person.',
      benefits: 'Practices switching between carbohydrate and fat fuel, supporting weight-management habits and sustained mental clarity.',
    },
    {
      key: 'autophagy', range: '24–48 hrs', label: 'Deep Autophagy', max: 48, color: '#a78bfa',
      hormones: 'Ghrelin remains individual and wave-like; insulin stays low, glucagon high, HGH remains elevated, and catecholamines help preserve energy and alertness.',
      fuel: 'Predominantly fatty acids and ketones, with limited glucose made by gluconeogenesis.', focus: 'Focus can feel clear for some and depleted for others; sleep, hydration, and individual health matter.',
      events: 'Cellular recycling pathways including autophagy become more active in some tissues as nutrient signaling stays low. Human timing is not a fixed switch.',
      benefits: 'May extend the metabolic flexibility and cellular maintenance signals started in ketosis; evidence and timing vary widely.',
    },
    {
      key: 'immune', range: '48–72+ hrs', label: 'Immune Renewal', max: 72, color: '#00F0FF',
      hormones: 'Insulin remains low and glucagon high; HGH and norepinephrine help mobilize fuel, while hunger signals remain highly individual.',
      fuel: 'Fatty acids and ketones, with glucose conserved for tissues that require it.', focus: 'Alertness varies sharply; prolonged fasting should never be used to push through concerning symptoms.',
      events: 'Research on prolonged fasting suggests immune-cell and stem-cell signaling changes, but “renewal” is not guaranteed and human evidence remains limited.',
      benefits: 'Represents a research frontier rather than a required wellness milestone. Longer fasts need medical guidance, especially with medication or chronic illness.',
    },
  ]
  const presetOptions = [
    { label: '12:12', hours: 12, minutes: 12 },
    { label: '14:10', hours: 14, minutes: 10 },
    { label: '16:8', hours: 16, minutes: 8 },
    { label: '18:6', hours: 18, minutes: 6 },
    { label: '20:4', hours: 20, minutes: 4 },
    { label: '24h', hours: 24, minutes: 0 },
    { label: '36h', hours: 36, minutes: 0 },
  ]

  const buildPlan = () => {
    const start = new Date()
    const end = addMinutes(start, 12 * 60 + 12)
    return {
      start: toLocalDateTimeValue(start),
      end: toLocalDateTimeValue(end),
      type: 'standard',
      preset: '12:12',
      customHours: 12,
      customMinutes: 12,
      expectedEnd: toLocalDateTimeValue(end),
    }
  }

  const [form, setForm] = useState(buildPlan())
  const [activeFast, setActiveFast] = useState(() => user.activeFast || null)
  const [currentTick, setCurrentTick] = useState(new Date())
  const [selectedStageKey, setSelectedStageKey] = useState(null)
  const [startEditorOpen, setStartEditorOpen] = useState(false)
  const [startEditorValue, setStartEditorValue] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTick(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    updateUser({ activeFast })
  }, [activeFast])

  const updateForm = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value }

      const computeExpectedEnd = (draft) => {
        if (!draft.start) return draft.expectedEnd || current.start
        if (draft.type === 'standard') {
          const preset = presetOptions.find((option) => option.label === draft.preset) || presetOptions[0]
          return toLocalDateTimeValue(addMinutes(new Date(draft.start), preset.hours * 60 + preset.minutes))
        }

        const totalMinutes = (Number(draft.customHours) || 0) * 60 + (Number(draft.customMinutes) || 0)
        return toLocalDateTimeValue(addMinutes(new Date(draft.start), totalMinutes))
      }

      if (field === 'preset') {
        const preset = presetOptions.find((option) => option.label === value) || presetOptions[0]
        next.customHours = preset.hours
        next.customMinutes = preset.minutes
      }

      if (field === 'start' || field === 'customHours' || field === 'customMinutes' || field === 'type' || field === 'preset') {
        next.expectedEnd = computeExpectedEnd(next)
      }

      if (field === 'end' && next.start) {
        const startDate = new Date(next.start)
        const endDate = new Date(value)
        if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && endDate >= startDate) {
          next.expectedEnd = value
        }
      }

      return next
    })
  }

  const validateForm = () => {
    const startDate = new Date(form.start)
    const endDate = new Date(form.end)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setToast('Enter valid start and end times.')
      return false
    }
    if (startDate > new Date()) {
      setToast('Start date cannot be in the future.')
      return false
    }
    if (endDate < startDate) {
      setToast('End date cannot be before the start date.')
      return false
    }
    return true
  }

  const startFast = () => {
    if (!validateForm()) return
    const startDate = new Date(form.start)
    const endDate = new Date(form.end)
    const targetHours = form.type === 'standard'
      ? ((presetOptions.find((option) => option.label === form.preset)?.hours || 12) + ((presetOptions.find((option) => option.label === form.preset)?.minutes || 0) / 60))
      : (Number(form.customHours) || 0) + (Number(form.customMinutes) || 0) / 60
    const nextFast = {
      id: uid(),
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      targetHours: Math.max(targetHours, 0.25),
      type: form.type,
    }
    setActiveFast(nextFast)
    setToast('Fast started')
  }

  const endFast = () => {
    if (!activeFast) return
    const startDate = new Date(activeFast.start)
    const endDate = new Date()
    const completedHours = (endDate - startDate) / 3600000
    const completedSession = {
      id: activeFast.id,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      completedHours,
      hours: completedHours,
      type: activeFast.type,
    }

    updateUser({
      fastingSessions: [completedSession, ...(user.fastingSessions || [])],
      logs: [{
        id: uid(),
        type: 'Fasting',
        icon: '⏱️',
        title: 'Fasting session',
        date: endDate.toISOString(),
        summary: `${completedHours.toFixed(1)} hours • ${getStageLabel(startDate, endDate)}`,
        archived: false,
      }, ...(user.logs || [])],
      activeFast: null,
    })
    setActiveFast(null)
    setToast('Fast completed and logged')
  }

  const openStartEditor = () => {
    setStartEditorValue(activeFast ? toLocalDateTimeValue(new Date(activeFast.start)) : form.start)
    setStartEditorOpen(true)
  }

  const saveStartTime = () => {
    if (!activeFast) return
    const nextStart = new Date(startEditorValue)
    if (Number.isNaN(nextStart.getTime()) || nextStart > new Date()) {
      setToast('Start time must be a valid time in the past.')
      return
    }
    const nextEnd = addMinutes(nextStart, Number(activeFast.targetHours || 12) * 60)
    const nextFast = {
      ...activeFast,
      start: nextStart.toISOString(),
      end: nextEnd.toISOString(),
    }
    setActiveFast(nextFast)
    setForm((current) => ({ ...current, start: toLocalDateTimeValue(nextStart), end: toLocalDateTimeValue(nextEnd), expectedEnd: toLocalDateTimeValue(nextEnd) }))
    setStartEditorOpen(false)
    setToast('Fast start time updated')
  }

  const loadSession = (session) => {
    setForm({
      start: toLocalDateTimeValue(session.start),
      end: toLocalDateTimeValue(session.end),
      type: session.type || 'standard',
      preset: session.hours >= 24 ? '24h' : '12:12',
      customHours: Math.floor(Number(session.hours) || 12),
      customMinutes: Math.round(((Number(session.hours) || 12) % 1) * 60),
      expectedEnd: toLocalDateTimeValue(session.end || session.start),
    })
  }

  const totalElapsedHours = activeFast ? (currentTick - new Date(activeFast.start)) / 3600000 : 0
  const targetHours = activeFast ? Number(activeFast.targetHours) || 12 : 12
  const elapsedProgress = activeFast ? Math.min((totalElapsedHours / targetHours) * 100, 100) : 0
  const currentStage = activeFast ? getStageLabel(activeFast.start, currentTick) : 'FED'
  const gaugeAngle = (elapsedProgress / 100) * Math.PI * 2
  const gaugeMarkerX = 120 + 96 * Math.cos(gaugeAngle)
  const gaugeMarkerY = 120 + 96 * Math.sin(gaugeAngle)
  const fastingDayTotals = (user.fastingSessions || []).reduce((totals, session) => {
    const day = formatDayKey(session.start)
    totals[day] = (totals[day] || 0) + (Number(session.completedHours || session.hours) || 0)
    return totals
  }, {})
  const fastingCalendarStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const fastingCalendarDays = Array.from({ length: new Date(fastingCalendarStart.getFullYear(), fastingCalendarStart.getMonth() + 1, 0).getDate() }, (_, index) => new Date(fastingCalendarStart.getFullYear(), fastingCalendarStart.getMonth(), index + 1))
  const latestFastDay = Object.keys(fastingDayTotals).sort().pop()
  let fastingStreak = 0
  if (latestFastDay) {
    const streakCursor = new Date(`${latestFastDay}T12:00:00`)
    while (fastingDayTotals[formatDayKey(streakCursor)]) {
      fastingStreak += 1
      streakCursor.setDate(streakCursor.getDate() - 1)
    }
  }
  const activeStageIndex = Math.min(fastingStages.length - 1, fastingStages.findIndex((stage) => totalElapsedHours < stage.max) < 0 ? fastingStages.length - 1 : fastingStages.findIndex((stage) => totalElapsedHours < stage.max))
  const selectedStage = fastingStages.find((stage) => stage.key === selectedStageKey) || fastingStages[activeStageIndex]

  // Four fasting phases, each with a glow gradient the timer card morphs into as the fast progresses.
  const fastingPhases = [
    { key: 'anabolic', name: 'Anabolic', label: 'Blood Sugar Stabilizing', min: 0, max: 12, colorA: '#1E293B', colorB: '#3B82F6' },
    { key: 'ketosis', name: 'Ketosis', label: 'Fat Burning / Ketosis Activation', min: 12, max: 18, colorA: '#06B6D4', colorB: '#10B981' },
    { key: 'autophagy', name: 'Autophagy', label: 'Deep Cellular Repair', min: 18, max: 24, colorA: '#8B5CF6', colorB: '#A855F7' },
    { key: 'extended', name: 'Extended Cleanse', label: 'Deep Cleanse', min: 24, max: Infinity, colorA: '#F59E0B', colorB: '#FF5722' },
  ]
  const activePhase = fastingPhases.find((phase) => totalElapsedHours >= phase.min && totalElapsedHours < phase.max) || fastingPhases[0]

  return (
    <>
      <section className="overview-head">
        <div>
          <h2>Fasting tracker</h2>
          <p>Plan your next fast, see the stage in real time, and review your history.</p>
        </div>
      </section>

      <section className="fasting-summary-grid">
        <div className="fasting-streak-card">
          <span className="fasting-streak-flame" aria-hidden="true">🔥</span>
          <div><p className="eyebrow">CONSISTENCY</p><strong>{fastingStreak}-Day Streak</strong><small>Consecutive logged fasting days</small></div>
        </div>
        <div className="fasting-calendar-card">
          <div className="fasting-calendar-heading"><div><p className="eyebrow">FASTING CALENDAR</p><strong>{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(fastingCalendarStart)}</strong></div><small>Hours logged</small></div>
          <div className="fasting-calendar-grid">
            {fastingCalendarDays.map((date) => {
              const day = formatDayKey(date)
              const hours = fastingDayTotals[day] || 0
              return <span key={day} className={`fast-day-cell ${hours ? 'completed' : ''}`} title={`${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)}: ${hours ? `${hours.toFixed(1)}h logged` : 'No fast logged'}`}><b>{date.getDate()}</b>{hours ? <small>{hours.toFixed(0)}h</small> : null}</span>
            })}
          </div>
        </div>
      </section>

      <div className="fasting-layout">
        <div className="panel-card fasting-panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">FASTING PLAN</p>
              <h3>{activeFast ? 'Active fast' : 'Start a new fast'}</h3>
            </div>
          </div>

          <div className="fasting-datetime-row">
            <label className="field-label">
              Start Date & Time
              <input type="datetime-local" step="1" value={form.start} onChange={(event) => updateForm('start', event.target.value)} />
            </label>

            <label className="field-label">
              End Date & Time
              <input type="datetime-local" step="1" value={form.end} onChange={(event) => updateForm('end', event.target.value)} />
            </label>
          </div>

          {activeFast && (
            <button type="button" className="ghost-button start-time-button" onClick={openStartEditor}>
              <Pencil size={14} />
              Update Start Date &amp; Time
            </button>
          )}

          <div className="field-grid two-up">
            <label className="field-label">
              Fasting Type
              <select value={form.type} onChange={(event) => updateForm('type', event.target.value)}>
                <option value="standard">Standard Hours</option>
                <option value="custom">Custom Hours</option>
              </select>
            </label>

            <label className="field-label">
              Standard Hours
              <select value={form.preset} onChange={(event) => updateForm('preset', event.target.value)} disabled={form.type !== 'standard'}>
                {presetOptions.map((preset) => (
                  <option key={preset.label} value={preset.label}>{preset.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="field-grid two-up">
            <label className={`field-label fasting-field ${form.type === 'standard' ? 'inactive' : ''}`} aria-disabled={form.type === 'standard'}>
              Custom Hours
              <input
                type="number"
                min="0"
                max="72"
                value={form.customHours}
                disabled={form.type === 'standard'}
                onChange={(event) => updateForm('customHours', event.target.value)}
              />
            </label>
            <label className={`field-label fasting-field ${form.type === 'standard' ? 'inactive' : ''}`} aria-disabled={form.type === 'standard'}>
              Custom Minutes
              <input
                type="number"
                min="0"
                max="59"
                value={form.customMinutes}
                disabled={form.type === 'standard'}
                onChange={(event) => updateForm('customMinutes', event.target.value)}
              />
            </label>
          </div>

          <label className="field-label">
            Expected End
            <input type="datetime-local" step="1" value={form.expectedEnd} readOnly disabled={form.type === 'standard'} />
          </label>

          <div className="timer-shell" style={{ '--phase-color-a': activePhase.colorA, '--phase-color-b': activePhase.colorB }}>
            {activeFast && (
              <span className="phase-status-badge">🔥 Active Phase: {activePhase.name}</span>
            )}
            <div className="countdown-gauge" style={{ '--gauge-progress': `${elapsedProgress}%` }}>
              <svg viewBox="0 0 240 240" role="img" aria-label={`${elapsedProgress.toFixed(0)} percent of fast elapsed`}>
                <defs>
                  <linearGradient id="fasting-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#5eead4" />
                    <stop offset="55%" stopColor="#00F0FF" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <circle className="gauge-track" cx="120" cy="120" r="96" />
                <circle className="gauge-progress" cx="120" cy="120" r="96" pathLength="100" />
                <circle className="gauge-marker" cx={gaugeMarkerX} cy={gaugeMarkerY} r="6" />
              </svg>
              <div className="countdown-center">
                <small>Elapsed time ({elapsedProgress.toFixed(0)}%)</small>
                <strong>{activeFast ? formatDuration(totalElapsedHours * 3600000) : '00:00:00'}</strong>
                <span className="phase-badge">{currentStage}</span>
              </div>
            </div>

            <div className="countdown-meta">
              <div><small>STARTED FASTING</small><strong>{activeFast ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(activeFast.start)) : '--:--'}</strong></div>
              <div><small>FAST ENDING</small><strong>{activeFast ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(activeFast.end)) : '--:--'}</strong></div>
            </div>

            <button className="primary-button big-button countdown-action" onClick={activeFast ? endFast : startFast}>
              {activeFast ? 'End Fast' : 'Start Fast'}
            </button>
          </div>

          <div className="timeline-wrap">
            <p className="eyebrow">FASTING STAGES</p>
            <div className="fasting-timeline-line" style={{ '--timeline-progress': `${activeFast ? Math.min(100, (totalElapsedHours / 72) * 100) : 0}%` }} />
            <div className="stages-timeline">
              {fastingStages.map((stage, index) => (
                <button type="button" key={stage.key} className={`stage-item ${(selectedStage?.key === stage.key ? 'selected' : '')} ${activeFast && index === activeStageIndex ? 'live' : ''}`} onClick={() => setSelectedStageKey(stage.key)}>
                  <span className="stage-dot" style={{ background: stage.color }} />
                  <span><strong>{stage.label}</strong><small>{stage.range}</small></span>
                </button>
              ))}
            </div>
          </div>

          <article className="fasting-insight-card">
            <div className="insight-card-heading">
              <div><p className="eyebrow">{activeFast ? 'LIVE PHYSIOLOGY' : 'PHASE PREVIEW'}</p><h3>{selectedStage.label}</h3></div>
              <span className="phase-range">{selectedStage.range}</span>
            </div>
            <div className="insight-grid">
              <div><strong>Hormonal profile</strong><p>{selectedStage.hormones}</p></div>
              <div><strong>Primary fuel</strong><p>{selectedStage.fuel}</p></div>
              <div><strong>Mind & focus</strong><p>{selectedStage.focus}</p></div>
              <div><strong>Biological events</strong><p>{selectedStage.events}</p></div>
            </div>
            <div className="insight-benefit"><strong>Why it matters long term</strong><p>{selectedStage.benefits}</p></div>
          </article>
        </div>

        <div className="panel-card log-panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">FASTING HISTORY</p>
              <h3>Logged sessions</h3>
            </div>
          </div>

          <div className="log-list compact-list">
            {(user.fastingSessions || []).map((session) => (
              <div key={session.id} className="history-row">
                <div>
                  <strong>{formatDateLabel(session.start)}</strong>
                  <small>{session.completedHours ? `${Number(session.completedHours).toFixed(1)} hours` : `${Number(session.hours).toFixed(1)} hours`}</small>
                </div>
                <div className="row-actions">
                  <button className="icon-button subtle" onClick={() => loadSession(session)} aria-label="Edit fasting session">
                    <Pencil size={14} />
                  </button>
                  <button className="icon-button subtle" onClick={() => {
                    updateUser({ fastingSessions: (user.fastingSessions || []).filter((item) => item.id !== session.id) })
                    setToast('Fasting log deleted')
                  }} aria-label="Delete fasting session">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {startEditorOpen && (
          <div className="modal-backdrop" onClick={() => setStartEditorOpen(false)}>
            <div className="modal-card start-time-modal" onClick={(event) => event.stopPropagation()}>
              <p className="eyebrow">ACTIVE FAST</p>
              <h3>Update Start Date &amp; Time</h3>
              <p>Elapsed time, progress, phase, and projected ending will update from this timestamp.</p>
              <label className="field-label">
                Fast started
                <input type="datetime-local" step="1" value={startEditorValue} max={toLocalDateTimeValue(new Date())} onChange={(event) => setStartEditorValue(event.target.value)} autoFocus />
              </label>
              <div className="routine-actions-row">
                <button type="button" className="ghost-button" onClick={() => setStartEditorOpen(false)}>Cancel</button>
                <button type="button" className="primary-button" onClick={saveStartTime}><Save size={14} /> Update start</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function SessionDeletePrompt({ session, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <section className="panel-card delete-session-modal" onClick={(event) => event.stopPropagation()}>
        <p className="eyebrow">CONFIRMATION</p>
        <h3>Delete Workout Session?</h3>
        <p>Are you sure you want to delete &quot;{session.routineName}&quot; logged on {formatDateLabel(session.endedAt || session.startedAt)}? This action cannot be undone and will update your total workout volume and history stats.</p>
        <div className="routine-actions-row"><button className="ghost-button" onClick={onCancel}>Cancel</button><button className="delete-session-confirm" onClick={onConfirm}><Trash2 size={14} /> Confirm Delete</button></div>
      </section>
    </div>
  )
}

function WorkoutSessionEditor({ session, exerciseLibrary = exercisesSeed, onClose, onSave }) {
  const initialExercises = (session.exercises || []).map((exercise) => ({
    ...exercise,
    sets: Array.isArray(exercise.sets) ? exercise.sets.map((set) => ({ ...set })) : [],
  }))
  const [draft, setDraft] = useState({
    ...session,
    routineName: session.routineName || '',
    endedAt: session.endedAt || session.startedAt || new Date().toISOString(),
    durationInput: durationToInput(session.durationMs || (session.durationMinutes || 0) * 60000),
    exercises: initialExercises,
  })
  const [newExerciseId, setNewExerciseId] = useState(exerciseLibrary[0]?.id || '')

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) => index !== exerciseIndex ? exercise : {
        ...exercise,
        sets: exercise.sets.map((set, indexInExercise) => indexInExercise === setIndex ? { ...set, [field]: value } : set),
      }),
    }))
  }

  const updateExercises = (callback) => setDraft((current) => ({ ...current, exercises: callback(current.exercises) }))
  const totalReps = draft.exercises.reduce((total, exercise) => total + exercise.sets.reduce((sum, set) => sum + (Number(set.reps) || 0), 0), 0)
  const totalVolume = draft.exercises.reduce((total, exercise) => total + exercise.sets.reduce((sum, set) => sum + (Number(set.reps) || 0) * (Number(set.weight) || 0), 0), 0)
  const addExercise = () => {
    const exercise = exerciseLibrary.find((item) => item.id === newExerciseId)
    if (!exercise) return
    updateExercises((items) => [...items, {
      ...exercise,
      sets: [{ reps: exercise.trackingType === 'duration' ? 0 : 0, weight: '', duration: '00:00', distance: '', completed: false }],
    }])
  }

  const save = () => {
    const durationMs = inputToDurationMs(draft.durationInput)
    onSave({
      ...draft,
      durationMs,
      durationMinutes: Math.max(1, Math.round(durationMs / 60000)),
      endedAt: new Date(draft.endedAt).toISOString(),
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="panel-card workout-session-editor" onClick={(event) => event.stopPropagation()}>
        <div className="metric-modal-header">
          <div><p className="eyebrow">EDIT SESSION</p><h3>Update completed workout</h3></div>
          <button className="icon-button subtle" onClick={onClose} aria-label="Close session editor"><X size={15} /></button>
        </div>
        <div className="field-grid three-up">
          <label className="field-label">Routine name<input value={draft.routineName} onChange={(event) => setDraft({ ...draft, routineName: event.target.value })} /></label>
          <label className="field-label">Date & time<input type="datetime-local" value={draft.endedAt.slice(0, 16)} onChange={(event) => setDraft({ ...draft, endedAt: event.target.value })} /></label>
          <label className="field-label">Duration (MM:SS)<input value={draft.durationInput} onChange={(event) => setDraft({ ...draft, durationInput: event.target.value })} placeholder="45:30" /></label>
        </div>
        <div className="session-summary"><strong>{totalReps} reps</strong><strong>{totalVolume.toFixed(1)} kg volume</strong></div>
        <div className="session-editor-exercises">
          {draft.exercises.map((exercise, exerciseIndex) => (
            <div className="session-editor-exercise" key={`${exercise.id || exerciseIndex}`}>
              <div className="session-editor-exercise-header">
                <strong>{exercise.name}</strong>
                <div>
                  <button className="icon-button subtle" onClick={() => updateExercises((items) => items.filter((_, index) => index !== exerciseIndex))} aria-label="Remove exercise"><Trash2 size={13} /></button>
                  <button className="icon-button subtle" disabled={exerciseIndex === 0} onClick={() => updateExercises((items) => { const next = [...items]; [next[exerciseIndex - 1], next[exerciseIndex]] = [next[exerciseIndex], next[exerciseIndex - 1]]; return next })} aria-label="Move exercise up"><ChevronLeft size={13} /></button>
                  <button className="icon-button subtle" disabled={exerciseIndex === draft.exercises.length - 1} onClick={() => updateExercises((items) => { const next = [...items]; [next[exerciseIndex], next[exerciseIndex + 1]] = [next[exerciseIndex + 1], next[exerciseIndex]]; return next })} aria-label="Move exercise down"><ChevronRight size={13} /></button>
                </div>
              </div>
              {exercise.sets.map((set, setIndex) => (
                <div className={`session-set-row ${set.completed ? 'completed' : ''}`} key={setIndex}>
                  <span>Set {setIndex + 1}</span>
                  {exercise.trackingType === 'duration' ? <><input value={set.duration || ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'duration', event.target.value)} placeholder="MM:SS" /><input value={set.distance || ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'distance', event.target.value)} placeholder="km" /></> : <><input type="number" value={set.reps ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'reps', event.target.value)} placeholder="reps" /><input type="number" value={set.weight ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'weight', event.target.value)} placeholder="kg" /></>}
                  <button className={`exercise-complete-toggle ${set.completed ? 'done' : ''}`} onClick={() => updateSet(exerciseIndex, setIndex, 'completed', !set.completed)}>{set.completed ? 'Done' : 'Not Done'}</button>
                  <button className="icon-button subtle" onClick={() => updateExercises((items) => items.map((item, index) => index !== exerciseIndex ? item : { ...item, sets: item.sets.filter((_, indexInExercise) => indexInExercise !== setIndex) }))} aria-label="Remove set"><Trash2 size={13} /></button>
                </div>
              ))}
              <button className="secondary-button" onClick={() => updateExercises((items) => items.map((item, index) => index !== exerciseIndex ? item : { ...item, sets: [...item.sets, { reps: 0, weight: '', duration: '', distance: '', completed: false }] }))}><Plus size={13} /> Add set</button>
            </div>
          ))}
        </div>
        <div className="session-add-exercise">
          <select value={newExerciseId} onChange={(event) => setNewExerciseId(event.target.value)}>
            {exerciseLibrary.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
          </select>
          <button className="secondary-button" onClick={addExercise}><Plus size={13} /> Add exercise</button>
        </div>
        <div className="routine-actions-row"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={save}><Save size={14} /> Save session</button></div>
      </section>
    </div>
  )
}

const ACTIVITY_CATEGORIES = [
  { key: 'running', label: 'Running / Trail', color: '#FF5722', emoji: '🏃' },
  { key: 'cycling', label: 'Cycling', color: '#FFC107', emoji: '🚴' },
  { key: 'swimming', label: 'Swimming', color: '#00BCD4', emoji: '🏊' },
  { key: 'strength', label: 'Strength & Sports', color: '#9C27B0', emoji: '🏋️' },
]

const ACTIVITY_COVER_PRESETS = [
  'linear-gradient(135deg, #FF5722, #FF9800)',
  'linear-gradient(135deg, #FFC107, #FFEB3B)',
  'linear-gradient(135deg, #00BCD4, #26C6DA)',
  'linear-gradient(135deg, #9C27B0, #E040FB)',
  'linear-gradient(135deg, #00F0FF, #00B8CC)',
  'linear-gradient(135deg, #10B981, #00FF66)',
]

const getActivityCategory = (key) => ACTIVITY_CATEGORIES.find((category) => category.key === key) || ACTIVITY_CATEGORIES[3]

const emptyActivityForm = () => ({
  id: null,
  logId: null,
  routineName: '',
  category: 'strength',
  endedAt: toLocalDateTimeValue(new Date()),
  durationMinutes: '',
  distanceKm: '',
  calories: '',
  avgHeartRate: '',
  notes: '',
  coverImage: '',
  coverPreset: 0,
})

function SportsHubView({ user, updateUser, setToast }) {
  const sessions = user.workoutSessions || []
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyActivityForm())
  const [deleteTarget, setDeleteTarget] = useState(null)
  const coverInputRef = useRef(null)

  const openLogModal = () => {
    setForm(emptyActivityForm())
    setModalOpen(true)
  }

  const openEditModal = (session) => {
    setForm({
      id: session.id,
      logId: session.logId || null,
      routineName: session.routineName || '',
      category: session.category || 'strength',
      endedAt: toLocalDateTimeValue(new Date(session.endedAt || Date.now())),
      durationMinutes: session.durationMinutes || '',
      distanceKm: session.distanceKm || '',
      calories: session.calories || '',
      avgHeartRate: session.avgHeartRate || '',
      notes: session.notes || '',
      coverImage: session.coverImage || '',
      coverPreset: session.coverPreset || 0,
    })
    setModalOpen(true)
  }

  const handleCoverPick = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setToast('Please choose an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setToast('Image is too large (max 2MB).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setForm((current) => ({ ...current, coverImage: String(reader.result || '') }))
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    const name = form.routineName.trim()
    if (!name) {
      setToast('Give this activity a name.')
      return
    }

    const endedAt = new Date(form.endedAt).toISOString()
    const durationMinutes = Math.max(1, Number(form.durationMinutes) || 0)
    const session = {
      id: form.id || uid(),
      logId: form.logId || uid(),
      routineId: null,
      routineName: name,
      category: form.category,
      startedAt: endedAt,
      endedAt,
      durationMinutes,
      durationMs: durationMinutes * 60000,
      distanceKm: Number(form.distanceKm) || 0,
      calories: Number(form.calories) || 0,
      avgHeartRate: Number(form.avgHeartRate) || 0,
      notes: form.notes.trim(),
      coverImage: form.coverImage,
      coverPreset: form.coverPreset,
      exercises: sessions.find((item) => item.id === form.id)?.exercises || [],
    }

    const isEdit = sessions.some((item) => item.id === session.id)
    const nextSessions = isEdit
      ? sessions.map((item) => (item.id === session.id ? session : item))
      : [session, ...sessions]

    const category = getActivityCategory(session.category)
    const logEntry = {
      id: session.logId,
      type: 'Workout',
      icon: category.emoji,
      title: session.routineName,
      date: session.endedAt,
      summary: `${session.durationMinutes} min • ${category.label}`,
      archived: false,
    }
    const nextLogs = isEdit
      ? (user.logs || []).map((entry) => (entry.id === session.logId ? logEntry : entry))
      : [logEntry, ...(user.logs || [])]

    updateUser({ workoutSessions: nextSessions, logs: nextLogs })
    setModalOpen(false)
    setToast(isEdit ? 'Activity updated' : 'Activity logged')
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    updateUser({
      workoutSessions: sessions.filter((item) => item.id !== deleteTarget.id),
      logs: (user.logs || []).filter((entry) => entry.id !== deleteTarget.logId),
    })
    setDeleteTarget(null)
    setToast('Activity removed')
  }

  return (
    <>
      <section className="overview-head">
        <div>
          <h2>Sports & workouts</h2>
          <p>Every session, one visual feed.</p>
        </div>
        <button className="primary-button" onClick={openLogModal}>
          <Plus size={15} />
          Log activity
        </button>
      </section>

      <div className="activity-feed">
        {!sessions.length && <p className="empty-state">No activities logged yet. Tap "Log activity" to add your first session.</p>}
        {sessions.map((session) => {
          const category = getActivityCategory(session.category)
          const distanceKm = Number(session.distanceKm) || 0
          const durationMinutes = Number(session.durationMinutes) || Math.max(1, Math.round((session.durationMs || 0) / 60000))
          const paceLabel = distanceKm > 0 ? `${formatPace(durationMinutes / distanceKm)}/km` : null

          return (
            <article key={session.id} className="activity-card panel-card">
              <div
                className="activity-cover"
                style={session.coverImage ? { backgroundImage: `url(${session.coverImage})` } : { background: ACTIVITY_COVER_PRESETS[session.coverPreset % ACTIVITY_COVER_PRESETS.length] || ACTIVITY_COVER_PRESETS[0] }}
              >
                <span className="activity-badge" style={{ background: category.color }}>{category.emoji} {category.label}</span>
              </div>
              <div className="activity-body">
                <div className="activity-header-row">
                  <div>
                    <strong>{session.routineName}</strong>
                    <small>{formatDateLabel(session.endedAt || session.startedAt)}</small>
                  </div>
                  <div className="activity-actions">
                    <button className="icon-button subtle" onClick={() => openEditModal(session)} aria-label="Edit activity"><Pencil size={13} /></button>
                    <button className="icon-button subtle delete-session-button" onClick={() => setDeleteTarget(session)} aria-label="Delete activity"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="activity-stat-row">
                  <span><strong>{durationMinutes}</strong>min</span>
                  {distanceKm > 0 && <span><strong>{distanceKm}</strong>km</span>}
                  {paceLabel && <span><strong>{paceLabel}</strong>pace</span>}
                  {session.calories > 0 && <span><strong>{session.calories}</strong>kcal</span>}
                  {session.avgHeartRate > 0 && <span><strong>{session.avgHeartRate}</strong>bpm avg</span>}
                </div>
                {session.notes && <p className="activity-notes">{session.notes}</p>}
              </div>
            </article>
          )
        })}
      </div>

      {modalOpen && (
        <div className="modal-backdrop metric-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="metric-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="metric-modal-header">
              <div>
                <p className="eyebrow">{form.id ? 'EDIT ACTIVITY' : 'LOG ACTIVITY'}</p>
                <h3>{form.id ? 'Update session' : 'New session'}</h3>
              </div>
              <button className="icon-button subtle" onClick={() => setModalOpen(false)} aria-label="Close activity form"><X size={15} /></button>
            </div>

            <div className="metric-form-grid">
              <label className="field-label">
                Activity name
                <input value={form.routineName} onChange={(event) => setForm({ ...form, routineName: event.target.value })} placeholder="Sunday trail run" />
              </label>

              <label className="field-label">
                Category
                <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                  {ACTIVITY_CATEGORIES.map((category) => (
                    <option key={category.key} value={category.key}>{category.emoji} {category.label}</option>
                  ))}
                </select>
              </label>

              <label className="field-label">
                Date & time
                <input type="datetime-local" value={form.endedAt} onChange={(event) => setForm({ ...form, endedAt: event.target.value })} />
              </label>

              <label className="field-label">
                Duration (minutes)
                <input type="number" min="1" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} />
              </label>

              <label className="field-label">
                Distance (km)
                <input type="number" min="0" step="0.01" value={form.distanceKm} onChange={(event) => setForm({ ...form, distanceKm: event.target.value })} />
              </label>

              <label className="field-label">
                Calories
                <input type="number" min="0" value={form.calories} onChange={(event) => setForm({ ...form, calories: event.target.value })} />
              </label>

              <label className="field-label">
                Avg heart rate (bpm)
                <input type="number" min="0" value={form.avgHeartRate} onChange={(event) => setForm({ ...form, avgHeartRate: event.target.value })} />
              </label>

              <label className="field-label">
                Notes / reflection
                <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="How did it feel?" />
              </label>

              <div className="field-label">
                Cover image
                <div className="color-grid">
                  {ACTIVITY_COVER_PRESETS.map((preset, index) => (
                    <button
                      type="button"
                      key={preset}
                      className={`color-dot ${!form.coverImage && form.coverPreset === index ? 'selected' : ''}`}
                      style={{ background: preset }}
                      onClick={() => setForm({ ...form, coverPreset: index, coverImage: '' })}
                      aria-label={`Cover preset ${index + 1}`}
                    />
                  ))}
                </div>
                <div className="avatar-upload-row">
                  <button type="button" className="secondary-button" onClick={() => coverInputRef.current?.click()}>Upload photo</button>
                  {form.coverImage && (
                    <button type="button" className="ghost-button" onClick={() => setForm({ ...form, coverImage: '' })}>Remove photo</button>
                  )}
                  <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={handleCoverPick} />
                </div>
              </div>
            </div>

            <div className="routine-actions-row">
              <button className="secondary-button" onClick={() => setModalOpen(false)}><X size={15} />Cancel</button>
              <button className="primary-button" onClick={handleSave}><Save size={15} />Save activity</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">DELETE ACTIVITY</p>
            <h3>Remove {deleteTarget.routineName}?</h3>
            <p>This deletes the activity card and its log entry.</p>
            <div className="routine-actions-row">
              <button className="secondary-button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="primary-button" onClick={confirmDelete}>Confirm delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function LogHistoryView({ user, updateUser, setToast }) {
  const [filter, setFilter] = useState('All')
  const [editingSession, setEditingSession] = useState(null)
  const [deletingSession, setDeletingSession] = useState(null)

  const getHabitLogEntries = () =>
    (user.habits || []).flatMap((habit) =>
      (habit.logs || []).map((entry) => ({
        id: `habit-${habit.id}-${entry.date}`,
        type: 'Habit',
        icon: '✅',
        title: habit.name,
        date: `${entry.date}T12:00:00`,
        summary: `${entry.done ? 'Completed' : 'Skipped'} • ${habit.category}`,
        habitId: habit.id,
      })),
    )

  const getGratefulLogEntries = () =>
    (user.notes || []).map((note) => {
      const noteDate = normalizeNoteDate(note)
      const text = (note.text || '').trim()
      return {
        id: `note-${note.id}`,
        type: 'Grateful',
        icon: '💛',
        title: note.title || 'Gratitude note',
        date: noteDate,
        summary: text ? (text.length > 100 ? `${text.slice(0, 100)}…` : text) : 'Reflection logged',
        noteId: note.id,
      }
    })

  const workoutLogs = (user.workoutSessions || []).map((session) => ({
    id: `session-${session.id}`,
    type: 'Workout',
    icon: user.routines.find((routine) => routine.id === session.routineId)?.exerciseEmoji || user.exerciseEmoji || '🏋️',
    title: session.routineName,
    date: session.endedAt || session.startedAt,
    summary: `${Math.max(1, Math.round((session.durationMinutes || session.durationMs / 60000) || 1))} min • ${session.routineName}`,
    sessionId: session.id,
  }))

  const allLogs = [
    ...(user.logs || []).filter((entry) => entry.type !== 'Workout'),
    ...workoutLogs,
    ...getHabitLogEntries(),
    ...getGratefulLogEntries(),
    ...((user.fastingSessions || []).map((session) => ({
      id: `fast-${session.id}`,
      type: 'Fasting',
      icon: '⏱️',
      title: 'Fasting session',
      date: session.end || session.start,
      summary: `${(Number(session.completedHours) || Number(session.hours) || 0).toFixed(1)} hours`,
      archived: false,
    }))),
  ].filter((entry) => filter === 'All' || entry.type === filter).sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <>
      <section className="overview-head">
        <div>
          <h2>Log history</h2>
          <p>Review the patterns behind your recent decisions and momentum.</p>
        </div>
        <div className="filter-pills">
          {['All', 'Fasting', 'Habit', 'Workout', 'Grateful'].map((value) => (
            <button key={value} className={filter === value ? 'filter-pill active' : 'filter-pill'} onClick={() => setFilter(value)}>
              {value}
            </button>
          ))}
        </div>
      </section>

      <div className="history-listing">
        {allLogs.map((entry) => (
          <article key={entry.id} className="log-item">
            <div className="log-header">
              <div className="log-type">
                {entry.type !== 'Workout' && <span>{entry.icon}</span>}
                <div>
                  <strong>{entry.title || entry.type}</strong>
                  <small>{entry.type}</small>
                </div>
              </div>
              <div className="log-actions">
                <button className="icon-button subtle" onClick={() => {
                  if (entry.type === 'Grateful') {
                    setToast('Edit this note from the Grateful tab')
                    return
                  }
                  if (entry.type === 'Workout' && entry.sessionId) {
                    setEditingSession((user.workoutSessions || []).find((session) => session.id === entry.sessionId) || null)
                    return
                  }
                  setToast('Edit action ready for this log entry')
                }} aria-label="Edit log entry">
                  <Pencil size={14} />
                </button>
                <button className="icon-button subtle" onClick={() => {
                  if (entry.type === 'Grateful') {
                    updateUser({ notes: (user.notes || []).filter((note) => note.id !== entry.noteId) })
                    setToast('Grateful note deleted')
                    return
                  }
                  if (entry.type === 'Workout' && entry.sessionId) {
                    setDeletingSession((user.workoutSessions || []).find((session) => session.id === entry.sessionId) || null)
                    return
                  }
                  updateUser({
                    logs: (user.logs || []).filter((item) => item.id !== entry.id),
                    fastingSessions: (user.fastingSessions || []).filter((item) => `fast-${item.id}` !== entry.id),
                  })
                  setToast('Log entry deleted')
                }} aria-label="Delete log entry">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="log-meta-row">
              <span>{formatDateLabel(entry.date)}</span>
              <span>{entry.summary}</span>
            </div>
          </article>
        ))}
      </div>
      {editingSession && (
        <WorkoutSessionEditor
          session={editingSession}
          exerciseLibrary={user.exerciseLibrary?.length ? user.exerciseLibrary : exercisesSeed}
          onClose={() => setEditingSession(null)}
          onSave={(nextSession) => {
            updateUser({
              workoutSessions: (user.workoutSessions || []).map((session) => session.id === nextSession.id ? nextSession : session),
              logs: (user.logs || []).map((entry) => entry.id === nextSession.logId
                ? { ...entry, title: nextSession.routineName, date: nextSession.endedAt, summary: `${Math.round(nextSession.durationMs / 60000)} min • ${nextSession.routineName}` }
                : entry),
            })
            setEditingSession(null)
            setToast('Workout session updated')
          }}
        />
      )}
      {deletingSession && <SessionDeletePrompt session={deletingSession} onCancel={() => setDeletingSession(null)} onConfirm={() => {
        updateUser({
          workoutSessions: (user.workoutSessions || []).filter((session) => session.id !== deletingSession.id),
          logs: (user.logs || []).filter((entry) => entry.id !== deletingSession.logId && !(entry.type === 'Workout' && entry.title === deletingSession.routineName && entry.date === deletingSession.endedAt)),
        })
        setDeletingSession(null)
        setToast('Workout session deleted')
      }} />}
    </>
  )
}

function MyLifeView({ user, updateUser, setToast }) {
  const [selectedDate, setSelectedDate] = useState(todayValue())
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [reflection, setReflection] = useState('')
  const metrics = user.healthMetrics || []
  const selectedKey = selectedDate
  const selectedMetrics = metrics.flatMap((metric) => (metric.entries || []).filter((entry) => formatDayKey(entry.date) === selectedKey).map((entry) => ({ ...entry, metric })))
  const selectedHabits = (user.habits || []).filter((habit) => (habit.logs || []).some((entry) => entry.date === selectedKey && entry.done))
  const selectedWorkouts = (user.workoutSessions || []).filter((session) => formatDayKey(session.endedAt || session.startedAt) === selectedKey)
  const selectedNotes = (user.notes || []).filter((note) => formatDayKey(normalizeNoteDate(note)) === selectedKey)
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const gridStart = new Date(monthStart)
  gridStart.setDate(1 - ((monthStart.getDay() + 6) % 7))
  const monthDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })
  const hasActivity = (date) => getActivityDayScore(user, date, 'all') > 0 || [
    ...(user.workoutSessions || []).map((session) => formatDayKey(session.endedAt || session.startedAt)),
    ...(user.notes || []).map((note) => formatDayKey(normalizeNoteDate(note))),
  ].includes(formatDayKey(date))
  const saveReflection = () => {
    const text = reflection.trim()
    if (!text) return
    updateUser({ notes: [{ id: uid(), title: 'Daily reflection', text, date: `${selectedKey}T12:00:00` }, ...(user.notes || [])] })
    setReflection('')
    setToast('Daily reflection saved')
  }

  return (
    <>
      <section className="overview-head">
        <div>
          <h2>My Life</h2>
          <p>Master calendar, daily reflections, and the moments that shaped your week.</p>
        </div>
      </section>
      <div className="my-life-layout">
        <section className="panel-card my-life-calendar">
          <div className="calendar-period-heading">
            <button className="icon-button subtle" onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
            <h3>{monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <button className="icon-button subtle" onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
          </div>
          <div className="weekday-row">{['M', 'T', 'W', 'Th', 'F', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
          <div className="gratitude-calendar-grid">
            {monthDays.map((date) => {
              const key = formatDayKey(date)
              return <button key={key} className={`calendar-day ${key === selectedKey ? 'selected' : ''} ${date.getMonth() !== monthDate.getMonth() ? 'outside-month' : ''} ${hasActivity(date) ? 'has-entry' : ''}`} onClick={() => setSelectedDate(key)}><span className="calendar-month">{date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span><strong>{date.getDate()}</strong>{hasActivity(date) && <i className="calendar-entry-dot" />}</button>
            })}
          </div>
        </section>

        <section className="panel-card my-life-day">
          <p className="eyebrow">A SNAPSHOT OF MY LIFE</p>
          <h3>{formatDateLabel(`${selectedKey}T00:00:00`)}</h3>
          <div className="my-life-stat-strip"><span><strong>{selectedMetrics.length}</strong> metrics</span><span><strong>{selectedHabits.length}</strong> habits</span><span><strong>{selectedWorkouts.length}</strong> workouts</span><span><strong>{selectedNotes.length}</strong> notes</span></div>
          <div className="my-life-timeline">
            {selectedMetrics.map(({ metric, value, id }) => <div className="my-life-entry" key={`metric-${id}`}><span className="metric-dot" style={{ background: metric.color }} /><div><strong>{metric.name}</strong><p>{metric.measurementType === 'boolean' ? (value ? 'Completed' : 'Not completed') : `${value} ${metric.unit || ''}`}</p></div></div>)}
            {selectedHabits.map((habit) => <div className="my-life-entry" key={`habit-${habit.id}`}><span className="my-life-entry-icon">✓</span><div><strong>{habit.name}</strong><p>Habit completed</p></div></div>)}
            {selectedWorkouts.map((session) => <div className="my-life-entry" key={`workout-${session.id}`}><span className="my-life-entry-icon">🏋</span><div><strong>{session.routineName}</strong><p>{session.durationMinutes || Math.round((session.durationMs || 0) / 60000)} min {session.distanceKm ? `• ${session.distanceKm} km` : ''}</p></div></div>)}
            {selectedNotes.map((note) => <div className="my-life-entry" key={`note-${note.id}`}><span className="my-life-entry-icon">✦</span><div><strong>{note.title || 'Daily reflection'}</strong><p>{note.text}</p></div></div>)}
            {!selectedMetrics.length && !selectedHabits.length && !selectedWorkouts.length && !selectedNotes.length && <p className="empty-state">Nothing logged for this day yet.</p>}
          </div>
          <div className="my-life-reflection">
            <label className="field-label">Add daily reflection<textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="What mattered today?" rows="3" /></label>
            <button className="primary-button" onClick={saveReflection}><Save size={15} /> Save reflection</button>
          </div>
        </section>
      </div>
    </>
  )
}

function GratefulView({ user, updateUser, setToast }) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [date, setDate] = useState(todayValue())
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5))
  const [editingId, setEditingId] = useState(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [calendarView, setCalendarView] = useState('month')
  const [selectedDate, setSelectedDate] = useState(todayValue())
  const [readerNoteId, setReaderNoteId] = useState(null)

  const sortedNotes = [...(user.notes || [])].sort((a, b) => new Date(normalizeNoteDate(b)) - new Date(normalizeNoteDate(a)))
  const notesByDate = sortedNotes.reduce((accumulator, note) => {
    const key = formatDayKey(normalizeNoteDate(note))
    accumulator[key] = [...(accumulator[key] || []), note]
    return accumulator
  }, {})

  const selectedDateObj = new Date(`${selectedDate}T00:00:00`)
  const selectedMonthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(selectedDateObj)

  const resetForm = () => {
    setTitle('')
    setText('')
    setDate(todayValue())
    setTime(new Date().toTimeString().slice(0, 5))
    setEditingId(null)
    setComposerOpen(false)
  }

  const openComposer = (note = null) => {
    if (note) {
      setEditingId(note.id)
      setTitle(note.title)
      setText(note.text)
      const noteDate = new Date(normalizeNoteDate(note))
      setDate(todayValue(noteDate))
      setTime(noteDate.toTimeString().slice(0, 5))
    } else {
      setEditingId(null)
      setTitle('')
      setText('')
      setDate(selectedDate)
      setTime(new Date().toTimeString().slice(0, 5))
    }
    setComposerOpen(true)
  }

  const saveNote = () => {
    const cleanTitle = title.trim() || 'Untitled gratitude note'
    const cleanText = text.trim()
    if (!cleanText) {
      setToast('Write a gratitude note before saving.')
      return
    }

    const nextDate = date || todayValue()
    const nextNote = {
      id: editingId || uid(),
      title: cleanTitle,
      text: cleanText,
      date: `${nextDate}T${time || '09:00'}:00`,
    }

    updateUser({
      notes: editingId ? user.notes.map((note) => (note.id === editingId ? nextNote : note)) : [nextNote, ...user.notes],
    })

    setSelectedDate(nextDate)
    setToast(editingId ? 'Note updated' : 'Note saved')
    resetForm()
  }

  const deleteNote = (noteId) => {
    updateUser({ notes: user.notes.filter((note) => note.id !== noteId) })
    if (editingId === noteId) resetForm()
    if (readerNoteId === noteId) setReaderNoteId(null)
    setToast('Note deleted')
  }

  const editNote = (note) => {
    openComposer(note)
  }

  const monthGrid = (() => {
    const year = selectedDateObj.getFullYear()
    const month = selectedDateObj.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    const startOffset = (firstOfMonth.getDay() + 6) % 7
    const gridStart = new Date(firstOfMonth)
    gridStart.setDate(firstOfMonth.getDate() - startOffset)
    const days = []
    for (let index = 0; index < 42; index += 1) {
      const next = new Date(gridStart)
      next.setDate(gridStart.getDate() + index)
      days.push(next)
    }
    return days
  })()

  const getFilteredNotes = () => {
    if (calendarView === 'day') {
      return notesByDate[selectedDate] || []
    }
    if (calendarView === 'month') {
      return sortedNotes.filter((note) => {
        const noteDate = new Date(normalizeNoteDate(note))
        return noteDate.getMonth() === selectedDateObj.getMonth() && noteDate.getFullYear() === selectedDateObj.getFullYear()
      })
    }
    return sortedNotes.filter((note) => new Date(normalizeNoteDate(note)).getFullYear() === selectedDateObj.getFullYear())
  }

  const filteredNotes = getFilteredNotes()
  const activeReaderNote = readerNoteId ? filteredNotes.find((note) => note.id === readerNoteId) || null : null

  const readScopeLabel = () => {
    if (calendarView === 'day') return `Read Entries for ${formatDateLabel(new Date(`${selectedDate}T00:00:00`))}`
    if (calendarView === 'month') return `Read Entries for ${selectedMonthLabel}`
    return `Read Entries for ${selectedDateObj.getFullYear()}`
  }

  const yearMonths = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthDate = new Date(selectedDateObj.getFullYear(), monthIndex, 1)
    return {
      label: monthDate.toLocaleDateString('en-US', { month: 'short' }),
      value: monthDate.getMonth(),
      hasEntries: sortedNotes.some((note) => {
        const noteDate = new Date(normalizeNoteDate(note))
        return noteDate.getMonth() === monthIndex && noteDate.getFullYear() === selectedDateObj.getFullYear()
      }),
    }
  })

  const moveCalendar = (direction) => {
    const nextDate = new Date(selectedDateObj)
    if (calendarView === 'day') {
      nextDate.setDate(nextDate.getDate() + direction)
    } else if (calendarView === 'month') {
      nextDate.setDate(1)
      nextDate.setMonth(nextDate.getMonth() + direction)
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + direction)
    }
    setSelectedDate(todayValue(nextDate))
    setReaderNoteId(null)
  }

  return (
    <>
      <section className="overview-head">
        <div>
          <h2>Grateful meditation</h2>
          <p>Capture the moments, people, and progress you want to carry into the day.</p>
        </div>
        <button className="primary-button" onClick={() => openComposer()}>
          <Sparkles size={15} />
          + Log Gratitude
        </button>
      </section>

      {composerOpen && (
        <div className="panel-card gratitude-form">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">{editingId ? 'EDIT NOTE' : 'NEW NOTE'}</p>
              <h3>{editingId ? 'Refine your reflection' : 'Write a gratitude check-in'}</h3>
            </div>
            {editingId && (
              <button className="ghost-button" onClick={resetForm}>
                <X size={16} />
                Cancel
              </button>
            )}
          </div>

          <div className="field-grid two-up">
            <label className="field-label">
              Date
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>

            <label className="field-label">
              Time
              <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            </label>
          </div>

          <label className="field-label">
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Three things I’m grateful for" />
          </label>

          <label className="field-label">
            Reflection
            <textarea value={text} onChange={(event) => setText(event.target.value)} rows="5" placeholder="I’m grateful for…" />
          </label>

          <div className="routine-actions-row">
            <button className="secondary-button" onClick={resetForm}>
              <X size={16} />
              Clear
            </button>
            <button className="primary-button" onClick={saveNote}>
              <Save size={16} />
              {editingId ? 'Update note' : 'Save note'}
            </button>
          </div>
        </div>
      )}

      <div className="panel-card gratitude-calendar-shell">
        <div className="gratitude-calendar-header">
          <div>
            <p className="eyebrow">CALENDAR VIEW</p>
            <div className="calendar-period-heading">
              <button className="icon-button subtle" type="button" onClick={() => moveCalendar(-1)} aria-label="View earlier entries">
                <ChevronLeft size={16} />
              </button>
              <h3>{calendarView === 'day' ? formatDateLabel(`${selectedDate}T00:00:00`) : calendarView === 'month' ? selectedMonthLabel : `${selectedDateObj.getFullYear()}`}</h3>
              <button className="icon-button subtle" type="button" onClick={() => moveCalendar(1)} aria-label="View later entries">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="calendar-toggle-group">
            {['day', 'month', 'year'].map((mode) => (
              <button
                key={mode}
                type="button"
                className={calendarView === mode ? 'calendar-toggle active' : 'calendar-toggle'}
                onClick={() => setCalendarView(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {calendarView === 'year' ? (
          <div className="year-grid">
            {yearMonths.map((month) => (
              <button
                key={month.label}
                type="button"
                className={`month-pill ${selectedDateObj.getMonth() === month.value ? 'active' : ''}`}
                onClick={() => {
                  const next = new Date(selectedDateObj.getFullYear(), month.value, 1)
                  setSelectedDate(todayValue(next))
                  setCalendarView('month')
                }}
              >
                <span>{month.label}</span>
                {month.hasEntries && <i className="month-dot" />}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="weekday-row">
              {['M', 'T', 'W', 'Th', 'F', 'S', 'S'].map((label) => <span key={label}>{label}</span>)}
            </div>
            <div className="gratitude-calendar-grid">
              {monthGrid.map((date) => {
                const key = formatDayKey(date)
                const dayNotes = notesByDate[key] || []
                const isSelected = key === selectedDate
                const isToday = key === todayValue()

                return (
                  <button
                    key={key}
                    type="button"
                    className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${dayNotes.length ? 'has-entry' : ''}`}
                    onClick={() => {
                      setSelectedDate(key)
                      setCalendarView('day')
                    }}
                    title={`${dayNotes.length ? `${dayNotes.length} note${dayNotes.length > 1 ? 's' : ''}` : 'No gratitude notes'} for ${formatDateLabel(date.toISOString())}`}
                  >
                    <span className="calendar-month">{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase()}</span>
                    <strong>{date.getDate()}</strong>
                    {dayNotes.length > 0 && <i className="calendar-entry-dot" />}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="grateful-toolbar-row">
          <button className="secondary-button" onClick={() => openComposer()}>
            <Plus size={15} />
            Backdate entry
          </button>
          <button className="ghost-button" onClick={() => {
            setReaderNoteId(filteredNotes[0]?.id || null)
          }}>
            Read Entries for {calendarView === 'day' ? formatDateLabel(`${selectedDate}T00:00:00`) : calendarView === 'month' ? selectedMonthLabel : selectedDateObj.getFullYear()}
          </button>
        </div>
      </div>

      <div className="note-feed-shell">
        <div className="note-feed-header">
          <div>
            <p className="eyebrow">FILTERED ENTRIES</p>
            <h3>{calendarView === 'day' ? 'Selected day journal' : calendarView === 'month' ? 'This month' : 'This year'}</h3>
          </div>
          <button className="ghost-button" onClick={() => setReaderNoteId(filteredNotes[0]?.id || null)}>
            Read Entries
          </button>
        </div>

        <div className="note-grid">
          {filteredNotes.length ? filteredNotes.map((note) => (
            <article key={note.id} className="panel-card note-card" onClick={() => setReaderNoteId(note.id)}>
              <div className="note-header">
                <div>
                  <h3>{note.title}</h3>
                  <small className="note-date-badge">{formatDateLabel(normalizeNoteDate(note))}</small>
                </div>
                <div className="note-actions">
                  <button className="icon-button subtle" onClick={(event) => { event.stopPropagation(); editNote(note) }} aria-label="Edit note">
                    <Pencil size={14} />
                  </button>
                  <button className="icon-button subtle" onClick={(event) => { event.stopPropagation(); deleteNote(note.id) }} aria-label="Delete note">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p>{note.text}</p>
              <div className="note-card-footer">
                <span>Read entry</span>
              </div>
            </article>
          )) : (
            <div className="panel-card empty-note-state">
              <p>No gratitude entries landed on this date yet.</p>
            </div>
          )}
        </div>
      </div>

      {activeReaderNote && (
        <div className="drawer-backdrop" onClick={() => setReaderNoteId(null)}>
          <aside className="journal-reader-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="journal-reader-header">
              <div>
                <p className="eyebrow">READ ENTRIES</p>
                <h3>{readScopeLabel()}</h3>
              </div>
              <button className="icon-button subtle" onClick={() => setReaderNoteId(null)} aria-label="Close reader">
                <X size={15} />
              </button>
            </div>

            <div className="journal-reader-body">
              {filteredNotes.map((note) => (
                <article key={note.id} className={`journal-entry ${activeReaderNote.id === note.id ? 'active' : ''}`}>
                  <div className="journal-entry-header">
                    <div>
                      <small>{formatDateLabel(normalizeNoteDate(note))}</small>
                      <h4>{note.title || 'Gratitude note'}</h4>
                    </div>
                    <button className="secondary-button compact-inline" onClick={() => editNote(note)}>
                      Edit
                    </button>
                  </div>
                  <p>{note.text}</p>
                </article>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

function SettingsView({ user, updateUser, setToast, onSignOutAll }) {
  const [form, setForm] = useState({
    name: user.name,
    themeFamily: user.themeFamily || resolveTheme(user).family,
    themeMode: user.themeMode || resolveTheme(user).mode,
  })
  const avatarInputRef = useRef(null)
  const metrics = user.healthMetrics?.length ? user.healthMetrics : seedHealthMetrics
  const hiddenMetricIds = user.hiddenMetricIds || []

  const saveProfile = () => {
    updateUser({ name: form.name.trim() || user.name, themeFamily: form.themeFamily, themeMode: form.themeMode })
    setToast('Profile saved')
  }

  const applyTheme = (patch) => {
    setForm((current) => ({ ...current, ...patch }))
    updateUser(patch)
    setToast('Theme updated')
  }

  const handleAvatarPick = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setToast('Please choose an image file.')
      return
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setToast('Image is too large (max 1.5MB).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      updateUser({ avatarUrl: String(reader.result || '') })
      setToast('Avatar updated')
    }
    reader.readAsDataURL(file)
  }

  const toggleMetricVisibility = (metricId) => {
    const nextHidden = hiddenMetricIds.includes(metricId)
      ? hiddenMetricIds.filter((id) => id !== metricId)
      : [...hiddenMetricIds, metricId]
    updateUser({ hiddenMetricIds: nextHidden })
  }

  return (
    <>
      <section className="overview-head">
        <div>
          <h2>Profile & preferences</h2>
          <p>Keep your rhythm intentional and calm.</p>
        </div>
      </section>

      <div className="settings-grid">
        <div className="panel-card settings-card">
          <p className="eyebrow">PROFILE</p>
          <h3>Account details</h3>

          <div className="avatar-upload-row">
            {user.avatarUrl ? (
              <img className="avatar avatar-image avatar-large" src={user.avatarUrl} alt={user.name} />
            ) : (
              <div className="avatar avatar-large">{user.name.split(' ').map((part) => part[0]).join('')}</div>
            )}
            <div>
              <button type="button" className="secondary-button" onClick={() => avatarInputRef.current?.click()}>
                Upload photo
              </button>
              {user.avatarUrl && (
                <button type="button" className="ghost-button" onClick={() => { updateUser({ avatarUrl: '' }); setToast('Avatar removed') }}>
                  Remove
                </button>
              )}
              <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatarPick} />
            </div>
          </div>

          <label className="field-label">
            Name
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>

          <label className="field-label">
            Theme
            <select value={form.themeFamily} onChange={(event) => applyTheme({ themeFamily: event.target.value })}>
              <option value="forest">Forest Calm</option>
              <option value="ocean">Ocean Breeze</option>
            </select>
          </label>

          <label className="field-label">
            Mode
            <select value={form.themeMode} onChange={(event) => applyTheme({ themeMode: event.target.value })}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>

          <button className="primary-button" onClick={saveProfile}>
            <Save size={16} />
            Save profile
          </button>
        </div>

        {!user.guest && onSignOutAll && (
          <div className="panel-card settings-card">
            <p className="eyebrow">SECURITY</p>
            <h3>Active sessions</h3>
            <p>Sign out FitLife on every device connected to this account.</p>
            <button className="secondary-button" onClick={async () => {
              const { error } = await onSignOutAll()
              if (error) setToast(error.message)
              else setToast('Signed out on all devices')
            }}>
              <LogOut size={16} />
              Sign out everywhere
            </button>
          </div>
        )}

        <div className="panel-card settings-card">
          <p className="eyebrow">DASHBOARD</p>
          <h3>Manage metrics</h3>
          <p>Hide metrics you don't want cluttering your dashboard grid.</p>
          <ul className="manage-metrics-list">
            {metrics.map((metric) => {
              const hidden = hiddenMetricIds.includes(metric.id)
              return (
                <li key={metric.id} className="manage-metrics-row">
                  <span><span className="metric-dot" style={{ background: metric.color }} />{metric.name}</span>
                  <button
                    type="button"
                    className={`metric-visibility-toggle ${hidden ? '' : 'on'}`}
                    onClick={() => toggleMetricVisibility(metric.id)}
                    aria-pressed={!hidden}
                  >
                    {hidden ? 'Hidden' : 'Visible'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="panel-card settings-card">
          <p className="eyebrow">STAYING WITH IT</p>
          <h3>Healthy habits</h3>
          <ul className="habit-list">
            <li>Hydrate before coffee</li>
            <li>Move for 20 minutes</li>
            <li>Check in with gratitude</li>
            <li>Protect your recovery time</li>
          </ul>
        </div>
      </div>
    </>
  )
}

function getHabitCompletionRate(habit) {
  const days = []
  for (let index = 29; index >= 0; index -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - index)
    days.push(date)
  }
  const entries = new Map((habit.logs || []).map((entry) => [entry.date, entry]))
  const total = days.filter((date) => !(habit.restDay && date.getDay() === 0)).length
  const done = days.filter((date) => entries.get(formatDayKey(date))?.done).length
  return total ? Math.round((done / total) * 100) : 0
}

export default App
