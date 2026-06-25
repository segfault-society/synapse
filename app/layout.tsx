import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Righteous } from "next/font/google"
import { GoogleAnalytics } from "@next/third-parties/google"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
export const righteous = Righteous({ 
  weight: "400",
  subsets: ["latin"],
  variable: "--font-righteous"
})

export const metadata: Metadata = {
  title: "SYNAPSE — Fairness-aware resource allocation",
  description: "Real-time, conflict-free, transparent allocation of shared university resources.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon.ico",
        sizes: "any",
      },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${righteous.variable}`}>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
    </html>
  )
}
