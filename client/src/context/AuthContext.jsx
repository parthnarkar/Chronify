import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../firebase'
import { onIdTokenChanged, signOut as firebaseSignOut } from 'firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (u) => {
      if (u) {
        setUser(u)
        const t = await u.getIdToken()
        setToken(t)
      } else {
        setUser(null)
        setToken(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
