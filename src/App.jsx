import { useEffect, useState } from 'react'
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Clock3,
  Dumbbell,
  Heart,
  LogOut,
  Menu,
  Moon,
  NotebookPen,
  Pencil,
  Play,
  Plus,
  Save,
  Settings,
  Sparkles,
  TimerReset,
  Trash2,
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
import { isSupabaseConfigured, normalizeSupabaseExercise, supabase } from './supabaseClient'

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
  { name: 'Cyan', value: '#38bdf8' },
  { name: 'Pink', value: '#f472b6' },
  { name: 'Emerald', value: '#34d399' },
  { name: 'Orange', value: '#fb923c' },
  { name: 'Purple', value: '#c084fc' },
  { name: 'Blue', value: '#60a5fa' },
]

const seedHealthMetrics = [
  {
    id: 'protein-intake',
    name: 'Protein Intake',
    category: 'General Wellbeing',
    measurementType: 'numeric',
    unit: 'g',
    target: 120,
    color: '#38bdf8',
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
    color: '#f472b6',
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
    color: '#34d399',
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

const seedUser = (email, name = 'Alex Smith', guest = false) => ({
  id: email,
  email,
  name,
  password: 'fitlife',
  guest,
  height: 172,
  units: 'kg',
  theme: 'dark',
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
})

const initialUsers = read('fitlife-users', null) || {
  'alex@fitlife.app': { ...seedUser('alex@fitlife.app'), exerciseLibrary: [...exercisesSeed], exercises: [...exercisesSeed] },
}
const nav = [['Snapshot', CircleGauge], ['Exercises', Dumbbell], ['Habits', Activity], ['Fasting', TimerReset], ['Log History', NotebookPen], ['Grateful', NotebookPen], ['Settings', Settings]]

function App() {
  const [users, setUsers] = useState(initialUsers)
  const [session, setSession] = useState(() => read('fitlife-session', null))
  const [authMode, setAuthMode] = useState('login')
  const [view, setView] = useState('Snapshot')
  const [mobileNav, setMobileNav] = useState(false)
  const [toast, setToast] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  const user = session ? users[session] : null

  useEffect(() => {
    localStorage.setItem('fitlife-users', JSON.stringify(users))
  }, [users])

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
    document.documentElement.dataset.theme = user?.theme || 'light'
  }, [user?.theme])

  const updateUser = (patch) => {
    if (!user) return
    setUsers((all) => ({ ...all, [user.id]: { ...user, ...patch } }))
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
      />
    )
  }

  const logout = () => {
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
          <div className="avatar">{user.name.split(' ').map((part) => part[0]).join('')}</div>
          <div>
            <strong>{user.name}</strong>
            <small>{user.guest ? 'Guest preview' : 'Wellness journey'}</small>
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
            <button className="primary-button" onClick={() => setView('Grateful')}>
              <Sparkles size={16} />
              Gratitude note
            </button>
          </div>
        </header>

        {view === 'Snapshot' && <Snapshot user={user} updateUser={updateUser} setToast={setToast} />}
        {view === 'Exercises' && <ExercisesView user={user} updateUser={updateUser} setToast={setToast} />}
        {view === 'Habits' && <HabitView user={user} updateUser={updateUser} setToast={setToast} />}
        {view === 'Fasting' && <FastingView user={user} updateUser={updateUser} setToast={setToast} />}
        {view === 'Log History' && <LogHistoryView user={user} updateUser={updateUser} setToast={setToast} />}
        {view === 'Grateful' && <GratefulView user={user} updateUser={updateUser} setToast={setToast} />}
        {view === 'Settings' && <SettingsView user={user} updateUser={updateUser} setToast={setToast} />}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function Auth({ mode, setMode, onAuth }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    const id = form.email.toLowerCase().trim()
    if (!id || !form.password) {
      setError('Enter an email and password.')
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

          {error && <p className="error">{error}</p>}

          <button className="primary-button auth-submit" type="submit">
            {mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <button className="guest-button" onClick={() => onAuth(seedUser('guest@fitlife.app', 'Guest Preview', true))}>
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

function Snapshot({ user, updateUser, setToast }) {
  const habitCompletion = user.habits?.length
    ? Math.round(
        user.habits.reduce((total, habit) => total + (getHabitCompletionRate(habit) || 0), 0) / user.habits.length,
      )
    : 0

  const fastingAverage = user.fastingSessions?.length
    ? user.fastingSessions.reduce((total, session) => total + (Number(session.completedHours) || 0), 0) /
        user.fastingSessions.length
    : 0

  const summary = [
    { label: 'Gratitude notes', value: user.notes.length, icon: Heart, tone: 'rose' },
    { label: 'Exercise routines', value: user.routines.length, icon: Dumbbell, tone: 'mint' },
    { label: 'Habit success', value: `${habitCompletion}%`, icon: Activity, tone: 'lavender' },
    { label: 'Avg fast', value: `${fastingAverage.toFixed(1)}h`, icon: Clock3, tone: 'sky' },
  ]

  const trendData = [
    { day: 'Mon', habits: 60, sleep: 7 },
    { day: 'Tue', habits: 70, sleep: 8 },
    { day: 'Wed', habits: 65, sleep: 6 },
    { day: 'Thu', habits: 80, sleep: 8 },
    { day: 'Fri', habits: 85, sleep: 7 },
    { day: 'Sat', habits: 75, sleep: 8 },
    { day: 'Sun', habits: 90, sleep: 9 },
  ]

  const defaultMetricCategories = ['Heart', 'Mobility', 'General Wellbeing', 'Sleep', 'Mood', 'Exercise Related', 'Overall Health', 'Uncategorized']
  const metrics = user.healthMetrics?.length ? user.healthMetrics : seedHealthMetrics
  const [metricModalOpen, setMetricModalOpen] = useState(false)
  const [metricForm, setMetricForm] = useState({
    id: uid(),
    name: '',
    category: 'Heart',
    measurementType: 'numeric',
    unit: '',
    target: '',
    color: '#38bdf8',
    customCategory: '',
  })
  const [selectedMetricId, setSelectedMetricId] = useState(null)
  const [entryEditor, setEntryEditor] = useState(null)

  const closeMetricDetail = () => setSelectedMetricId(null)
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
      color: '#38bdf8',
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

  const getMetricHeatmap = (metric) => {
    const days = []
    const today = new Date()
    for (let offset = 34; offset >= 0; offset -= 1) {
      const date = new Date(today.getTime() - offset * 86400000)
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

      days.push({ key, intensity, date, value: entry?.value ?? null, isToday: offset === 0 })
    }
    return days
  }

  const getMetricTrendData = (metric) => {
    const entries = [...(metric.entries || [])].sort((a, b) => new Date(a.date) - new Date(b.date))
    return entries.map((entry) => ({
      date: formatDateLabel(entry.date),
      value: metric.measurementType === 'boolean' ? (entry.value ? 1 : 0) : Number(entry.value ?? 0),
      target: metric.measurementType === 'boolean' ? 1 : Number(metric.target || 0),
    }))
  }

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
      color: metricForm.color || '#38bdf8',
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
          <h2>Health snapshot</h2>
          <p>Small, steady shifts create lasting momentum.</p>
        </div>
        <button className="primary-button" onClick={() => setMetricModalOpen(true)}>
          <Plus size={15} />
          Add custom metric
        </button>
      </section>

      <div className="summary-grid">
        {summary.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`summary-card ${tone}`}>
            <div className="summary-icon">
              <Icon size={18} />
            </div>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="metric-card-grid">
        {metrics.map((metric) => {
          const latestEntry = getMetricLatestEntry(metric)
          const progress = getMetricProgress(metric)
          const streak = getMetricStreak(metric)
          const heatmap = getMetricHeatmap(metric)
          const latestValue = latestEntry ? getEntryValue(metric, latestEntry) : 'No data'

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

              {metric.measurementType === 'boolean' && (
                <div className={`metric-bool-pill ${latestEntry?.value ? 'done' : 'pending'}`}>
                  {latestEntry?.value ? '✓ Completed today' : 'Not done today'}
                </div>
              )}

              <div className="calendar-strip">
                <div className="mini-weekday-row compact-row">
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
                    >
                      <span className="metric-date-stack">
                        <small>{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(day.date).toUpperCase()}</small>
                        <strong>{day.date.getDate()}</strong>
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="metric-chart-wrap">
                <ResponsiveContainer width="100%" height={96}>
                  <AreaChart data={getMetricTrendData(metric)}>
                    <defs>
                      <linearGradient id={`fill-${metric.id}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={metric.color} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={metric.color} stopOpacity={0.06} />
                      </linearGradient>
                    </defs>
                    <XAxis hide dataKey="date" />
                    <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke={metric.color} strokeWidth={2.5} fill={`url(#fill-${metric.id})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>
          )
        })}
      </div>

      <section className="panel-card insight-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">FOCUS FOR TODAY</p>
            <h3>Restorative momentum</h3>
          </div>
          <Sparkles size={18} />
        </div>
        <p>
          Your routine is balanced: move with intention, recover fully, and keep gratitude close to the process.
        </p>

        <div className="insight-section">
          <div>
            <p className="eyebrow">INSIGHTS</p>
            <h4>Habit completion vs. fasting & sleep</h4>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="habits" name="Habit completion %" stroke="#7ad1bb" strokeWidth={3} />
                <Line type="monotone" dataKey="sleep" name="Sleep quality" stroke="#c4b5fd" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {metricModalOpen && (
        <div className="modal-backdrop" onClick={closeMetricModal}>
          <div className="metric-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="metric-modal-header">
              <div>
                <p className="eyebrow">ADD CUSTOM METRIC</p>
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
                  onClick={() => setEntryEditor({ metricId: selectedMetric.id, entryId: null, date: todayValue(), value: getQuickMetricValue(selectedMetric) })}
                >
                  + Quick Log Entry
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

            <div className="calendar-strip expanded-calendar">
              <div className="mini-weekday-row compact-row">
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
                  >
                    <span className="metric-date-stack">
                      <small>{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(day.date).toUpperCase()}</small>
                      <strong>{day.date.getDate()}</strong>
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div className="metric-chart-wrap large">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={getMetricTrendData(selectedMetric)}>
                  <defs>
                    <linearGradient id={`detail-fill-${selectedMetric.id}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={selectedMetric.color} stopOpacity={0.52} />
                      <stop offset="100%" stopColor={selectedMetric.color} stopOpacity={0.06} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke={selectedMetric.color} strokeWidth={3} fill={`url(#detail-fill-${selectedMetric.id})`} />
                  <Line type="monotone" dataKey="target" stroke="rgba(255,255,255,0.46)" strokeDasharray="5 5" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {entryEditor && (
              <div className="entry-editor">
                <strong>{entryEditor.entryId ? 'Edit log entry' : 'Add quick log entry'}</strong>
                <div className="field-grid two-up">
                  <label className="field-label">
                    Date
                    <input type="date" value={entryEditor.date} onChange={(event) => setEntryEditor({ ...entryEditor, date: event.target.value })} />
                  </label>
                  <label className="field-label">
                    Value
                    <input type="text" value={entryEditor.value} onChange={(event) => setEntryEditor({ ...entryEditor, value: event.target.value })} />
                  </label>
                </div>
                <div className="routine-actions-row">
                  <button className="secondary-button" onClick={() => setEntryEditor(null)}>Cancel</button>
                  <button className="primary-button" onClick={handleSaveMetricEntry}>Save update</button>
                </div>
              </div>
            )}

            <div className="log-list compact-list metric-log-list">
              {(selectedMetric.entries || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map((entry) => (
                <div key={entry.id} className="history-row metric-history-row">
                  <div>
                    <strong>{formatDateLabel(entry.date)}</strong>
                    <small style={{ color: selectedMetric.color }}>{getEntryValue(selectedMetric, entry)}</small>
                  </div>
                  <div className="row-actions">
                    <button className="icon-button subtle" onClick={() => setEntryEditor({ metricId: selectedMetric.id, entryId: entry.id, date: formatDayKey(entry.date), value: entry.value })} aria-label="Edit metric entry">
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
        icon: '🏋️',
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
      </section>


      <div className="panel-card routine-builder">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">{editingId ? 'EDIT ROUTINE' : 'NEW ROUTINE'}</p>
            <h3>{editingId ? 'Update your workout plan' : 'Create a workout plan'}</h3>
          </div>
          <button className="ghost-button" onClick={() => { setDraft(emptyRoutine()); setEditingId(null) }}>
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

      <div className="routine-grid">
        {user.routines.map((routine) => {
          const isActive = activeWorkout?.routineId === routine.id
          const elapsed = isActive ? Math.max(0, workoutNow - new Date(activeWorkout.startedAt)) : 0

          return (
            <article key={routine.id} className="panel-card routine-card">
              <div className="routine-header">
                <div>
                  <p className="eyebrow">ROUTINE</p>
                  <h3>{routine.name}</h3>
                </div>
                <div className="routine-actions">
                  <button className="icon-button subtle" onClick={() => editRoutine(routine)} aria-label="Edit routine">
                    <Pencil size={15} />
                  </button>
                  <button className="icon-button subtle" onClick={() => deleteRoutine(routine.id)} aria-label="Delete routine">
                    <Trash2 size={15} />
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
                              {progressState.completed ? '✓ Done' : 'Exercise Completed'}
                            </button>
                            {restUntil && restUntil > workoutNow.getTime() && <small className="rest-timer">Rest {formatDuration(restUntil - workoutNow.getTime()).slice(3)}</small>}
                          </div>
                          <div className="set-check-grid">
                            {Array.from({ length: totalSets }, (_, setIndex) => (
                              <label key={`${routine.id}-${exerciseKey}-${setIndex}`} className="set-check-item">
                                <span>Set {setIndex + 1}</span>
                                {exercise.trackingType === 'duration' ? <><input value={progressState.sets[setIndex]?.duration || ''} onChange={(event) => updateWorkoutSetField(routine.id, exerciseKey, setIndex, 'duration', event.target.value)} placeholder="MM:SS" /><input value={progressState.sets[setIndex]?.distance || ''} onChange={(event) => updateWorkoutSetField(routine.id, exerciseKey, setIndex, 'distance', event.target.value)} placeholder="km" /></> : <><input type="number" value={progressState.sets[setIndex]?.reps ?? ''} onChange={(event) => updateWorkoutSetField(routine.id, exerciseKey, setIndex, 'reps', event.target.value)} placeholder="reps" /><input type="number" value={progressState.sets[setIndex]?.weight ?? ''} onChange={(event) => updateWorkoutSetField(routine.id, exerciseKey, setIndex, 'weight', event.target.value)} placeholder="kg" /></>}
                                <button type="button" className={`exercise-complete-toggle ${progressState.sets[setIndex]?.completed ? 'done' : ''}`} onClick={() => toggleWorkoutSet(routine.id, exerciseKey, setIndex)}>{progressState.sets[setIndex]?.completed ? '✓ Done' : 'Not Done'}</button>
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
            </article>
          )
        })}
      </div>

      <div className="panel-card workout-history-panel">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">ACTIVE SESSION</p>
            <h3>Workout timer & history</h3>
          </div>
        </div>

        <div className="workout-live-box">
          <span className="routine-status-badge">{activeWorkout ? 'IN PROGRESS' : 'IDLE'}</span>
          <strong>{activeWorkout ? formatDuration(workoutNow - new Date(activeWorkout.startedAt)) : '00:00:00'}</strong>
          <small>{activeWorkout ? activeWorkout.routineName : 'Start a routine to track the session'}</small>
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
  })
  const [editingId, setEditingId] = useState(null)
  const [selectedHabitId, setSelectedHabitId] = useState(user.habits?.[0]?.id ?? null)
  const [customCategory, setCustomCategory] = useState('')
  const [loggingHabit, setLoggingHabit] = useState(null)
  const [loggingValue, setLoggingValue] = useState('')

  const categoryOptions = [...new Set([...habitCategories, ...user.habits.map((habit) => habit.category).filter(Boolean)])]

  const resetForm = () => {
    setForm({ id: uid(), name: '', category: 'Movement', measurementMode: 'binary', target: '', unit: 'minutes', icon: '💪', restDay: false, trackingType: 'boolean', targetValue: '' })
    setEditingId(null)
    setCustomCategory('')
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
      logs: user.habits.find((habit) => habit.id === editingId)?.logs || [],
    }

    updateUser({
      habits: editingId
        ? user.habits.map((habit) => (habit.id === editingId ? normalizedHabit : habit))
        : [...user.habits, normalizedHabit],
    })

    setToast(editingId ? 'Habit updated' : 'Habit saved')
    resetForm()
    setSelectedHabitId(normalizedHabit.id)
  }

  const editHabit = (habit) => {
    setEditingId(habit.id)
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

  const getHabitCompletionRate = (habit) => {
    const days = getLastNDays(30)
    const entries = new Map((habit.logs || []).map((entry) => [entry.date, entry]))
    const total = days.filter((date) => !(habit.restDay && date.getDay() === 0)).length
    const done = days.filter((date) => entries.get(formatDayKey(date))?.done).length
    return total ? Math.round((done / total) * 100) : 0
  }

  const buildTrendData = (habit) => {
    const days = getLastNDays(14)
    return days.map((date) => {
      const key = formatDayKey(date)
      const matched = (habit.logs || []).find((entry) => entry.date === key)
      return { date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: matched?.done ? 1 : 0 }
    })
  }

  const contributionDays = getLastNDays(35)
  const selectedHabit = user.habits.find((habit) => habit.id === selectedHabitId) || user.habits[0] || null

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

  return (
    <>
      <section className="overview-head">
        <div>
          <h2>Habit tracker</h2>
          <p>Track momentum with flexible metrics and streak-friendly structure.</p>
        </div>
      </section>

      <div className="panel-card habit-form-card">
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

        <div className="field-grid two-up">
          <label className="field-label">
            Habit Name
            <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Daily walk / Read 10 pages" />
          </label>

          <label className="field-label">
            Icon
            <input value={form.icon} onChange={(event) => updateField('icon', event.target.value)} maxLength={2} placeholder="💪" />
          </label>
        </div>

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

      <div className="habit-grid">
        {user.habits.map((habit) => {
          const completionRate = getHabitCompletionRate(habit)
          const latest = (habit.logs || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0]
          const latestStatus = latest?.done ? 'Complete' : 'Pending'

          return (
            <article key={habit.id} className="habit-card panel-card" onClick={() => setSelectedHabitId(habit.id)}>
              <div className="habit-header-row">
                <div className="habit-title-wrap">
                  <span className="habit-icon">{habit.icon || '💪'}</span>
                  <div>
                    <strong>{habit.name}</strong>
                    <small>{habit.category}</small>
                  </div>
                </div>
                <div className="habit-header-actions">
                  <div className="habit-status-pill">{latestStatus}</div>
                  <button
                    type="button"
                    className={`metric-quick-toggle ${getHabitTodayEntry(habit)?.done ? 'done' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      quickLogHabit(habit.id)
                    }}
                  >
                    {getHabitTodayEntry(habit)?.done ? '✓ Completed Today' : 'Log Today'}
                  </button>
                </div>
              </div>

              <div className="habit-meta-row">
                <span>30-day completion: {completionRate}%</span>
                <span>{(habit.trackingType || 'boolean') === 'time' ? `Target ${habit.targetValue || habit.target || '--'}` : (habit.trackingType || 'boolean') === 'numeric' ? `${habit.targetValue || habit.target || 0} ${habit.unit || 'units'} target` : 'Daily check-in'}</span>
              </div>

              <div className="habit-contribution-grid">
                {contributionDays.map((date) => {
                  const key = formatDayKey(date)
                  const done = (habit.logs || []).find((entry) => entry.date === key)?.done
                  const isToday = key === todayValue()
                  return (
                    <button
                      key={`${habit.id}-${key}`}
                      type="button"
                      className={`day-box contribution-box ${done ? 'done' : ''} ${isToday ? 'today' : ''}`}
                      onClick={(event) => { event.stopPropagation(); toggleHabitDay(habit.id, key) }}
                      title={`${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)}`}
                      aria-label={`${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)}`}
                    >
                      <span className="mini-month">{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase()}</span>
                      <span className="mini-day">{String(date.getDate())}</span>
                    </button>
                  )
                })}
              </div>

              <div className="habit-trend-card">
                <div className="habit-trend-header">
                  <span>Latest completion</span>
                  <div className="mini-actions">
                    <button className="icon-button subtle" onClick={(event) => { event.stopPropagation(); editHabit(habit) }} aria-label="Edit habit">
                      <Pencil size={14} />
                    </button>
                    <button className="icon-button subtle" onClick={(event) => { event.stopPropagation(); deleteHabit(habit.id) }} aria-label="Delete habit">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={90}>
                  <LineChart data={buildTrendData(habit)}>
                    <Line type="monotone" dataKey="value" stroke="#7ad1bb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="seven-day-row">
                {getLastNDays(7).map((date) => {
                  const key = formatDayKey(date)
                  const checked = (habit.logs || []).find((entry) => entry.date === key)?.done
                  const tooltip = new Intl.DateTimeFormat('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }).format(date)

                  const weekdayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)
                  const shortLabel = weekdayLabel === 'Thu' ? 'Th' : weekdayLabel

                  return (
                    <div key={`${habit.id}-day-${key}`} className="mini-calendar-stack">
                      <button
                        className={`day-box ${checked ? 'done' : ''} ${key === todayValue() ? 'today' : ''}`}
                        onClick={(event) => { event.stopPropagation(); toggleHabitDay(habit.id, key) }}
                        title={tooltip}
                        aria-label={tooltip}
                      >
                        <span className="mini-month">{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase()}</span>
                        <span className="mini-day">{String(date.getDate())}</span>
                      </button>
                      <span className="mini-weekday-label">{shortLabel}</span>
                    </div>
                  )
                })}
              </div>
            </article>
          )
        })}
      </div>

      {selectedHabit && (
        <div className="panel-card detail-card">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">DETAIL VIEW</p>
              <h3>{selectedHabit.icon} {selectedHabit.name}</h3>
            </div>
            <button className="ghost-button" onClick={() => editHabit(selectedHabit)}>
              <Pencil size={14} />
              Edit habit
            </button>
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
            <h4>Dual-axis trend comparison</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={buildTrendData(selectedHabit)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 1]} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" name={selectedHabit.name} stroke="#7ad1bb" strokeWidth={2} />
                <Line type="monotone" dataKey="value" name="Sleep quality" stroke="#c7d2fe" strokeWidth={2} strokeDasharray="6 6" />
              </LineChart>
            </ResponsiveContainer>
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

  return (
    <>
      <section className="overview-head">
        <div>
          <h2>Fasting tracker</h2>
          <p>Plan your next fast, see the stage in real time, and review your history.</p>
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

          <div className="field-grid two-up">
            <label className="field-label">
              Start Date & Time
              <input type="datetime-local" step="1" value={form.start} onChange={(event) => updateForm('start', event.target.value)} />
            </label>

            <label className="field-label">
              End Date & Time
              <input type="datetime-local" step="1" value={form.end} onChange={(event) => updateForm('end', event.target.value)} />
            </label>
          </div>

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

          <div className="timer-shell">
            <div className="progress-ring" style={{ background: `conic-gradient(#7ad1bb ${elapsedProgress}%, rgba(148, 163, 184, 0.18) 0)` }}>
              <div className="progress-ring-inner">
                <strong>{activeFast ? formatDuration(totalElapsedHours * 3600000) : '00:00:00'}</strong>
                <span>{currentStage}</span>
                <small>{activeFast ? `target ${targetHours.toFixed(1)}h` : 'target 12:12'}</small>
              </div>
            </div>

            <button className="primary-button big-button" onClick={activeFast ? endFast : startFast}>
              {activeFast ? 'End Fast' : 'Start Fast'}
            </button>
          </div>

          <div className="timeline-wrap">
            <p className="eyebrow">FASTING STAGES</p>
            <div className="stages-timeline">
              {[
                { label: 'Fed 0h+', start: '0h', end: '4h' },
                { label: 'Early Fasting 4h+', start: '4h', end: '12h' },
                { label: 'Fat Burning 12h+', start: '12h', end: '18h' },
                { label: 'Ketosis 18h+', start: '18h', end: '24h' },
                { label: 'Autophagy 24h+', start: '24h', end: '36h' },
              ].map((stageItem) => (
                <div key={stageItem.label} className="stage-item">
                  <span className="stage-dot" />
                  <div>
                    <strong>{stageItem.label}</strong>
                    <small>{stageItem.start} → {stageItem.end}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                  <button className={`exercise-complete-toggle ${set.completed ? 'done' : ''}`} onClick={() => updateSet(exerciseIndex, setIndex, 'completed', !set.completed)}>{set.completed ? '✓ Done' : 'Not Done'}</button>
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
    icon: '🏋️',
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
                <span>{entry.icon}</span>
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

function SettingsView({ user, updateUser, setToast }) {
  const [form, setForm] = useState({
    name: user.name,
    theme: user.theme || 'light',
  })

  const saveProfile = () => {
    updateUser({ name: form.name.trim() || user.name, theme: form.theme })
    setToast('Profile saved')
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

          <label className="field-label">
            Name
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>

          <label className="field-label">
            Theme
            <select value={form.theme} onChange={(event) => setForm({ ...form, theme: event.target.value })}>
              <option value="light">Pastel light</option>
              <option value="dark">Midnight dark</option>
            </select>
          </label>

          <button className="primary-button" onClick={saveProfile}>
            <Save size={16} />
            Save profile
          </button>
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
