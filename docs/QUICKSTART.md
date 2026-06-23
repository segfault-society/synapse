# Quick Start Guide

Get your secure micro-SaaS up and running in 5 minutes.

## Prerequisites

- Node.js 18+ and pnpm
- Supabase CLI (`brew install supabase/tap/supabase`)

## Step 1: Install Dependencies

```bash
pnpm install
```

## Step 2: Start Supabase

```bash
supabase start
```

This will output your local Supabase credentials:
```
API URL: http://127.0.0.1:54321
anon key: eyJhbG...
service_role key: eyJhbG...
Studio URL: http://127.0.0.1:54323
```

Save the **API URL** and **anon key**!

## Step 3: Create Environment File

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key_from_step_2
```

## Step 4: Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## Step 5: Create Your First Admin

1. Click **Sign In** and sign up with Google
2. Open Supabase Studio: http://127.0.0.1:54323
3. Go to **Table Editor** → **user_roles**
4. Click **Insert Row**:
   - `user_id`: Copy your UUID from the `auth.users` table
   - `role`: `admin`
5. **Sign out and sign back in** to refresh your session

You should now see an **Admin** link in the header!

## What's Included

### 🔐 Security Features
- **RBAC**: Three roles (User, Moderator, Admin)
- **Row Level Security**: All data protected at database level
- **Defense in Depth**: Middleware → Server → Database authorization
- **Secure Storage**: Private buckets with user-scoped policies

### 🎨 UI Components
- 40+ pre-configured shadcn/ui components
- Dark/light mode
- Responsive design
- Admin dashboard with user management

### 📦 Example Patterns
- CRUD operations with `use-items.ts` hook
- File uploads with `file-upload.tsx`
- Protected routes with server-side auth

## Next Steps

### Customize Branding
- Update app name: `components/header.tsx`
- Replace logo: `public/logo.png`
- Change colors: `app/globals.css`

### Add Your Features

1. **Create a migration:**
   ```bash
   supabase migration new add_my_feature
   ```

2. **Write SQL** (in the generated file):
   ```sql
   CREATE TABLE public.my_table (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
     name text NOT NULL,
     created_at timestamptz DEFAULT now()
   );

   ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can manage their own data"
   ON public.my_table FOR ALL
   USING (auth.uid() = user_id OR authorize('items.read_all'));
   ```

3. **Apply migration:**
   ```bash
   supabase db reset
   ```

4. **Regenerate types:**
   ```bash
   supabase gen types typescript --local > lib/types/database.types.ts
   ```

5. **Create a hook** (follow `hooks/use-items.ts` pattern)

6. **Create a component** (follow `components/items-list.tsx` pattern)

### Deploy to Production

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push
   ```

2. **Deploy to Vercel**
   ```bash
   vercel
   ```

3. **Create Supabase Cloud Project**
   - Go to [supabase.com](https://supabase.com)
   - Create project, copy URL and anon key

4. **Link and Push Database**
   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```

5. **Enable Auth Hook** (in Supabase Dashboard)
   - Go to Authentication → Hooks
   - Enable Custom Access Token Hook
   - Set function to `custom_access_token_hook`

6. **Set Environment Variables in Vercel**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Common Commands

```bash
# Supabase
supabase start                # Start local Supabase
supabase stop                 # Stop local Supabase  
supabase db reset             # Reset database
supabase migration new NAME   # Create migration
supabase gen types typescript --local > lib/types/database.types.ts

# Development
pnpm dev                      # Start dev server
pnpm build                    # Production build
pnpm exec tsc --noEmit       # Type check

# Database Studio
# Open http://127.0.0.1:54323 in browser
```

## Need Help?

- **Full Documentation**: [docs/README.md](./README.md)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **shadcn/ui Docs**: [ui.shadcn.com](https://ui.shadcn.com)

## Security Notes

- Never commit `.env.local` (already in `.gitignore`)
- Always use Row Level Security on new tables
- Use the `authorize()` function for permission checks
- Role changes require users to re-login

Happy building! 🚀
