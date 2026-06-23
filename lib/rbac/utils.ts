/**
 * RBAC (Role-Based Access Control) Types and Utilities
 * 
 * This module provides type-safe role and permission checking utilities
 * that work with the JWT claims set by the custom_access_token_hook.
 * 
 * Types are derived from database.types.ts - the single source of truth.
 */

import type { Database } from '@/lib/types/database.types';

// Derive types from database.types.ts (single source of truth)
export type AppRole = Database['public']['Enums']['app_role'];
export type AppPermission = Database['public']['Enums']['app_permission'];

// Type for the get_admin_users() function return value (derived from database.types.ts)
// Note: This function returns ALL users, not just admins. It's named "admin" because
// only admins can call it. No need for separate types per role.
export type AdminUser = Database['public']['Functions']['get_admin_users']['Returns'][number];

// Role hierarchy for comparison
export const ROLE_HIERARCHY: Record<AppRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
};

// Permissions granted to each role
export const ROLE_PERMISSIONS: Record<AppRole, AppPermission[]> = {
  user: [],
  moderator: ['users.read', 'items.read_all', 'items.delete_all'],
  admin: [
    'users.read',
    'users.update',
    'users.delete',
    'items.read_all',
    'items.update_all',
    'items.delete_all',
    'admin.access',
    'admin.manage_roles',
  ],
};

/**
 * Check if a role is valid
 */
export function isValidRole(role: unknown): role is AppRole {
  return typeof role === 'string' && ['user', 'moderator', 'admin'].includes(role);
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: AppRole, permission: AppPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role is at least a certain level
 */
export function roleIsAtLeast(role: AppRole, minimumRole: AppRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Get the display name for a role
 */
export function getRoleDisplayName(role: AppRole): string {
  const names: Record<AppRole, string> = {
    user: 'User',
    moderator: 'Moderator',
    admin: 'Administrator',
  };
  return names[role] ?? 'Unknown';
}

/**
 * Get the color/variant for a role badge
 */
export function getRoleBadgeVariant(role: AppRole): 'default' | 'secondary' | 'destructive' {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'moderator':
      return 'secondary';
    default:
      return 'default';
  }
}
