/**
 * RBAC Server Utilities
 * 
 * Utilities for checking roles on the server side (API routes, server components).
 * These provide an additional layer of protection on top of RLS policies.
 * 
 * SECURITY NOTE: Uses getClaims() which validates the JWT signature cryptographically.
 * NEVER use getSession() for security-critical operations - it reads from cookies
 * without validation and can be tampered with by attackers.
 * 
 * @see https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */

import { createClient } from '@/lib/supabase/server';
import { AppRole, AppPermission, isValidRole, roleHasPermission, roleIsAtLeast } from './utils';

/**
 * Get the current user's role from the server-validated JWT claims
 * This reads from the JWT claims set by the custom_access_token_hook
 * 
 * SECURITY: Uses getClaims() which validates the JWT signature against
 * Supabase's public keys. This is cryptographically secure and cannot
 * be spoofed by tampering with cookies.
 * 
 * @returns AppRole if authenticated with valid JWT, null if not authenticated
 */
export async function getCurrentUserRole(): Promise<AppRole | null> {
  const supabase = await createClient();
  
  // SECURITY: getClaims() validates the JWT signature cryptographically
  // Unlike getSession() which just reads cookies (can be tampered),
  // getClaims() verifies the JWT against Supabase's public keys
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    // Not authenticated or invalid JWT
    return null;
  }
  
  // Extract the custom role claim set by custom_access_token_hook
  const role = data.claims.user_role as string | undefined;
  
  if (role && isValidRole(role)) {
    return role;
  }
  
  // User is authenticated but has no role assigned yet
  // Default to 'user' role for authenticated users
  return 'user';
}

/**
 * Get the current user's ID from validated JWT claims
 * 
 * @returns User ID if authenticated, null otherwise
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    return null;
  }
  
  return data.claims.sub as string;
}

/**
 * Server-side permission check
 * Returns true if the current user has the specified permission
 */
export async function hasPermission(permission: AppPermission): Promise<boolean> {
  const role = await getCurrentUserRole();
  if (!role) return false;
  return roleHasPermission(role, permission);
}

/**
 * Server-side role level check
 * Returns true if the current user's role is at least the minimum required
 */
export async function hasMinimumRole(minimumRole: AppRole): Promise<boolean> {
  const role = await getCurrentUserRole();
  if (!role) return false;
  return roleIsAtLeast(role, minimumRole);
}

/**
 * Require a minimum role - throws an error if not met
 * Use this to protect API routes
 */
export async function requireRole(minimumRole: AppRole): Promise<AppRole> {
  const role = await getCurrentUserRole();
  
  if (!role) {
    throw new Error('Unauthorized: Not authenticated');
  }
  
  if (!roleIsAtLeast(role, minimumRole)) {
    throw new Error(`Forbidden: Requires ${minimumRole} role or higher`);
  }
  
  return role;
}

/**
 * Require a specific permission - throws an error if not met
 * Use this to protect API routes
 */
export async function requirePermission(permission: AppPermission): Promise<void> {
  const role = await getCurrentUserRole();
  
  if (!role) {
    throw new Error('Unauthorized: Not authenticated');
  }
  
  if (!roleHasPermission(role, permission)) {
    throw new Error(`Forbidden: Requires ${permission} permission`);
  }
}
