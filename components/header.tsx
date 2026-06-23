"use client"

import { Button } from "@/components/ui/button"
import { AuthDialog } from "@/components/auth-dialog"
import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Shield } from "lucide-react"
import { useAuthStore } from "@/lib/store/auth-store"

export function Header() {
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const isSignedIn = useAuthStore((state) => state.isSignedIn)
  const isAdmin = useAuthStore((state) => state.isAdmin)
  const logout = useAuthStore((state) => state.logout)

  // Prevent hydration mismatch by only rendering auth-dependent UI after mount
  useEffect(() => {
    setHasMounted(true)
  }, [])

  const handleButtonClick = async () => {
    if (isSignedIn) {
      await logout()
    } else {
      setShowAuthDialog(true)
    }
  }

  return (
    <header className="sticky top-4 z-50 no-print px-4 sm:px-6 lg:px-8">
      <div className="floating-header rounded-2xl border border-border/20 max-w-7xl mx-auto">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Image src="/logo.png" alt="Micro SaaS" width={32} height={32} className="h-8 w-auto" />
              <span className="text-primary font-(family-name:--font-righteous) text-2xl tracking-wider font-bold">
                MicroSaaS
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {hasMounted && isAdmin && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
            <Button size="sm" onClick={handleButtonClick}>
              {hasMounted ? (isSignedIn ? "Logout" : "Sign In") : "Sign In"}
            </Button>
          </div>
        </div>
      </div>
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </header>
  )
}
