import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePWA } from '../context/PWAContext'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import LoadingScreen from '../components/LoadingScreen'
import SyncStatusBar from '../components/SyncStatusBar'

export default function Profile() {
  const { user, loading } = useAuth()
  const { isOnline, syncStatus, forceSync } = usePWA()
  const navigate = useNavigate()
  const [photoSrc, setPhotoSrc] = useState('/user-profile.png')

  // Analytics state
  const [analytics, setAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [error, setError] = useState(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState('30days')

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

  // Fetch comprehensive analytics from backend
  useEffect(() => {
    if (!user || !isOnline) return
    
    let cancelled = false
    
    async function fetchAnalytics() {
      setLoadingAnalytics(true)
      setError(null)
      
      try {
        const headers = { 
          'X-Client-Uid': user.uid, 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
        
        const response = await fetch('/api/analytics/user', { headers })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch analytics: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (!cancelled) {
          if (result.success) {
            setAnalytics(result.data)
          } else {
            setError(result.error || 'Failed to load analytics')
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Analytics fetch error:', e)
          setError(e.message || 'Failed to load analytics')
        }
      } finally {
        if (!cancelled) {
          setLoadingAnalytics(false)
        }
      }
    }
    
    fetchAnalytics()
    return () => { cancelled = true }
  }, [user, isOnline])

  // Show loading screen while auth or analytics are loading
  if (loading || loadingAnalytics) {
    return (
      <LoadingScreen 
        title="Chronify Analytics" 
        subtitle={loading ? 'Checking authentication…' : 'Analyzing your activity data…'} 
      />
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Please sign in to view your analytics.</p>
      </div>
    )
  }

  if (!isOnline) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <SyncStatusBar isOnline={isOnline} syncStatus={syncStatus} onForceSync={forceSync} />
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Analytics Dashboard</h2>
          <p className="text-gray-500">Analytics require an internet connection to fetch data from the server.</p>
          <p className="text-sm text-gray-400 mt-2">Please connect to the internet to view your activity insights.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <SyncStatusBar isOnline={isOnline} syncStatus={syncStatus} onForceSync={forceSync} />
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Analytics Dashboard</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-red-600 font-medium">Failed to load analytics</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <SyncStatusBar isOnline={isOnline} syncStatus={syncStatus} onForceSync={forceSync} />
        <div className="mt-8 text-center">
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    )
  }

  // Enhanced chart components for analytics
  function Donut({ value, total, size = 120, stroke = 12, colors = ['#10B981', '#E5E7EB'], label = '' }) {
    const radius = (size - stroke) / 2
    const circumference = 2 * Math.PI * radius
    const pct = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0
    const dash = `${(circumference * pct).toFixed(2)} ${circumference.toFixed(2)}`
    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size}>
          <g transform={`translate(${size/2}, ${size/2})`}>
            <circle r={radius} fill="transparent" stroke={colors[1]} strokeWidth={stroke} />
            <circle r={radius} fill="transparent" stroke={colors[0]} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={dash} transform={`rotate(-90)`} />
            <text x="0" y="-5" textAnchor="middle" className="text-xl font-bold" style={{ fontSize: 18, fill: '#111827' }}>{total === 0 ? '0' : `${Math.round(pct*100)}%`}</text>
            <text x="0" y="10" textAnchor="middle" className="text-xs" style={{ fontSize: 11, fill: '#6B7280' }}>{value}/{total}</text>
          </g>
        </svg>
        {label && <p className="text-xs text-gray-600 mt-2 text-center">{label}</p>}
      </div>
    )
  }

  function LineChart({ data = [], width = 400, height = 160, color = '#3B82F6', showDots = true }) {
    if (data.length === 0) return <div className="text-gray-400 text-sm">No data available</div>
    
    const values = data.map(d => d.count || d.value || 0)
    const labels = data.map(d => d.label || d.date || '')
    const max = Math.max(...values, 1)
    const min = Math.min(...values, 0)
    const range = max - min || 1

    // Ensure we have proper spacing and avoid division by zero
    const chartWidth = width - 60
    const chartHeight = height - 80
    const stepX = values.length > 1 ? chartWidth / (values.length - 1) : 0

    const points = values.map((value, i) => {
      const x = 30 + (i * stepX)
      // Add some padding and ensure proper scaling
      const normalizedValue = range > 0 ? (value - min) / range : 0
      const y = 20 + chartHeight - (normalizedValue * chartHeight)
      return { x, y, value, label: labels[i] }
    })

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

    return (
      <div className="w-full">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          {/* Background */}
          <rect width={width} height={height} fill="white"/>
          
          {/* Grid lines */}
          <defs>
            <pattern id={`grid-${color}`} width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect x="30" y="20" width={chartWidth} height={chartHeight} fill={`url(#grid-${color})`} opacity="0.3"/>
          
          {/* Y-axis */}
          <line x1="30" y1="20" x2="30" y2={20 + chartHeight} stroke="#e5e7eb" strokeWidth="1"/>
          
          {/* X-axis */}
          <line x1="30" y1={20 + chartHeight} x2={30 + chartWidth} y2={20 + chartHeight} stroke="#e5e7eb" strokeWidth="1"/>
          
          {/* Y-axis labels */}
          <text x="25" y="25" textAnchor="end" className="text-xs fill-gray-500">{max}</text>
          <text x="25" y={20 + chartHeight/2} textAnchor="end" className="text-xs fill-gray-500">{Math.round((max + min)/2)}</text>
          <text x="25" y={15 + chartHeight} textAnchor="end" className="text-xs fill-gray-500">{min}</text>
          
          {/* Area fill */}
          {points.length > 1 && (
            <path 
              d={`M 30 ${20 + chartHeight} L ${pathD.replace('M', 'L')} L ${points[points.length-1].x} ${20 + chartHeight} Z`} 
              fill={color} 
              fillOpacity="0.1"
            />
          )}
          
          {/* Line */}
          {points.length > 1 && (
            <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          )}
          
          {/* Dots and labels */}
          {showDots && points.map((point, i) => (
            <g key={i}>
              <circle cx={point.x} cy={point.y} r="3" fill={color} stroke="white" strokeWidth="2"/>
              {/* Only show every few labels to avoid overlap */}
              {(i % Math.max(1, Math.floor(points.length / 5)) === 0 || i === points.length - 1) && (
                <text 
                  x={point.x} 
                  y={height - 5} 
                  textAnchor="middle" 
                  className="text-xs fill-gray-500"
                  transform={`rotate(-45, ${point.x}, ${height - 5})`}
                >
                  {point.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    )
  }

  function BarChart({ data = [], width = 360, height = 120, barColor = '#3B82F6', showValues = false }) {
    if (data.length === 0) return <div className="text-gray-400 text-sm">No data available</div>
    
    const values = data.map(d => d.count || d.value || 0)
    const labels = data.map(d => d.label || d.name || '')
    const max = Math.max(...values, 1)
    
    // Better bar width calculation
    const chartWidth = width - 40
    const spacing = Math.max(4, chartWidth * 0.05)
    const barW = Math.max(8, (chartWidth - (spacing * (values.length - 1))) / values.length)
    const chartHeight = height - 50

    return (
      <div className="w-full">
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          {/* Background */}
          <rect width={width} height={height} fill="white"/>
          
          {/* Y-axis */}
          <line x1="20" y1="10" x2="20" y2={10 + chartHeight} stroke="#e5e7eb" strokeWidth="1"/>
          
          {/* X-axis */}
          <line x1="20" y1={10 + chartHeight} x2={width - 10} y2={10 + chartHeight} stroke="#e5e7eb" strokeWidth="1"/>
          
          {/* Y-axis labels */}
          <text x="15" y="15" textAnchor="end" className="text-xs fill-gray-500">{max}</text>
          <text x="15" y={10 + chartHeight/2} textAnchor="end" className="text-xs fill-gray-500">{Math.round(max/2)}</text>
          <text x="15" y={10 + chartHeight} textAnchor="end" className="text-xs fill-gray-500">0</text>
          
          {/* Bars */}
          {values.map((v, i) => {
            const x = 20 + (i * (barW + spacing))
            const h = Math.max(1, (v / max) * chartHeight)
            const y = (10 + chartHeight) - h
            return (
              <g key={i}>
                <rect 
                  x={x} 
                  y={y} 
                  width={barW} 
                  height={h} 
                  rx="2" 
                  fill={barColor} 
                  className="hover:opacity-80 transition-opacity"
                />
                {showValues && v > 0 && (
                  <text 
                    x={x + barW/2} 
                    y={y - 5} 
                    textAnchor="middle" 
                    className="text-xs fill-gray-600"
                  >
                    {v}
                  </text>
                )}
                {/* Only show labels if there's space */}
                {labels.length <= 7 && (
                  <text 
                    x={x + barW/2} 
                    y={height - 5} 
                    textAnchor="middle" 
                    className="text-xs fill-gray-500"
                    transform={barW < 30 ? `rotate(-45, ${x + barW/2}, ${height - 5})` : ''}
                  >
                    {labels[i].length > 8 ? labels[i].slice(0, 8) + '...' : labels[i]}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  function ActivityHeatmap({ data = [], width = 600, height = 120 }) {
    if (data.length === 0) return <div className="text-gray-400 text-sm p-4 border rounded">No activity data available</div>
    
    const cellSize = 10
    const cellGap = 2
    const padding = 20
    const availableWidth = width - (padding * 2)
    const cols = Math.floor(availableWidth / (cellSize + cellGap))
    const rows = Math.ceil(data.length / cols)
    const actualHeight = Math.max(height, (rows * (cellSize + cellGap)) + (padding * 2))

    return (
      <div className="w-full overflow-x-auto">
        <svg width="100%" height={actualHeight} viewBox={`0 0 ${width} ${actualHeight}`} preserveAspectRatio="xMidYMid meet">
          <g transform={`translate(${padding}, ${padding})`}>
            {data.slice(0, cols * rows).map((day, i) => {
              const row = Math.floor(i / cols)
              const col = i % cols
              const x = col * (cellSize + cellGap)
              const y = row * (cellSize + cellGap)
              const intensity = day.intensity || 0
              const colors = ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127']
              const color = colors[Math.min(intensity, 4)]
              
              return (
                <g key={i}>
                  <rect 
                    x={x} 
                    y={y} 
                    width={cellSize} 
                    height={cellSize} 
                    rx="2" 
                    fill={color}
                    className="hover:stroke-gray-400 hover:stroke-1"
                  />
                  {/* Tooltip on hover - you can implement this with a library or custom solution */}
                  <title>{`${day.date}: ${day.activity} activities`}</title>
                </g>
              )
            })}
            
            {/* Week labels */}
            {rows > 0 && Array.from({length: Math.min(rows, 7)}, (_, i) => (
              <text 
                key={`week-${i}`}
                x="-10" 
                y={i * (cellSize + cellGap) + cellSize/2 + 4} 
                className="text-xs fill-gray-400" 
                textAnchor="end"
              >
                {i === 0 ? 'Mon' : i === 2 ? 'Wed' : i === 4 ? 'Fri' : ''}
              </text>
            ))}
          </g>
        </svg>
      </div>
    )
  }

  const refreshAnalytics = async () => {
    if (!user || !isOnline) return
    
    setLoadingAnalytics(true)
    try {
      const headers = { 
        'X-Client-Uid': user.uid, 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await user.getIdToken()}`
      }
      
      const response = await fetch('/api/analytics/user', { headers })
      const result = await response.json()
      
      if (result.success) {
        setAnalytics(result.data)
      }
    } catch (e) {
      console.error('Failed to refresh analytics:', e)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  const { overview, tasks, folders, sync, productivity, timeBased } = analytics

  // Debug analytics data structure
  console.log('Analytics data:', analytics)
  console.log('Task daily creation:', tasks?.dailyTaskCreation)
  console.log('Task daily completion:', tasks?.dailyTaskCompletion)

  return (
    <AnimatePresence>
      <motion.div
        className="max-w-7xl mx-auto py-8 px-4"
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.03 } }
        }}
      >
        {/* PWA Sync Status Bar */}
        <motion.div variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}>
          <SyncStatusBar 
            isOnline={isOnline} 
            syncStatus={syncStatus} 
            onForceSync={forceSync}
          />
        </motion.div>

        {/* Header Section */}
        <motion.div 
          className="flex items-start gap-6 mb-8" 
          variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
        >
          <img 
            src={photoSrc} 
            alt="profile" 
            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" 
            onError={(e)=>{ e.target.onerror=null; e.target.src='/user-profile.png' }} 
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{user.displayName || 'User'}</h1>
                <p className="text-gray-600 mt-1">{user.email}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span>Account Age: {timeBased?.accountAge || 0} days</span>
                  <span>•</span>
                  <span>Active Days: {timeBased?.totalDaysActive || 0}</span>
                  <span>•</span>
                  <span>Productivity Score: <span className="font-semibold text-blue-600">{productivity?.productivityScore || 0}/100</span></span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={refreshAnalytics} 
                  disabled={loadingAnalytics}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  {loadingAnalytics ? 'Refreshing...' : 'Refresh Analytics'}
                </button>
                <button 
                  onClick={() => navigate('/dashboard')} 
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Overview Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" 
          variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
        >
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{overview?.totalTasks || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(tasks?.completionRate || 0).toFixed(1)}% completion rate
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Folders</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{overview?.activeFolders || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(folders?.avgTasksPerFolder || 0).toFixed(1)} avg tasks/folder
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Productivity Score</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{productivity?.productivityScore || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {productivity?.streakDays || 0} day streak
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Google Sync</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {sync?.isConnected ? 'Connected' : 'Offline'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {sync?.totalEmails || 0} emails, {sync?.totalEvents || 0} events
                </p>
              </div>
              <div className={`w-12 h-12 ${sync?.isConnected ? 'bg-green-100' : 'bg-gray-100'} rounded-lg flex items-center justify-center`}>
                <svg className={`w-6 h-6 ${sync?.isConnected ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Task Activity Chart */}
          <motion.div 
            className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm" 
            variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Task Activity</h3>
                <p className="text-sm text-gray-600">Daily task creation and completion trends</p>
              </div>
              <select 
                value={selectedTimeRange} 
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
              </select>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Task Creation</h4>
                <LineChart 
                  data={tasks?.dailyTaskCreation || []} 
                  color="#3B82F6" 
                  width={500} 
                  height={180}
                />
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Task Completion</h4>
                <LineChart 
                  data={tasks?.dailyTaskCompletion || []} 
                  color="#10B981"
                  width={500} 
                  height={180}
                />
              </div>
            </div>
          </motion.div>

          {/* Productivity Insights */}
          <motion.div 
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm" 
            variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Productivity Insights</h3>
            
            <div className="space-y-6">
              {/* Completion Rate */}
              <div className="text-center">
                <Donut 
                  value={overview?.completedTasks || 0} 
                  total={overview?.totalTasks || 1} 
                  size={100}
                  colors={['#10B981', '#E5E7EB']}
                />
                <p className="text-sm text-gray-600 mt-2">Task Completion Rate</p>
              </div>

              {/* Best Performance Time */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Peak Performance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Best Day</span>
                    <span className="text-sm font-semibold">{productivity?.bestDay?.day || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Best Hour</span>
                    <span className="text-sm font-semibold">{productivity?.bestHour?.hour || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Streak</span>
                    <span className="text-sm font-semibold">{productivity?.streakDays || 0} days</span>
                  </div>
                </div>
              </div>

              {/* Weekly Performance */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Weekly Completions</h4>
                <BarChart 
                  data={productivity?.weeklyCompletions || []} 
                  barColor="#8B5CF6" 
                  showValues={true}
                  width={280}
                  height={140}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Additional Analytics Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Folder Analytics */}
          <motion.div 
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm" 
            variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Folder Performance</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Most Active Folders</h4>
                <div className="space-y-2">
                  {(folders?.mostUsedFolders || []).slice(0, 5).map((folder, index) => (
                    <div key={folder.folderId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{folder.folderIcon}</span>
                        <span className="text-sm font-medium">{folder.folderName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{folder.taskCount} tasks</div>
                        <div className="text-xs text-gray-500">{folder.completionRate.toFixed(1)}% complete</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Folder Task Distribution</h4>
                <BarChart 
                  data={folders?.folderTaskCounts?.map(f => ({ 
                    label: f.folderName?.slice(0, 8) || 'Folder', 
                    count: f.taskCount || 0 
                  })) || []}
                  barColor="#F59E0B"
                  width={380}
                  height={140}
                />
              </div>
            </div>
          </motion.div>

          {/* Sync & AI Analytics */}
          <motion.div 
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm" 
            variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Google Sync Analytics</h3>
            
            <div className="space-y-6">
              {/* Connection Status */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Connection Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${sync?.isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {sync?.isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {sync?.lastSynced && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last synced: {new Date(sync.lastSynced).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Sync Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">{sync?.totalEmails || 0}</div>
                  <div className="text-xs text-blue-700">Emails Analyzed</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">{sync?.totalEvents || 0}</div>
                  <div className="text-xs text-green-700">Calendar Events</div>
                </div>
              </div>

              {/* AI Analytics */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">AI Analysis Stats</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Analyses</span>
                    <span className="font-semibold">{sync?.totalAnalyses || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Meetings Detected</span>
                    <span className="font-semibold">{sync?.totalMeetingsDetected || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tasks Created</span>
                    <span className="font-semibold">{sync?.totalTasksCreated || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Detection Rate</span>
                    <span className="font-semibold">{(sync?.meetingDetectionRate || 0).toFixed(1)}/analysis</span>
                  </div>
                </div>
              </div>

              {/* Recent Sync Activity */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Sync Activity</h4>
                <LineChart 
                  data={sync?.dailySyncActivity || []} 
                  color="#6366F1"
                  width={380}
                  height={140}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Activity Heatmap */}
        <motion.div 
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8" 
          variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Activity Heatmap</h3>
              <p className="text-sm text-gray-600">Your task creation activity over the last 90 days</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Less</span>
              <div className="flex gap-1">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className={`w-3 h-3 rounded-sm ${['bg-gray-100', 'bg-green-200', 'bg-green-300', 'bg-green-500', 'bg-green-700'][i]}`} />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
          
          <ActivityHeatmap data={timeBased?.activityHeatmap || []} />
        </motion.div>

        {/* Monthly Growth Trends */}
        <motion.div 
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm" 
          variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Growth Trends</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">Monthly Task Creation</h4>
              <LineChart 
                data={timeBased?.monthlyTaskGrowth || []} 
                color="#3B82F6"
                width={450}
                height={200}
              />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">Monthly Folder Creation</h4>
              <LineChart 
                data={timeBased?.monthlyFolderGrowth || []} 
                color="#10B981"
                width={450}
                height={200}
              />
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8 pt-6 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{tasks?.avgCompletionTimeInDays || 0}</div>
              <div className="text-sm text-gray-600">Avg Completion (days)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{productivity?.consistencyScore || 0}</div>
              <div className="text-sm text-gray-600">Consistency Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{timeBased?.totalDaysActive || 0}</div>
              <div className="text-sm text-gray-600">Active Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {tasks?.taskTypes?.meeting || 0}
              </div>
              <div className="text-sm text-gray-600">AI-Generated Tasks</div>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </AnimatePresence>
  )
}
