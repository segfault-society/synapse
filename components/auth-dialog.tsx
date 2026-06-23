'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GoogleSignIn } from "@/components/google-signin"
import Link from "next/link"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!open) {
      setIsLoading(false)
      return
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setIsLoading(true)
        // Close dialog after successful sign-in
        setTimeout(() => {
          onOpenChange(false)
          setIsLoading(false)
        }, 1500)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [open, supabase.auth, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Welcome</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Sign in to save your data, sync across devices, and access all features
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center py-6">
          {isLoading ? (
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
              <p className="text-sm text-muted-foreground">Signing you in...</p>
            </div>
          ) : (
            <GoogleSignIn />
          )}
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground border-t pt-4">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
