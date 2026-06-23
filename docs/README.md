# Micro-SaaS Template Documentation

A production-ready, security-hardened Next.js 16 template for building micro-SaaS applications with authentication, RBAC, database, file uploads, and modern UI components.

## 🚀 Features

### Core Infrastructure
- **Next.js 16** with App Router and React Server Components
- **TypeScript** with strict mode for maximum type safety
- **Tailwind CSS** with custom theme system
- **Supabase** for backend (Auth, Database, Storage)
- **Zustand** for client-side state management

### Authentication & Authorization
- Google OAuth authentication via Supabase Auth
- **Role-Based Access Control (RBAC)** with three roles: User, Moderator, Admin
- Custom JWT claims via Supabase Auth Hooks
- Protected routes and middleware-level authorization
- Auth dialog component with Google Sign-In
- Persistent sessions with secure token refresh
- User profile management

### Security Features
- **Row Level Security (RLS)** on all database tables
- **Custom Access Token Hook** for secure role injection into JWT
- **Defense in Depth** - Multiple authorization layers (middleware → server → RLS)
- **Open Redirect Protection** with domain whitelist
- **Private Storage Buckets** with user-scoped policies
- **Error Sanitization** - No sensitive data leakage in production
- **Strict TypeScript** - Type safety prevents many vulnerabilities
- **Admin-Only RPC Functions** - Secure database functions for role management

### Database
- PostgreSQL via Supabase
- Row Level Security (RLS) policies with admin override capability
- TypeScript types auto-generated from schema (single source of truth)
- Example tables with full CRUD operations
- Admin users view for secure user management

### File Uploads
- Supabase Storage integration
- Private bucket with user-scoped policies
- Image upload component with preview
- Automatic file management (upload/delete)

### UI Components
- **shadcn/ui** components pre-configured (40+)
- Custom theme with light/dark mode support
- Responsive design with mobile-first approach
- Admin dashboard with user management UI
- Toast notifications and alert dialogs

## 📦 Project Structure

```
├── app/                      # Next.js app directory
│   ├── admin/               # Admin dashboard (protected)
│   │   └── page.tsx        # User management page
│   ├── auth/                # Auth routes
│   │   ├── callback/       # OAuth callback handler
│   │   └── error/          # Auth error page
│   ├── privacy/             # Privacy policy
│   ├── terms/               # Terms of service
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles and theme
├── components/              # React components
│   ├── admin/              # Admin-specific components
│   │   └── admin-dashboard.tsx
│   ├── ui/                  # shadcn/ui components (40+)
│   ├── header.tsx           # App header with auth & admin link
│   ├── footer.tsx           # App footer
│   ├── auth-dialog.tsx      # Authentication modal
│   ├── items-list.tsx       # Example CRUD component
│   └── file-upload.tsx      # Generic file upload
├── hooks/                   # Custom React hooks
│   ├── use-items.ts         # Example database hook
│   └── use-mobile.ts        # Mobile detection
├── lib/                     # Utilities and configs
│   ├── rbac/               # Role-Based Access Control
│   │   ├── utils.ts        # RBAC types (derived from DB) & utilities
│   │   ├── client.ts       # Client-side role checking
│   │   ├── server.ts       # Server-side authorization
│   │   └── index.ts        # Barrel exports
│   ├── store/               # Zustand stores
│   │   └── auth-store.ts   # Auth state with role tracking
│   ├── supabase/            # Supabase clients
│   │   ├── client.ts       # Browser client
│   │   ├── server.ts       # Server client
│   │   └── proxy.ts        # Middleware with admin protection
│   ├── types/               # TypeScript types
│   │   └── database.types.ts  # Auto-generated (single source of truth)
│   └── utils.ts             # Utility functions
├── supabase/                # Supabase configuration
│   ├── config.toml          # Local dev config with auth hooks enabled
│   ├── migrations/          # Database migrations
│   │   ├── 20250101000000_init.sql      # Initial schema
│   │   └── 20250103000000_rbac.sql      # RBAC system
│   └── schema.puml          # Database schema diagram
└── public/                  # Static assets
```

## 🔐 Role-Based Access Control (RBAC)

This template includes a production-ready RBAC system with three default roles:

| Role | Permissions |
|------|-------------|
| **User** | Default role. Can manage own data only. |
| **Moderator** | Can read all users, read/delete all items. |
| **Admin** | Full access. Can manage users, change roles, access admin dashboard. |

### How RBAC Works

1. **Custom Access Token Hook**: When a user signs in, Supabase's auth hook (`custom_access_token_hook`) injects their role into the JWT claims as `user_role`.

2. **Middleware Protection**: The Next.js middleware (`lib/supabase/proxy.ts`) checks JWT claims and blocks unauthorized access to `/admin` routes before the request reaches your app.

3. **Server-Side Authorization**: Server components use `getCurrentUserRole()` and `requireRole()` utilities for additional verification.

4. **RLS Policies**: All database queries are protected by Row Level Security policies that use the `authorize()` function to check permissions.

### Setting Up the First Admin

After running `supabase db reset`, you need to manually set up your first admin:

1. Sign in to your app with Google
2. Open Supabase Studio: http://127.0.0.1:54323
3. Go to **Table Editor** → **user_roles**
4. Insert a new row:
   - `user_id`: Your user's UUID (find it in `auth.users` table)
   - `role`: `admin`
5. **Sign out and sign back in** to refresh your JWT with the new role

Now you can access `/admin` and manage other users' roles from the UI.

### Adding New Roles or Permissions

1. Edit `supabase/migrations/20250103000000_rbac.sql`:
   - Add to `app_role` enum
   - Add to `app_permission` enum  
   - Insert permissions into `role_permissions` table

2. Apply and regenerate types:
   ```bash
   supabase db reset
   supabase gen types typescript --local > lib/types/database.types.ts
   ```

3. The `lib/rbac/utils.ts` types will automatically update (they derive from `database.types.ts`). You may need to update:
   - `ROLE_HIERARCHY` constant
   - `ROLE_PERMISSIONS` constant
   - Helper functions if needed

## 🔒 Security Architecture

### Defense in Depth

This template implements multiple independent security layers:

```
Request → Middleware (JWT role check) → Server Component (requireRole) → RLS (authorize function)
```

Each layer independently verifies authorization. Compromising one layer doesn't compromise the system.

### Security Measures Implemented

| Threat | Protection |
|--------|------------|
| Open Redirect | Domain whitelist in auth callback |
| Unauthorized Access | JWT-based middleware + server-side checks + RLS |
| Data Leakage | RLS policies on all tables |
| Privilege Escalation | `authorize()` function verifies permissions at DB level |
| Last Admin Removal | Database trigger prevents removing the last admin |
| Sensitive Error Info | Error sanitization in production (`sanitizeError()`) |
| Storage Access | Private bucket + user-scoped RLS policies |
| CSRF | Supabase PKCE OAuth flow |
| XSS | React's built-in escaping |

### RLS Policy Pattern

All tables use this secure pattern with admin override:

```sql
-- Users can only access their own data, unless they have override permission
CREATE POLICY "Users can read own data"
ON public.table_name FOR SELECT
USING (
  auth.uid() = user_id 
  OR authorize('items.read_all')  -- Admin/mod override
);
```

## 🎨 Customization

### Update Branding

1. **App Name**: Edit `app/layout.tsx` (metadata) and `components/header.tsx`
2. **Logo**: Replace files in `public/` directory
3. **Theme Colors**: Edit CSS variables in `app/globals.css`
4. **Metadata**: Update `app/layout.tsx` and `public/site.webmanifest`

### Modify Database Schema

1. Create a new migration:
   ```bash
   supabase migration new your_feature
   ```

2. Write your SQL with proper RLS:
   ```sql
   CREATE TABLE public.your_table (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
     title text NOT NULL,
     created_at timestamptz DEFAULT now() NOT NULL
   );

   ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

   -- Secure policy with admin override
   CREATE POLICY "Users can manage own data"
   ON public.your_table FOR ALL
   USING (auth.uid() = user_id OR authorize('items.read_all'));
   ```

3. Apply and regenerate types:
   ```bash
   supabase db reset
   supabase gen types typescript --local > lib/types/database.types.ts
   ```

### Add New Admin Features

The admin dashboard at `/admin` can be extended:

```typescript
// app/admin/your-feature/page.tsx
import { getCurrentUserRole } from "@/lib/rbac/server";
import { redirect } from "next/navigation";

export default async function AdminFeaturePage() {
  const role = await getCurrentUserRole();
  if (role !== 'admin') redirect("/?error=unauthorized");
  
  // Your admin feature here
}
```

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Deploy to Vercel
vercel

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

### Supabase Cloud Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Link your local project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
3. Push your database:
   ```bash
   supabase db push
   ```
4. **Important**: Enable the custom access token hook:
   - Go to **Authentication** → **Hooks** in Supabase Dashboard
   - Enable **Custom Access Token Hook**
   - Set function to `custom_access_token_hook`
   - Grant execute permission to `supabase_auth_admin`

## 📚 Common Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm exec tsc --noEmit     # Type check

# Supabase
supabase start             # Start local Supabase
supabase stop              # Stop local Supabase
supabase db reset          # Reset DB (apply migrations)
supabase migration new X   # Create new migration
supabase gen types typescript --local > lib/types/database.types.ts  # Regenerate types
```

## 🐛 Troubleshooting

**Can't access /admin:**
- Ensure you're signed in as an admin (check `user_roles` table)
- Sign out and back in to refresh your JWT with the new role
- Check browser console for errors

**Auth not working:**
- Verify `.env.local` has correct Supabase URL and key
- Check Supabase is running: `supabase status`
- Clear browser cookies and try again

**Role changes not taking effect:**
- Users must sign out and back in after role changes
- The JWT contains the role at time of sign-in

---

**Template Version:** 2.0.0  
**Last Updated:** January 3, 2026  
**Security Audit:** Passed (Semgrep scan - 0 vulnerabilities)
