import React from 'react'

export default function StatusPill({ status }) {
  const map = {
    pending: 'bg-gray-100 text-gray-800',
    completed: 'bg-green-100 text-green-700',
  }
  const safeStatus = typeof status === 'string' && status.length ? status : 'pending'
  const label = safeStatus.replace(/-/g, ' ')
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[safeStatus] || map.pending}`}>{label}</span>
}
