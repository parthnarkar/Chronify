import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import LoadingScreen from '../components/LoadingScreen'

export default function Profile() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [photoSrc, setPhotoSrc] = useState('/user-profile.png')

  // Stats state
  const [tasks, setTasks] = useState([])
  const [folders, setFolders] = useState([])
  const [loadingStats, setLoadingStats] = useState(false)
  // AI insights removed from this page - only MongoDB-backed data shown here
  const [syncData, setSyncData] = useState({ connected: false, events: [], mails: [], lastSynced: null })
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    const photoFromUser = user.photoURL || null
    const providerPhoto = user && Array.isArray(user.providerData) && user.providerData.length
      ? (user.providerData.find(pd => pd && pd.photoURL && pd.photoURL.length)?.photoURL || null)
      : null
    const photoUrl = photoFromUser || providerPhoto || '/user-profile.png'
    if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
      setPhotoSrc(`/api/avatar?u=${encodeURIComponent(photoUrl)}`)
    } else {
      setPhotoSrc(photoUrl)
    }
  }, [user])

  // Fetch tasks and folders for current user and compute stats
  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      setLoadingStats(true)
      setError(null)
      try {
        const headers = user ? { 'X-Client-Uid': user.uid, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }

        // Fetch tasks and folders from server (MongoDB-backed)
        const [tRes, fRes, statusRes] = await Promise.all([
          fetch('/api/tasks', { headers }),
          fetch('/api/folders', { headers }),
          fetch('/api/google/status', { headers })
        ])

        if (!tRes.ok) throw new Error('Failed to fetch tasks')
        if (!fRes.ok) throw new Error('Failed to fetch folders')

        const tasksData = await tRes.json()
        const foldersData = await fRes.json()

        if (!cancelled) {
          setTasks(Array.isArray(tasksData) ? tasksData : tasksData.tasks || [])
          setFolders(Array.isArray(foldersData) ? foldersData : foldersData.folders || [])
        }

        // Google sync status (stored in MongoDB UserSync collection)
        if (statusRes && statusRes.ok) {
          const sd = await statusRes.json()
          if (!cancelled) setSyncData({ connected: !!sd.connected, events: sd.events || [], mails: sd.mails || [], lastSynced: sd.lastSynced || null, syncErrors: sd.syncErrors || [] })
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoadingStats(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  // Show aesthetic loading screen while auth or data is loading
  if (loading || loadingStats) {
    return (
      <LoadingScreen title="Chronify" subtitle={loading ? 'Checking authentication…' : 'Loading your profile data…'} />
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Not signed in.</p>
      </div>
    )
  }

  // Helpers for stats
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => (t.status || t.currentStatus) === 'Completed').length
  const pendingTasks = totalTasks - completedTasks
  const meetingTasks = tasks.filter(t => t.metadata && t.metadata.type === 'meeting').length
  const priorityCounts = tasks.reduce((acc, t) => {
    const p = (t.priority || t.metadata?.priority || 'low').toLowerCase()
    acc[p] = (acc[p] || 0) + 1
    return acc
  }, {})
  const recentActivities = [...tasks].sort((a,b) => new Date(b.updatedAt || b.modifiedAt || b.createdAt || b.created || Date.now()) - new Date(a.updatedAt || a.modifiedAt || a.createdAt || a.created || Date.now())).slice(0, 8)

  // Time series (last 7 days) by createdAt
  function lastNDays(n = 7) {
    const days = []
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
    }
    return days
  }
  const days = lastNDays(7)
  const tasksPerDay = days.map(day => {
    const dayStart = day.getTime()
    const dayEnd = dayStart + 24 * 60 * 60 * 1000
    const count = tasks.filter(t => {
      const dt = new Date(t.createdAt || t.created || t._createdAt || t.createdAtServer || null)
      if (!dt || isNaN(dt)) return false
      const ts = dt.getTime()
      return ts >= dayStart && ts < dayEnd
    }).length
    return count
  })

  // Simple inline SVG donut and bar chart components (no external libs)
  function Donut({ value, total, size = 120, stroke = 12, colors = ['#10B981', '#E5E7EB'] }) {
    const radius = (size - stroke) / 2
    const circumference = 2 * Math.PI * radius
    const pct = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0
    const dash = `${(circumference * pct).toFixed(2)} ${circumference.toFixed(2)}`
    return (
      <svg width={size} height={size}>
        <g transform={`translate(${size/2}, ${size/2})`}>
          <circle r={radius} fill="transparent" stroke={colors[1]} strokeWidth={stroke} />
          <circle r={radius} fill="transparent" stroke={colors[0]} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={dash} transform={`rotate(-90)`} />
          <text x="0" y="4" textAnchor="middle" className="text-sm font-semibold" style={{ fontSize: 14, fill: '#111827' }}>{total === 0 ? '0' : `${Math.round(pct*100)}%`}</text>
        </g>
      </svg>
    )
  }

  function BarChart({ labels = [], values = [], width = 360, height = 120, barColor = '#3B82F6' }) {
    const max = Math.max(...values, 1)
    const barW = Math.max(10, Math.floor(width / (values.length * 1.5)))
    return (
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <g transform={`translate(10,10)`}>
          {values.map((v, i) => {
            const x = i * (barW + 8)
            const h = (v / max) * (height - 30)
            const y = (height - 30) - h
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW} height={h} rx="3" fill={barColor} />
                <text x={x + barW / 2} y={height - 12} textAnchor="middle" style={{ fontSize: 10, fill: '#374151' }}>{labels[i]}</text>
              </g>
            )
          })}
        </g>
      </svg>
    )
  }

  // Refresh sync status from server (reads MongoDB UserSync collection)
  async function refreshSyncStatus() {
    if (!user) return
    try {
      const headers = { 'X-Client-Uid': user.uid, 'Content-Type': 'application/json' }
      const res = await fetch('/api/google/status', { headers })
      if (!res.ok) return
      const sd = await res.json()
      setSyncData({ connected: !!sd.connected, events: sd.events || [], mails: sd.mails || [], lastSynced: sd.lastSynced || null, syncErrors: sd.syncErrors || [] })
    } catch (e) {
      console.warn('Failed to refresh sync status', e)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="max-w-5xl mx-auto py-8 px-4"
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
        }}
      >
        <motion.div className="flex items-start gap-6" variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}>
          <img src={photoSrc} alt="profile" className="w-24 h-24 rounded-full object-cover border" onError={(e)=>{ e.target.onerror=null; e.target.src='/user-profile.png' }} />
          <div className="flex-1">
            <motion.div className="flex items-center justify-between" variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}>
              <div>
                <h2 className="text-2xl font-semibold">{user.displayName || 'Unnamed user'}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
                <p className="mt-2 text-sm text-gray-600">UID: <span className="font-mono text-xs text-gray-700">{user.uid}</span></p>
              </div>
              <div className="space-x-2">
                <button onClick={() => navigate('/settings')} className="px-3 py-2 bg-white border rounded text-sm hover:bg-gray-50">Settings</button>
                <button onClick={() => window.location.reload()} className="px-3 py-2 bg-white border rounded text-sm hover:bg-gray-50">Refresh Data</button>
              </div>
            </motion.div>

            <motion.div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4" variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}>
              <motion.div className="bg-white border rounded-lg p-4" variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}>
                <h3 className="text-sm font-medium text-gray-600">Overview</h3>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">Total tasks</div>
                    <div className="font-semibold">{totalTasks}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">Completed</div>
                    <div className="font-semibold text-green-600">{completedTasks}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">Pending</div>
                    <div className="font-semibold text-yellow-600">{pendingTasks}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">Meetings</div>
                    <div className="font-semibold text-indigo-600">{meetingTasks}</div>
                  </div>
                </div>
              </motion.div>

              <motion.div className="bg-white border rounded-lg p-4 flex flex-col items-center" variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Completion Rate</h3>
                <Donut value={completedTasks} total={totalTasks} />
                <div className="mt-3 text-xs text-gray-500">Completed / Total</div>
              </motion.div>

              <motion.div className="bg-white border rounded-lg p-4" variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}>
                <h3 className="text-sm font-medium text-gray-600">Priority distribution</h3>
                <div className="mt-3 space-y-2">
                  {['high','medium','low'].map(k => (
                    <div key={k} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`inline-block w-3 h-3 rounded ${k==='high' ? 'bg-red-500' : k==='medium' ? 'bg-yellow-400' : 'bg-green-500'}`} />
                        <div className="text-sm capitalize">{k}</div>
                      </div>
                      <div className="text-sm font-semibold">{priorityCounts[k] || 0}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            <motion.div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4" variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}>
              <motion.div className="lg:col-span-2 bg-white border rounded-lg p-4" variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-600">Activity (last 7 days)</h3>
                  <div className="text-xs text-gray-500">Auto-updated</div>
                </div>
                <div className="mt-3">
                  <BarChart labels={days.map(d => `${d.getDate()}/${d.getMonth()+1}`)} values={tasksPerDay} width={560} height={160} />
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700">Recent activity</h4>
                  <ul className="mt-2 space-y-2">
                    {recentActivities.map(t => (
                      <li key={t.id || t._id} className="flex items-start justify-between p-2 rounded hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/${t.id || t._id}`)}>
                        <div>
                          <div className="text-sm font-medium">{t.title || t.name || 'Untitled task'}</div>
                          <div className="text-xs text-gray-500">{(t.description || t.desc || '').slice(0, 80)}{(t.description || t.desc || '').length > 80 ? '…' : ''}</div>
                        </div>
                        <div className="text-xs text-gray-400">{new Date(t.createdAt || t.created || t._createdAt || Date.now()).toLocaleDateString()}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>

              <motion.div className="bg-white border rounded-lg p-4" variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-600">Sync Status</h3>
                  <button onClick={refreshSyncStatus} className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50">Refresh</button>
                </div>

                <div className="mt-3 text-sm text-gray-700">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${syncData.connected ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>{syncData.connected ? 'Google connected' : 'Not connected'}</div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500 grid grid-cols-2 gap-2">
                    <div className="flex justify-between"><span>Events</span><span className="font-semibold">{(syncData.events || []).length}</span></div>
                    <div className="flex justify-between"><span>Emails</span><span className="font-semibold">{(syncData.mails || []).length}</span></div>
                    <div className="flex justify-between"><span>Last synced</span><span className="font-semibold">{syncData.lastSynced ? new Date(syncData.lastSynced).toLocaleString() : '—'}</span></div>
                    <div className="flex justify-between"><span>Sync errors</span><span className="font-semibold text-red-500">{(syncData.syncErrors || []).length}</span></div>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-xs text-gray-500">Quick stats</h4>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex justify-between"><span>Folders</span><span className="font-semibold">{folders.length}</span></div>
                    <div className="flex justify-between"><span>Avg tasks / folder</span><span className="font-semibold">{folders.length ? Math.round(totalTasks / folders.length) : 0}</span></div>
                    <div className="flex justify-between"><span>User ID</span><span className="font-mono text-xs text-gray-700">{user.uid}</span></div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div className="mt-6 bg-white border rounded-lg p-4" variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}>
              <h3 className="text-sm font-medium text-gray-600">Detailed task list</h3>
              <div className="mt-3 grid gap-2">
                {loadingStats && <div className="text-sm text-gray-500">Loading tasks…</div>}
                {error && <div className="text-sm text-red-500">{error}</div>}
                {!loadingStats && tasks.length === 0 && <div className="text-sm text-gray-500">No tasks to show.</div>}
                {!loadingStats && tasks.slice(0, 12).map(t => (
                  <div key={t.id || t._id} className="flex items-start justify-between p-3 border rounded hover:bg-gray-50">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">{t.title || t.name || 'Untitled task'}</div>
                        {t.metadata?.type === 'meeting' && <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">meeting</span>}
                        {(t.priority || t.metadata?.priority) && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">{(t.priority || t.metadata?.priority || 'low').toUpperCase()}</span>}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">{(t.description || t.desc || '').slice(0, 140)}{(t.description || '').length > 140 ? '…' : ''}</div>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <div>{new Date(t.createdAt || t.created || Date.now()).toLocaleDateString()}</div>
                      <div className="mt-2">
                        <button onClick={() => navigate(`/${t.id || t._id}`)} className="text-xs px-2 py-1 border rounded">View</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
