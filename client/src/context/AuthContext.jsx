import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../firebase'
import { onIdTokenChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { getOfflineDataService } from '../services/offlineDataService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [offlineDataService] = useState(() => getOfflineDataService())

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (u) => {
      if (u) {
        setUser(u)
        const t = await u.getIdToken()
        setToken(t)
        
        // Initialize offline data service with user ID
        offlineDataService.setUserId(u.uid)
        
        // Try to sync with server data if online
        try {
          await offlineDataService.initializeWithServerData()
        } catch (error) {
          console.error('Failed to initialize with server data:', error)
        }
      } else {
        setUser(null)
        setToken(null)
        
        // Clear offline data on signout
        if (!loading) { // Don't clear on initial load
          offlineDataService.logout()
        }
      }
      setLoading(false)
    })
    return unsubscribe
  }, [loading, offlineDataService])

  const signOut = async () => {
    // Clear offline data before signing out
    offlineDataService.logout()
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      signOut,
      offlineDataService 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
