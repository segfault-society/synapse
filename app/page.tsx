"use client"

import { useState } from "react"
import { ItemsList } from "@/components/items-list"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card } from "@/components/ui/card"
import { AuthDialog } from "@/components/auth-dialog"
import { Check } from "lucide-react"

export default function Home() {
  const [showAuthDialog, setShowAuthDialog] = useState(false)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
            Micro-SaaS Template
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A production-ready, security-hardened Next.js template with authentication, RBAC, database, and file uploads
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="p-6 space-y-2">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Example CRUD Component */}
        <div>
          <ItemsList onSignInClick={() => setShowAuthDialog(true)} />
        </div>
      </main>
      <Footer />
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  )
}

const features = [
  {
    title: "Supabase Auth + RBAC",
    description: "Google OAuth with role-based access control (User, Moderator, Admin)"
  },
  {
    title: "PostgreSQL + RLS",
    description: "Secure database with Row Level Security and admin override policies"
  },
  {
    title: "Admin Dashboard",
    description: "User management interface with role assignment capabilities"
  },
  {
    title: "Private File Storage",
    description: "Supabase Storage with user-scoped access policies"
  },
  {
    title: "Defense in Depth",
    description: "Multi-layer security: Middleware → Server → Database"
  },
  {
    title: "Strict TypeScript",
    description: "Full type safety with auto-generated database types"
  }
]

