import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { decodeRoleFromToken, type AppRole } from '@/lib/rbac'

interface AuthState {
  user: User | null
  role: AppRole
  isSignedIn: boolean
  isLoading: boolean
  isInitialized: boolean
  isAdmin: boolean
  isModerator: boolean
  initialize: () => Promise<void>
  logout: () => Promise<void>
  refreshRole: () => Promise<void>
}

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

export const useAuthStore = create<AuthState>((set, get) => {
  // Only create Supabase client on the client side
  const getSupabase = () => {
    if (!isBrowser) return null
    return createClient()
  }

  // Helper to update role from session
  const updateRoleFromSession = (accessToken: string | undefined) => {
    if (!accessToken) {
      set({ role: 'user', isAdmin: false, isModerator: false })
      return
    }
    const role = decodeRoleFromToken(accessToken)
    set({ 
      role,
      isAdmin: role === 'admin',
      isModerator: role === 'moderator' || role === 'admin',
    })
  }

  // Initialize auth state
  const initialize = async () => {
    // Skip initialization on server
    if (!isBrowser) {
      set({ isInitialized: true, isLoading: false })
      return
    }
    
    // Prevent multiple initializations
    if (get().isInitialized) return
    
    set({ isLoading: true })
    
    const supabase = getSupabase()
    if (!supabase) {
      set({ isLoading: false, isInitialized: true })
      return
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        updateRoleFromSession(session.access_token)
      }
      
      set({ 
        user: session?.user ?? null,
        isSignedIn: !!session,
        isLoading: false,
        isInitialized: true
      })

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          updateRoleFromSession(session.access_token)
        } else {
          set({ role: 'user', isAdmin: false, isModerator: false })
        }
        
        set({ 
          user: session?.user ?? null,
          isSignedIn: !!session 
        })
      })
    } catch (error) {
      // Handle initialization error gracefully
      if (process.env.NODE_ENV === 'development') {
        console.error('Auth initialization error:', error)
      }
      set({ 
        isLoading: false,
        isInitialized: true
      })
    }
  }

  // Refresh role (useful after role change)
  const refreshRole = async () => {
    if (!isBrowser) return
    
    const supabase = getSupabase()
    if (!supabase) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        updateRoleFromSession(session.access_token)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to refresh role:', error)
      }
    }
  }

  // Initialize on client side only
  if (isBrowser) {
    // Use setTimeout to avoid SSR issues
    setTimeout(() => initialize(), 0)
  }

  return {
    user: null,
    role: 'user',
    isSignedIn: false,
    isLoading: !isBrowser, // Not loading on server
    isInitialized: !isBrowser, // Already "initialized" on server
    isAdmin: false,
    isModerator: false,
    initialize,
    refreshRole,
    logout: async () => {
      if (!isBrowser) return
      
      const supabase = getSupabase()
      if (!supabase) return
      
      try {
        await supabase.auth.signOut()
        set({ 
          user: null,
          isSignedIn: false,
          role: 'user',
          isAdmin: false,
          isModerator: false,
        })
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Logout error:', error)
        }
        // Still clear local state even if server logout fails
        set({ 
          user: null,
          isSignedIn: false,
          role: 'user',
          isAdmin: false,
          isModerator: false,
        })
      }
    },
  }
})
