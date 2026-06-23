# Setup Checklist

Use this checklist when setting up your new micro-SaaS project.

## Initial Setup

- [ ] Clone/download the template
- [ ] Run `pnpm install`
- [ ] Run `supabase start`
- [ ] Create `.env.local` with Supabase credentials
- [ ] Run `pnpm dev` and verify app works
- [ ] Sign up with Google OAuth

## Set Up First Admin

- [ ] Open Supabase Studio (http://127.0.0.1:54323)
- [ ] Find your user ID in `auth.users` table
- [ ] Insert row in `user_roles`: your ID + role `admin`
- [ ] Sign out and sign back in
- [ ] Verify you can access `/admin`

## Customize Branding

- [ ] Update app name in `components/header.tsx`
- [ ] Update metadata in `app/layout.tsx`
- [ ] Replace `public/logo.png` with your logo
- [ ] Replace favicon files in `public/`
- [ ] Update `public/site.webmanifest`
- [ ] Update footer in `components/footer.tsx`
- [ ] Customize theme colors in `app/globals.css`

## Clean Up Example Code

- [ ] Review `components/items-list.tsx` (keep as reference or delete)
- [ ] Review `hooks/use-items.ts` (keep as reference or delete)
- [ ] Update homepage in `app/page.tsx` with your content
- [ ] Update privacy policy in `app/privacy/page.tsx`
- [ ] Update terms of service in `app/terms/page.tsx`

## Build Your Database Schema

- [ ] Plan your database tables and relationships
- [ ] Create migration: `supabase migration new your_feature`
- [ ] Write SQL for tables with RLS policies
- [ ] Use `authorize()` function for admin overrides
- [ ] Apply migration: `supabase db reset`
- [ ] Regenerate types: `supabase gen types typescript --local > lib/types/database.types.ts`

## Build Your Features

- [ ] Create hooks for your tables (follow `use-items.ts` pattern)
- [ ] Create components for your UI
- [ ] Add routes in `app/` directory
- [ ] Test all CRUD operations
- [ ] Test auth flows (signup, login, logout)
- [ ] Test file uploads if using

## Security Checklist

- [ ] All new tables have RLS enabled
- [ ] All policies use `auth.uid()` check or `authorize()` for admin override
- [ ] No sensitive data in client-side code
- [ ] Error messages are sanitized in production
- [ ] Admin routes are protected in middleware
- [ ] Verify RBAC works (test as user, moderator, admin)

## Testing

- [ ] Test on mobile devices
- [ ] Test in different browsers
- [ ] Test auth flows completely
- [ ] Test role-based access (user vs admin)
- [ ] Test database operations
- [ ] Test file uploads
- [ ] Check for console errors
- [ ] Run production build: `pnpm build`
- [ ] Run type check: `pnpm exec tsc --noEmit`

## Pre-Deploy

- [ ] Remove all unnecessary console.log statements
- [ ] Review security (RLS policies, auth flows, admin protection)
- [ ] Update README with your project details
- [ ] Remove or customize template documentation

## Deploy to Supabase Cloud

- [ ] Create Supabase cloud project
- [ ] Link local to cloud: `supabase link --project-ref YOUR_REF`
- [ ] Push database schema: `supabase db push`
- [ ] **Enable Custom Access Token Hook:**
  - [ ] Go to Authentication → Hooks in dashboard
  - [ ] Enable "Custom Access Token Hook"
  - [ ] Set function to `custom_access_token_hook`
  - [ ] Grant `supabase_auth_admin` execute permission
- [ ] Set up first admin user in cloud database

## Deploy to Vercel/Hosting

- [ ] Push code to GitHub
- [ ] Deploy to Vercel/hosting platform
- [ ] Set environment variables:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] Test production deployment
- [ ] Verify auth works in production
- [ ] Verify admin access works
- [ ] Verify database operations work
- [ ] Verify file uploads work (if using)

## Post-Deploy

- [ ] Set up custom domain (optional)
- [ ] Configure email templates in Supabase
- [ ] Set up monitoring/analytics
- [ ] Create backup strategy
- [ ] Document your deployment process
- [ ] Test role changes work in production

## Optional Enhancements

- [ ] Add Google Analytics
- [ ] Add error monitoring (Sentry)
- [ ] Add email service (Resend, SendGrid)
- [ ] Add payment processing (Stripe)
- [ ] Add more auth providers (GitHub, etc.)
- [ ] Add rate limiting
- [ ] Add API routes if needed
- [ ] Add more shadcn/ui components as needed
- [ ] Customize admin dashboard with your features

## Going Live

- [ ] Create landing page/marketing site
- [ ] Set up customer support
- [ ] Create documentation for users
- [ ] Plan feature roadmap
- [ ] Set up feedback collection
- [ ] Monitor performance and errors
- [ ] Respond to user feedback

---

**Security Reminder**: This template has been audited with Semgrep and follows security best practices. Always maintain security when adding new features:
- Enable RLS on all new tables
- Use `authorize()` for admin features
- Sanitize errors in production
- Test as different user roles
