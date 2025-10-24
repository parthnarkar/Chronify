import React from 'react'
import { motion } from 'framer-motion'

export default function LoadingScreen({ title = 'Chronify', subtitle = 'Loading your workspace…' }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28 }}
        className="w-full max-w-md mx-4 bg-white border border-gray-100 rounded-xl shadow-xl p-6 flex items-center gap-4"
      >
        <div className="flex-shrink-0">
          <svg className="animate-spin h-12 w-12 text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
            <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>

        <div>
          <div className="text-lg font-semibold text-gray-900">{title}</div>
          <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
          <div className="mt-3 text-xs text-gray-400">Fetching your latest tasks, folders and sync status.</div>
        </div>
      </motion.div>
    </div>
  )
}
