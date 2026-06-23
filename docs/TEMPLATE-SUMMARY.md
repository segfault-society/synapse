# Micro-SaaS Template - Technical Summary

## What This Template Provides

A production-ready, security-hardened foundation for building micro-SaaS applications. This is not just boilerplate - it's a complete, tested system with:

- ✅ Full authentication flow with Google OAuth
- ✅ Role-Based Access Control (RBAC) with three roles
- ✅ Row Level Security on all database tables
- ✅ Defense in depth (middleware → server → database)
- ✅ Admin dashboard with user management
- ✅ File upload system with private storage
- ✅ 40+ UI components ready to use
- ✅ Type-safe database queries
- ✅ SSR-safe state management

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (Google OAuth) |
| Storage | Supabase Storage |
| State | Zustand |
| Styling | Tailwind CSS |
| UI | shadcn/ui |
| Notifications | Sonner |

## Security Architecture

### RBAC System

The RBAC implementation follows Supabase's recommended [Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks) pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                       │
├─────────────────────────────────────────────────────────────┤
│  1. User signs in with Google OAuth                         │
│  2. Supabase triggers custom_access_token_hook              │
│  3. Hook queries user_roles table for user's role           │
│  4. Role injected into JWT as 'user_role' claim             │
│  5. JWT returned to client with role embedded               │
└─────────────────────────────────────────────────────────────┘
```

### Authorization Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Request Flow                              │
├─────────────────────────────────────────────────────────────┤
│  Request                                                     │
│     ↓                                                        │
│  Middleware (lib/supabase/proxy.ts)                         │
│     • Decodes JWT, extracts role                            │
│     • Blocks /admin for non-admins                          │
│     ↓                                                        │
│  Server Component (app/admin/page.tsx)                      │
│     • Double-checks role with getCurrentUserRole()          │
│     • Redirects unauthorized users                          │
│     ↓                                                        │
│  Database Query                                              │
│     • RLS policy calls authorize() function                 │
│     • authorize() reads role from JWT claims                │
│     • Query allowed/denied based on permissions             │
└─────────────────────────────────────────────────────────────┘
```

### Database Security

All tables use Row Level Security with this pattern:

```sql
-- Standard pattern: own data + admin override
CREATE POLICY "policy_name"
ON public.table_name FOR [SELECT|INSERT|UPDATE|DELETE]
USING (
  auth.uid() = user_id           -- Users can access own data
  OR authorize('permission')      -- Admins can override
);
```

The `authorize()` function:
1. Extracts `user_role` from current JWT claims
2. Checks if that role has the requested permission
3. Returns true/false

### Security Measures

| Vulnerability | Mitigation |
|--------------|------------|
| **Unauthorized Access** | Multi-layer auth (middleware → server → RLS) |
| **Privilege Escalation** | `authorize()` checks JWT claims at DB level |
| **Open Redirect** | Domain whitelist in auth callback |
| **Data Leakage** | RLS on all tables, error sanitization |
| **Last Admin Removal** | DB trigger prevents removing last admin |
| **Storage Access** | Private buckets with user-scoped policies |
| **CSRF** | Supabase PKCE OAuth flow |

## Database Schema

### Tables

```
┌──────────────────┐     ┌──────────────────┐
│     profiles     │     │      items       │
├──────────────────┤     ├──────────────────┤
│ id (FK users)    │     │ id               │
│ email            │     │ user_id (FK)     │
│ full_name        │     │ title            │
│ avatar_url       │     │ description      │
│ created_at       │     │ image_url        │
│ updated_at       │     │ created_at       │
└──────────────────┘     │ updated_at       │
                         └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│   user_roles     │     │ role_permissions │
├──────────────────┤     ├──────────────────┤
│ id               │     │ id               │
│ user_id (FK)     │     │ role (enum)      │
│ role (enum)      │     │ permission (enum)│
│ created_at       │     └──────────────────┘
│ created_by (FK)  │
└──────────────────┘

┌─────────────────────────────────────────────┐
│           admin_users_view (VIEW)           │
├─────────────────────────────────────────────┤
│ Joins auth.users + profiles + user_roles    │
│ Only accessible to users with admin.access  │
└─────────────────────────────────────────────┘
```

### Enums

```sql
app_role: 'user' | 'moderator' | 'admin'

app_permission:
  'users.read' | 'users.update' | 'users.delete' |
  'items.read_all' | 'items.update_all' | 'items.delete_all' |
  'admin.access' | 'admin.manage_roles'
```

### Functions

| Function | Purpose |
|----------|---------|
| `custom_access_token_hook` | Injects role into JWT |
| `authorize(permission)` | Checks permission in RLS policies |
| `get_my_role()` | Returns current user's role |
| `set_user_role(user_id, role)` | Admin function to change roles |

## File Structure Explained

```
lib/
├── rbac/                    # Role-Based Access Control
│   ├── utils.ts            # Types derived from DB + helper functions
│   ├── client.ts           # decodeRoleFromToken(), checkPermission()
│   ├── server.ts           # getCurrentUserRole(), requireRole()
│   └── index.ts            # Re-exports everything
│
├── store/
│   └── auth-store.ts       # Zustand store with role tracking
│                           # SSR-safe, auto-initializes on client
│
├── supabase/
│   ├── client.ts           # Browser Supabase client
│   ├── server.ts           # Server Supabase client
│   └── proxy.ts            # Middleware: session refresh + admin protection
│
├── types/
│   └── database.types.ts   # Auto-generated (SINGLE SOURCE OF TRUTH)
│                           # All other types derive from this
│
└── utils.ts                # cn(), sanitizeError(), etc.
```

## Type Safety

Types flow from database to TypeScript:

```
supabase/migrations/*.sql
         ↓
supabase gen types typescript --local
         ↓
lib/types/database.types.ts (auto-generated)
         ↓
lib/rbac/utils.ts (derives AppRole, AppPermission, AdminUserView)
         ↓
Your components (fully typed!)
```

**Never manually define types that exist in the database.** Always derive from `database.types.ts`.

## Key Implementation Details

### Auth Store (SSR-Safe)

The auth store handles server-side rendering properly:

```typescript
const isBrowser = typeof window !== 'undefined'

// On server: immediately mark as initialized (no auth)
// On client: initialize asynchronously after mount
if (isBrowser) {
  setTimeout(() => initialize(), 0)
}

return {
  isInitialized: !isBrowser,  // Server is "ready" immediately
  isLoading: !isBrowser,      // Server is not loading
  // ...
}
```

### Middleware Role Check

The middleware extracts role from JWT without making DB calls:

```typescript
function getRoleFromClaims(request: NextRequest) {
  const token = request.cookies.get('sb-*-auth-token')
  // Decode JWT, extract user_role claim
  // No database call needed - role is in token
}
```

### RLS with Admin Override

Standard policy pattern:

```sql
CREATE POLICY "items_select_policy"
ON public.items FOR SELECT
USING (
  auth.uid() = user_id        -- Own items
  OR authorize('items.read_all')  -- Or has permission
);
```

## Testing the System

### As User
1. Sign in → default role is 'user'
2. Can only see/edit own items
3. Cannot access /admin (redirected)

### As Admin
1. Add yourself to user_roles with role='admin'
2. Sign out and back in (refreshes JWT)
3. Can access /admin
4. Can see all users, change roles
5. Can see all items (RLS allows)

### Verify Security
1. Try accessing /admin without admin role → blocked at middleware
2. Try querying admin_users_view without permission → empty result (RLS)
3. Try calling set_user_role without admin → error (RLS on function)

## Version History

- **v2.0.0** (January 3, 2026)
  - Added RBAC with Custom Access Token Hook
  - Added admin dashboard with user management
  - Defense in depth security architecture
  - Strict TypeScript mode
  - Security audit passed (Semgrep - 0 vulnerabilities)
  
- **v1.0.0** (December 26, 2025)
  - Initial template release
  - Basic auth, database, file uploads

---

**Security Audit**: Passed (Semgrep scan - 0 vulnerabilities found)  
**Last Updated**: January 3, 2026
