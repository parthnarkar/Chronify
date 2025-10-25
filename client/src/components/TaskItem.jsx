import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import StatusPill from './StatusPill'

// Delete Confirmation Modal Component
function DeleteConfirmationModal({ isOpen, onClose, onConfirm, taskTitle }) {
  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const modal = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" 
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative z-[10000] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m5-4h4m-7 4h10" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Delete Task</h3>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>
        
        <p className="text-gray-700 mb-6">
          Are you sure you want to delete "<span className="font-medium">{taskTitle}</span>"?
        </p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            Delete Task
          </button>
        </div>
      </div>
    </div>
  )

  // Render modal into document.body so it's not constrained by parent stacking contexts
  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modal, document.body)
  }

  return modal
}

function priorityColor(priority) {
  if (priority === 'high') return 'bg-red-600'
  if (priority === 'medium') return 'bg-yellow-500'
  return 'bg-green-600'
}

export default function TaskItem({ task, toggleStatus, deleteTask, editTask, changePriority, folderId, animatingTask }) {
  const isCompleted = task.status === 'Completed' || task.currentStatus === 'Completed'
  
  // Efficient reference variable to identify meeting tasks
  const isMeetingTask = task.metadata?.type === 'meeting'
  
  // 🔍 DEBUG: Log ALL tasks to see what we're working with
  React.useEffect(() => {
    console.log('🔍 ALL TASK DEBUG:', {
      taskId: task.id || task._id,
      title: task.title,
      isMeetingTask,
      dueDate: task.dueDate,
      dueDateType: typeof task.dueDate,
      dueDateParsed: task.dueDate ? new Date(task.dueDate) : null,
      metadata: task.metadata,
      metadataType: task.metadata?.type,
      fullTask: task
    })
    
    if (isMeetingTask) {
      console.log('🔍 MEETING TASK DETECTED!');
      
      // Test the timestamp you provided from MongoDB
      const testTimestamp = 1761274800000
      const testDate = new Date(testTimestamp)
      console.log('🔍 TEST TIMESTAMP 1761274800000:', {
        timestamp: testTimestamp,
        date: testDate,
        formatMeetingDate: formatMeetingDate(testTimestamp),
        formatMeetingTime: formatMeetingTime(testTimestamp),
        dateString: testDate.toString(),
        isoString: testDate.toISOString()
      })
      
      // Test MongoDB date format too
      const mongoDateFormat = { $date: { $numberLong: "1761274800000" } }
      console.log('🔍 TEST MONGODB FORMAT:', {
        mongoFormat: mongoDateFormat,
        formatMeetingDate: formatMeetingDate(mongoDateFormat),
        formatMeetingTime: formatMeetingTime(mongoDateFormat)
      })
    }
  }, [task, isMeetingTask])
  
  const accent = isMeetingTask ? 'bg-blue-600' : priorityColor(task.priority)
  const priorityTextColor = task.priority === 'medium' ? 'text-black' : 'text-white'
  const isAnimatingOut = animatingTask && animatingTask.id === task.id
  const animDirection = isAnimatingOut && animatingTask.to === 'Completed' ? 'translate-x-6' : isAnimatingOut && animatingTask.to === 'Pending' ? '-translate-x-6' : 'translate-x-0'
  const [open, setOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  // ref for the priority button and dropdown (dropdown rendered into portal)
  const priorityBtnRef = useRef()
  const dropdownRef = useRef()
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const closeTimerRef = useRef()
  const navigate = useNavigate()

  // Handle delete confirmation
  const handleDeleteClick = (e) => {
    // avoid bubbling to parent click which opens details
    if (e) e.stopPropagation()
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = () => {
    deleteTask(task.id)
    setShowDeleteModal(false)
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
  }

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showDeleteModal) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev || '' }
    }
    return undefined
  }, [showDeleteModal])

  // Format date to dd-mm-yyyy for meeting tasks
  const formatMeetingDate = (dateStr) => {
    try {
      console.log('🗓️ formatMeetingDate input:', { dateStr, type: typeof dateStr })
      
      if (!dateStr) {
        console.log('🗓️ formatMeetingDate: No dateStr, returning --')
        return '--'
      }
      
      let date
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        // Already in dd-mm-yyyy format
        console.log('🗓️ formatMeetingDate: Already formatted, returning as is')
        return dateStr
      } else {
        // Convert from ISO, timestamp, or MongoDB date format
        if (typeof dateStr === 'number') {
          date = new Date(dateStr)
        } else if (typeof dateStr === 'string') {
          date = new Date(dateStr)
        } else if (dateStr && typeof dateStr === 'object' && dateStr.$date) {
          // Handle MongoDB extended JSON format: {"$date":{"$numberLong":"1761274800000"}}
          const timestamp = parseInt(dateStr.$date.$numberLong || dateStr.$date)
          date = new Date(timestamp)
        } else {
          date = new Date(dateStr)
        }
        console.log('🗓️ formatMeetingDate: Parsed date:', date)
      }
      
      if (isNaN(date.getTime())) {
        console.log('🗓️ formatMeetingDate: Invalid date, returning --')
        return '--'
      }
      
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      const result = `${day}-${month}-${year}`
      
      console.log('🗓️ formatMeetingDate result:', result)
      return result
    } catch (error) {
      console.log('🗓️ formatMeetingDate error:', error)
      return '--'
    }
  }

  // Extract meeting time from dueDate for meeting tasks
  const formatMeetingTime = (dateStr) => {
    try {
      console.log('⏰ formatMeetingTime input:', { dateStr, type: typeof dateStr })
      
      if (!dateStr) {
        console.log('⏰ formatMeetingTime: No dateStr, returning --')
        return '--'
      }
      
      let date
      if (typeof dateStr === 'number') {
        date = new Date(dateStr)
      } else if (typeof dateStr === 'string') {
        date = new Date(dateStr)
      } else if (dateStr && typeof dateStr === 'object' && dateStr.$date) {
        // Handle MongoDB extended JSON format: {"$date":{"$numberLong":"1761274800000"}}
        const timestamp = parseInt(dateStr.$date.$numberLong || dateStr.$date)
        date = new Date(timestamp)
      } else {
        date = new Date(dateStr)
      }
      
      console.log('⏰ formatMeetingTime: Parsed date:', date)
      
      if (isNaN(date.getTime())) {
        console.log('⏰ formatMeetingTime: Invalid date, returning --')
        return '--'
      }
      
      // Format as HH:MM AM/PM
      const hours = date.getHours()
      const minutes = date.getMinutes()
      const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours)
      const period = hours >= 12 ? 'PM' : 'AM'
      
      const result = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
      console.log('⏰ formatMeetingTime result:', result)
      return result
    } catch (error) {
      console.log('⏰ formatMeetingTime error:', error)
      return '--'
    }
  }  // Format date for regular tasks (due date)
  const formatDueDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      const date = new Date(dateStr)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}-${month}-${year}`
    } catch {
      return dateStr
    }
  }

  useEffect(() => {
    function onDoc(e) {
      // close priority dropdown when clicking outside of the priority button and dropdown
      const btn = priorityBtnRef.current
      const dd = dropdownRef.current
      if (btn && btn.contains(e.target)) return
      if (dd && dd.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  // Close dropdown with a short delay when pointer leaves both button and dropdown
  useEffect(() => {
    // if user moves cursor away, close after a small delay
    if (!isHovering) {
      // start/replace the close timer
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => setOpen(false), 200)
    } else {
      // cancel any pending close timer while hovering
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = undefined
      }
    }
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = undefined
      }
    }
  }, [isHovering])

  // Allow closing the dropdown with Escape
  useEffect(() => {
    if (!open) return undefined
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // compute dropdown position when opened and reposition on resize/scroll
  useEffect(() => {
    if (!open) return undefined
    function computePosition() {
      const btn = priorityBtnRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const DROPDOWN_WIDTH = 112 // matches w-28 (28 * 4)
      const left = Math.max(8 + window.scrollX, rect.right + window.scrollX - DROPDOWN_WIDTH)
      const top = rect.bottom + window.scrollY + 6
      setDropdownStyle({ top, left })
    }
    computePosition()
    window.addEventListener('resize', computePosition)
    window.addEventListener('scroll', computePosition, true)
    return () => {
      window.removeEventListener('resize', computePosition)
      window.removeEventListener('scroll', computePosition, true)
    }
  }, [open])

  return (
  <article onClick={() => {/* noop at article level; navigation handled on title area */}} className={`relative bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow transition-all ${isAnimatingOut ? `${animDirection} opacity-0` : 'translate-x-0 opacity-100'}`}>
      {/* left accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${accent}`} />

      <div className="pl-4 pr-4 py-3 md:pl-6 md:pr-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-3 md:gap-4 md:flex-1 min-w-0">
          <div className="flex items-start gap-3 md:gap-4 w-full">
            <input
              aria-label={`Mark ${task.title} as ${isCompleted ? 'incomplete' : 'Completed'}`}
              type="checkbox"
              checked={isCompleted}
              onChange={() => toggleStatus(task.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 text-blue-600 rounded cursor-pointer flex-shrink-0"
            />

            <div className="min-w-0 cursor-pointer" onClick={() => navigate(`/${task.id}`)}>
              <div className="flex items-center gap-2">
                <h4 className={`text-sm font-semibold truncate ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</h4>
                <div className="hidden sm:inline-flex"><StatusPill status={task.status || task.currentStatus} /></div>
              </div>
              <p className="text-sm text-gray-500 mt-1 truncate">{task.description || 'No description'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {isMeetingTask ? (
            // Meeting Date & Time for meeting tasks (NO PRIORITY)
            <>
              <div className="flex flex-col items-end md:items-center text-right md:text-left">
                <span className="text-xs text-gray-400">Date of Meeting</span>
                {/* Use same date source as TaskDetails.jsx: task.dueDate || task.due || '—' */}
                <span className="text-sm text-gray-700">{task.dueDate || task.due || '—'}</span>
              </div>
            </>
          ) : (
            // Standard due date and priority for regular tasks
            <>
              <div className="flex flex-col items-end md:items-center text-right md:text-left">
                <span className="text-xs text-gray-400">Due</span>
                <span className="text-sm text-gray-700">{formatDueDate(task.dueDate) || '—'}</span>
              </div>

              <div className="relative flex flex-col items-end md:items-center text-right md:text-left">
                <span className="text-xs text-gray-400">Priority</span>
                <button
                  ref={priorityBtnRef}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                  onFocus={() => setIsHovering(true)}
                  onBlur={() => setIsHovering(false)}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${accent} ${priorityTextColor}`}>
                  <span className="mr-2">{(task.priority || 'low').toUpperCase()}</span>
                  {/* down chevron */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
                </button>
                {/* Render dropdown into document.body to avoid clipping/overflow issues */}
                {typeof document !== 'undefined' && createPortal(
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        ref={dropdownRef}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.14 }}
                        style={{ position: 'absolute', top: dropdownStyle.top, left: dropdownStyle.left, zIndex: 9999 }}
                        className="bg-white border rounded shadow-md w-28 text-sm text-left"
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                        tabIndex={-1}
                      >
                        {['low', 'medium', 'high'].map(p => (
                          <button key={p} onClick={(e) => { e.stopPropagation(); setOpen(false); if (changePriority) changePriority(task.id, p) }} className={`w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer ${task.priority === p ? 'font-semibold' : ''}`}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                , document.body)}
              </div>
            </>
          )}

          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); editTask && editTask(task, folderId) }} title="Edit" className="p-1 rounded hover:bg-gray-100 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20,16v4a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2V6A2,2,0,0,1,4,4H8" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                <polygon fill="none" points="12.5 15.8 22 6.2 17.8 2 8.3 11.5 8 16 12.5 15.8" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="currentColor" />
              </svg>
            </button>

            <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(e) }} title="Delete" className="p-1 rounded hover:bg-red-50 cursor-pointer">
              {/* clearer trash icon (heroicons-style) */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5a1 1 0 011-1h4a1 1 0 011 1v2h3a1 1 0 010 2h-1l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 9H4a1 1 0 110-2h3V5zM10 11v6m4-6v6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal 
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        taskTitle={task.title}
      />
    </article>
  )
}
