import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Whitelist of allowed domains for redirects (add your production domains here)
const ALLOWED_REDIRECT_HOSTS = new Set(
  [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ].filter(Boolean).map(url => {
    try {
      return new URL(url as string).host.toLowerCase()
    } catch {
      return null
    }
  }).filter(Boolean) as string[]
)

/**
 * Validates if a host is in our allowed list.
 * SECURITY: Prevents open redirect attacks via X-Forwarded-Host spoofing.
 */
function isAllowedHost(host: string): boolean {
  // Reject empty or invalid hosts
  if (!host || typeof host !== 'string') return false
  
  const normalizedHost = host.toLowerCase().trim()
  
  // Reject hosts with suspicious characters (protocol injection attempts)
  if (normalizedHost.includes('/') || normalizedHost.includes('\\') || 
      normalizedHost.includes('@') || normalizedHost.includes(':')) {
    return false
  }
  
  // Allow if no whitelist configured (development mode)
  if (ALLOWED_REDIRECT_HOSTS.size === 0) {
    return process.env.NODE_ENV === 'development'
  }
  
  return ALLOWED_REDIRECT_HOSTS.has(normalizedHost)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get('next') ?? '/dashboard'
  if (!next.startsWith('/')) {
    // if "next" is not a relative URL, use the default
    next = '/dashboard'
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost && isAllowedHost(forwardedHost)) {
        // Only redirect to forwarded host if it's in our allowed list
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`)
}
