# Database Schema Documentation

## Overview

This template uses a comprehensive database schema with user data tables, a full Role-Based Access Control (RBAC) system, and secure storage. All tables are protected by Row Level Security (RLS) policies.

## Core Tables

### profiles

User profile information, automatically created when a user signs up.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key, matches auth.users.id |
| `email` | text | User's email address |
| `full_name` | text | User's full name (optional) |
| `avatar_url` | text | Profile picture URL (optional) |
| `created_at` | timestamptz | When profile was created |
| `updated_at` | timestamptz | When profile was last updated |

**RLS Policies:**
- Users can view and edit their own profile only
- Admins can view all profiles via `authorize('users.read')`

### items

Example table demonstrating CRUD operations with RBAC integration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key, auto-generated |
| `user_id` | uuid | Foreign key to auth.users |
| `title` | text | Item title (required) |
| `description` | text | Item description (optional) |
| `image_url` | text | URL to uploaded image (optional) |
| `created_at` | timestamptz | When item was created |
| `updated_at` | timestamptz | When item was last updated |

**RLS Policies:**
- Users can CRUD their own items
- Admins/moderators can read all items via `authorize('items.read_all')`
- Admins can update/delete all items via `authorize('items.update_all')` / `authorize('items.delete_all')`

## RBAC Tables

### user_roles

Stores user role assignments. Protected table - only accessible by `supabase_auth_admin`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Primary key, auto-increment |
| `user_id` | uuid | Foreign key to auth.users (unique) |
| `role` | app_role | User's role (user/moderator/admin) |
| `created_at` | timestamptz | When role was assigned |
| `created_by` | uuid | Admin who assigned the role |

**Security:**
- Table is NOT accessible via API (no RLS policies = no access)
- Only `supabase_auth_admin` and database functions can access
- Role changes happen via `set_user_role()` function

### role_permissions

Maps roles to their permissions. Read-only reference table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Primary key, auto-increment |
| `role` | app_role | Role name |
| `permission` | app_permission | Permission granted to role |

**Default Permissions:**

| Role | Permissions |
|------|-------------|
| user | (none) |
| moderator | users.read, items.read_all, items.delete_all |
| admin | ALL permissions |

## Database Enums

### app_role
```sql
'user' | 'moderator' | 'admin'
```

### app_permission
```sql
'users.read' | 'users.update' | 'users.delete' |
'items.read_all' | 'items.update_all' | 'items.delete_all' |
'admin.access' | 'admin.manage_roles'
```

## Views

### admin_users_view

Secure view for admin dashboard. Joins user data with roles.

| Column | Type | Source |
|--------|------|--------|
| `id` | uuid | auth.users |
| `email` | text | auth.users |
| `created_at` | timestamptz | auth.users |
| `last_sign_in_at` | timestamptz | auth.users |
| `full_name` | text | profiles |
| `avatar_url` | text | profiles |
| `role` | app_role | user_roles (defaults to 'user') |

**RLS:** Only accessible to users with `admin.access` permission.

## Functions

### custom_access_token_hook(event jsonb)

**Purpose:** Supabase Auth Hook that injects user role into JWT claims.

**Called by:** Supabase Auth (automatically on sign-in/token refresh)

**Returns:** Modified JWT with `user_role` claim

```json
{
  "claims": {
    "user_role": "admin"
  }
}
```

### authorize(requested_permission app_permission)

**Purpose:** Check if current user has a specific permission.

**Used in:** RLS policies for permission-based access control.

**Example:**
```sql
CREATE POLICY "Admins can read all"
ON public.items FOR SELECT
USING (auth.uid() = user_id OR authorize('items.read_all'));
```

### get_my_role()

**Purpose:** Returns the current user's role.

**Returns:** `app_role` enum value

### set_user_role(target_user_id uuid, new_role app_role)

**Purpose:** Admin function to change a user's role.

**Security:**
- Requires `admin.manage_roles` permission
- Prevents removing the last admin
- Logs who made the change

**Returns:** `boolean` (true on success)

## Storage

### uploads bucket (PRIVATE)

Stores user-uploaded files with strict access control.

**Organization:**
```
uploads/
└── {user_id}/
    └── items/
        └── {filename}
```

**RLS Policies:**
- Users can only access files in their own folder
- No public access (bucket is private)

## Triggers

### handle_new_user

Creates a profile when a new user signs up.

```sql
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### prevent_last_admin_removal

Prevents removing or demoting the last admin.

```sql
CREATE TRIGGER prevent_last_admin_removal
BEFORE UPDATE OR DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION check_last_admin();
```

## Schema Diagram

See [schema.puml](./schema.puml) for a PlantUML diagram.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  auth.users  │────<│   profiles   │     │    items     │
└──────────────┘     └──────────────┘     └──────────────┘
       │                                         │
       │                                         │
       ▼                                         │
┌──────────────┐                                 │
│  user_roles  │                                 │
└──────────────┘                                 │
       │                                         │
       ▼                                         │
┌──────────────┐     ┌────────────────────┐     │
│   app_role   │────<│  role_permissions  │     │
└──────────────┘     └────────────────────┘     │
                             │                   │
                             ▼                   │
                     ┌──────────────┐           │
                     │app_permission│───────────┘
                     └──────────────┘
                     (used in RLS policies)
```

## Extending the Schema

### Adding a New Table with RBAC

```sql
-- 1. Create table
CREATE TABLE public.your_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- your columns
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

-- 3. Create policies with RBAC integration
CREATE POLICY "Users can read own data"
ON public.your_table FOR SELECT
USING (auth.uid() = user_id OR authorize('items.read_all'));

CREATE POLICY "Users can insert own data"
ON public.your_table FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
ON public.your_table FOR UPDATE
USING (auth.uid() = user_id OR authorize('items.update_all'));

CREATE POLICY "Users can delete own data"
ON public.your_table FOR DELETE
USING (auth.uid() = user_id OR authorize('items.delete_all'));
```

### Adding a New Permission

1. Add to the enum:
```sql
ALTER TYPE app_permission ADD VALUE 'your_table.read_all';
```

2. Grant to roles:
```sql
INSERT INTO role_permissions (role, permission) VALUES
  ('moderator', 'your_table.read_all'),
  ('admin', 'your_table.read_all');
```

3. Regenerate types:
```bash
supabase db reset
supabase gen types typescript --local > lib/types/database.types.ts
```

## Security Best Practices

1. **Always use RLS** - Enable on all tables with user data
2. **Use `authorize()` for admin features** - Never hardcode role checks
3. **Never expose user_roles directly** - Access only via functions
4. **Use cascading deletes** - Clean up related data automatically
5. **Log sensitive operations** - Track who changed roles and when
6. **Test as different roles** - Verify RLS works correctly
