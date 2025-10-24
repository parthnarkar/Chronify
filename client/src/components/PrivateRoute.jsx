import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingScreen from './LoadingScreen'

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen title="Chronify" subtitle="Checking authentication…" />
  if (!user) return <Navigate to="/login" replace />
  return children
}
