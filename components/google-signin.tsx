'use client'

import Script from 'next/script'
import { createClient } from '@/lib/supabase/client'
import type { CredentialResponse, IdConfiguration, GsiButtonConfiguration } from 'google-one-tap'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

declare const google: {
  accounts: {
    id: {
      initialize: (config: IdConfiguration) => void
      renderButton: (parent: HTMLElement, options: GsiButtonConfiguration) => void
    }
  }
}

// generate nonce to use for google id token sign-in
const generateNonce = async (): Promise<string[]> => {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  const encoder = new TextEncoder()
  const encodedNonce = encoder.encode(nonce)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return [nonce, hashedNonce]
}

export const GoogleSignIn = () => {
  const supabase = createClient()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const initializeGoogleSignIn = async () => {
    const [nonce, hashedNonce] = await generateNonce()

    // check if there's already an existing session
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      router.push('/')
      return
    }

    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: async (response: CredentialResponse) => {
          setIsLoading(true)
          try {
            const { error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: response.credential,
              nonce,
            })
            if (error) throw error
            router.push('/')
          } catch (error) {
            console.error('Error logging in with Google', error)
            setIsLoading(false)
          }
        },
        nonce: hashedNonce,
      })

      // Render the button
      const buttonDiv = document.getElementById('googleSignInButton')
      if (buttonDiv) {
        google.accounts.id.renderButton(buttonDiv, {
          type: 'standard',
          shape: 'pill',
          theme: 'outline',
          text: 'signin_with',
          size: 'large',
          logo_alignment: 'left',
          width: 350,
        })
      }
    }
  }

  return (
    <>
      <Script 
        src="https://accounts.google.com/gsi/client" 
        onLoad={() => {
          void initializeGoogleSignIn()
        }}
        strategy="afterInteractive"
      />
      <div 
        id="googleSignInButton" 
        className="flex justify-center"
      />
      {isLoading && (
        <div className="text-center text-sm text-muted-foreground mt-4">
          Signing you in...
        </div>
      )}
    </>
  )
}
