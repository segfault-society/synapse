/**
 * RBAC Client Utilities
 * 
 * Utilities for decoding and checking roles from JWT tokens on the client side.
 * These are used for UI decisions only - actual authorization happens via RLS on the server.
 */

import { jwtDecode } from 'jwt-decode';
import { AppRole, AppPermission, isValidRole, roleHasPermission, roleIsAtLeast } from './utils';

interface JWTPayload {
  user_role?: string;
  sub?: string;
  exp?: number;
  [key: string]: unknown;
}

/**
 * Decode the user role from a Supabase access token
 * Returns 'user' as default if role is not found or invalid
 */
export function decodeRoleFromToken(accessToken: string): AppRole {
  try {
    const decoded = jwtDecode<JWTPayload>(accessToken);
    const role = decoded.user_role;
    
    if (isValidRole(role)) {
      return role;
    }
    
    return 'user';
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to decode JWT:', error);
    }
    return 'user';
  }
}

/**
 * Check if the token has expired
 */
export function isTokenExpired(accessToken: string): boolean {
  try {
    const decoded = jwtDecode<JWTPayload>(accessToken);
    if (!decoded.exp) return true;
    
    // Add 10 second buffer
    return Date.now() >= (decoded.exp * 1000) - 10000;
  } catch {
    return true;
  }
}

/**
 * Client-side permission check (for UI purposes only)
 * IMPORTANT: This is for UI visibility only. Actual authorization must happen server-side via RLS.
 */
export function checkPermission(role: AppRole, permission: AppPermission): boolean {
  return roleHasPermission(role, permission);
}

/**
 * Client-side role level check (for UI purposes only)
 * IMPORTANT: This is for UI visibility only. Actual authorization must happen server-side via RLS.
 */
export function checkRoleLevel(role: AppRole, minimumRole: AppRole): boolean {
  return roleIsAtLeast(role, minimumRole);
}
