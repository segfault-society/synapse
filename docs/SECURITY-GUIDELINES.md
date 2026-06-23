# Security Guidelines for Micro SaaS Template

> **IMPORTANT**: This document contains critical security guidelines that MUST be followed when generating or modifying code in this project. AI assistants and developers should treat these as mandatory requirements.

> ⚠️ **HARD-LEARNED LESSONS**: Some guidelines in this document come from real-world attacks. Ignoring them can lead to complete system compromise, data breaches, and financial loss.

---

## Table of Contents

1. [Pre-Development Security Checks](#1-pre-development-security-checks)
2. [Self-Attack Methodology (CRITICAL)](#2-self-attack-methodology-critical)
3. [Authentication & Session Management](#3-authentication--session-management)
4. [Server-Side Rendering (SSR) Safety](#4-server-side-rendering-ssr-safety)
5. [Row Level Security (RLS) Policies](#5-row-level-security-rls-policies)
6. [Service Role Key - DANGER ZONE](#6-service-role-key---danger-zone)
7. [Payment Gateway Security](#7-payment-gateway-security)
8. [API & Route Protection](#8-api--route-protection)
9. [Input Validation & Sanitization](#9-input-validation--sanitization)
10. [File Upload Security](#10-file-upload-security)
11. [Environment Variables](#11-environment-variables)
12. [Error Handling](#12-error-handling)
13. [RBAC Implementation](#13-rbac-implementation)
14. [Domain Security Verification](#14-domain-security-verification)
15. [Security Testing Checklist](#15-security-testing-checklist)

---

## 1. Pre-Development Security Checks

### Always Run Semgrep Before Committing

```bash
# Run Semgrep scan on specific files
# Use the Semgrep MCP tool: mcp_semgrep_semgrep_scan

# Run supply chain scan when dependencies change
# Use: mcp_semgrep_semgrep_scan_supply_chain
```

### Security Scan Checklist

- [ ] Run `mcp_semgrep_semgrep_scan` on all modified files
- [ ] Run `mcp_semgrep_semgrep_scan_supply_chain` after adding/updating dependencies
- [ ] Check for 0 vulnerabilities before merging
- [ ] Review any warnings even if they're not critical

### Supabase MCP Server Limitations (CRITICAL)

> ⚠️ **DO NOT FULLY TRUST THE MCP SERVER**: The Supabase MCP tools (`mcp_supabase_get_advisors`, etc.) do NOT detect all security issues. Always cross-check with the Supabase Dashboard.

**What MCP Misses:**

The MCP security advisor returned `[]` (empty) while the Dashboard showed **2 critical errors**:

| Issue | MCP Result | Dashboard Result |
|-------|------------|------------------|
| Exposed Auth Users (view exposes `auth.users`) | ❌ Not detected | ✅ Detected as ERROR |
| Security Definer View (bypasses RLS) | ❌ Not detected | ✅ Detected as ERROR |

**Mandatory Verification Process:**

```bash
# 1. Run MCP advisor checks
# Use: mcp_supabase_get_advisors (security)
# Use: mcp_supabase_get_advisors (performance)

# 2. ALWAYS also check the Supabase Dashboard
# Go to: Database > Security Advisor
# Check ALL tabs: Errors, Warnings, Info

# 3. After applying fixes, verify in BOTH places
```

**Why This Matters:**

The MCP server uses a subset of the linting rules. The Dashboard runs additional checks including:
- Views that expose `auth.users` to authenticated roles
- Security definer views that bypass RLS
- Other advanced security patterns

**Security Advisor Checklist:**

- [ ] Run `mcp_supabase_get_advisors` for both security and performance
- [ ] Open Supabase Dashboard > Database > Security Advisor
- [ ] Verify **0 Errors** in Dashboard (not just MCP)
- [ ] Review any Warnings even if MCP shows clean
- [ ] After fixes, verify in BOTH MCP and Dashboard

---

## 2. Self-Attack Methodology (CRITICAL)

> 🚨 **REAL-WORLD LESSON**: A hacker compromised an entire userbase and created fraudulent gift vouchers by exploiting bypassed RLS policies and payment verification flaws. These attack patterns were not anticipated during development. **ALWAYS assume attackers are smarter than you.**

### Mandatory Security Audit Process

**Before deploying ANY new feature, you MUST:**

1. **Run a full Copilot/AI security audit** on the feature
2. **Think like an attacker** - what would you exploit?
3. **Test every possible attack vector** yourself
4. **Document what you tested** and the results

### AI-Assisted Security Audit Prompt

When adding new features, ask Copilot or your AI assistant to run this audit:

```
Please perform a comprehensive security audit on [feature/file]. 

Act as a malicious hacker trying to:
1. Bypass authentication/authorization
2. Access other users' data
3. Manipulate prices, quantities, or values
4. Create fake success states
5. Exploit race conditions
6. Inject malicious payloads
7. Bypass payment verification
8. Escalate privileges
9. Access admin functionality
10. Exfiltrate sensitive data

For each attack vector:
- Explain HOW the attack would work
- Show the specific code/request that would exploit it
- Rate the severity (Critical/High/Medium/Low)
- Provide the fix

Use Semgrep MCP tools to scan for vulnerabilities.
```

### Attack Vectors to ALWAYS Test

#### 1. Authentication Bypass
```bash
# Test: Can I access protected routes without auth?
curl -X GET https://yourapp.com/api/admin/users
curl -X POST https://yourapp.com/api/items -d '{"title":"test"}'

# Test: Can I use an expired/invalid token?
curl -H "Authorization: Bearer invalid_token" https://yourapp.com/api/protected
```

#### 2. Authorization Bypass (IDOR)
```bash
# Test: Can I access another user's data by changing IDs?
# If my user_id is "abc123", try:
curl https://yourapp.com/api/items/user/xyz789  # Another user's items
curl https://yourapp.com/api/profile/xyz789     # Another user's profile

# Test: Can I modify another user's data?
curl -X PUT https://yourapp.com/api/items/item_belonging_to_other_user
```

#### 3. Price/Value Manipulation
```bash
# Test: Can I change prices in requests?
# Original: {"product_id": "123", "price": 100}
curl -X POST https://yourapp.com/api/purchase \
  -d '{"product_id": "123", "price": 1}'  # Changed to $1!

# Test: Can I use negative values?
curl -X POST https://yourapp.com/api/purchase \
  -d '{"product_id": "123", "quantity": -10}'  # Negative quantity
```

#### 4. Payment Verification Bypass
```bash
# Test: Can I fake a successful payment?
# Intercept the payment callback and send fake success
curl -X POST https://yourapp.com/api/payment/callback \
  -d '{"status": "success", "order_id": "123", "amount": 100}'

# Test: Can I replay a payment success?
# Save a legitimate payment callback and replay it
```

#### 5. Race Conditions
```bash
# Test: Can I use a voucher/discount multiple times simultaneously?
for i in {1..10}; do
  curl -X POST https://yourapp.com/api/redeem-voucher \
    -d '{"code": "DISCOUNT50"}' &
done
wait
```

#### 6. RLS Bypass Check
```sql
-- In Supabase SQL Editor, test as different users:
-- Test 1: Can anonymous users see protected data?
SET request.jwt.claims = '{}';
SELECT * FROM items;  -- Should return NOTHING

-- Test 2: Can User A see User B's data?
SET request.jwt.claims = '{"sub": "user-a-id"}';
SELECT * FROM items WHERE user_id = 'user-b-id';  -- Should return NOTHING
```

#### 7. RLS Policy Enumeration (CRITICAL)

> 🚨 **REAL-WORLD BREACH**: During a security audit, the focus was on API route authentication, INSERT/UPDATE policies (linter warnings), and payment flows. But the `profiles` table had `USING (true)` on its SELECT policy since the first migration - **anyone could query ALL user profiles**. The hacker found it by simply querying each table with the anon key.

**The linter does NOT catch overly permissive SELECT policies. You MUST manually check.**

```sql
-- RUN THIS QUERY to audit ALL RLS policies on ALL tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,        -- USING clause - CHECK THIS FOR 'true' or missing user checks!
  with_check   -- WITH CHECK clause
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

**What to look for:**

| Red Flag | Risk | Example |
|----------|------|---------|
| `qual = 'true'` on SELECT | Anyone can read ALL data | `USING (true)` |
| `qual = 'true'` on DELETE | Anyone can delete ALL data | Catastrophic |
| Missing `auth.uid()` check | No user isolation | Data leak |
| `roles = '{anon}'` with permissive qual | Anonymous access to sensitive data | Public exposure |

```bash
# Hacker's enumeration technique - test this yourself FIRST
# Try querying each table with just the anon key
curl 'https://YOUR_PROJECT.supabase.co/rest/v1/profiles?select=*' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

curl 'https://YOUR_PROJECT.supabase.co/rest/v1/items?select=*' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# If you get data back, your RLS is broken!
```

**⚠️ Supabase JS Client Attack Vector:**

Remember: Your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are **PUBLIC** - visible in browser dev tools. Attackers can use them directly:

```javascript
// What a hacker does after grabbing your anon key from browser dev tools:
import { createClient } from '@supabase/supabase-js'

// Your public keys - anyone can see these!
const supabase = createClient(
  'https://YOUR_PROJECT.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // Your anon key
)

// Now they enumerate every table:
const { data: profiles } = await supabase.from('profiles').select('*')
const { data: items } = await supabase.from('items').select('*')
const { data: orders } = await supabase.from('orders').select('*')
const { data: users } = await supabase.from('user_roles').select('*')

// They can also try authenticated queries if they create an account:
await supabase.auth.signUp({ email: 'hacker@evil.com', password: 'password' })
// Now as authenticated user, they test what else they can access

// They can probe for tables you forgot to secure:
const tables = ['users', 'payments', 'transactions', 'secrets', 'admin', 'logs']
for (const table of tables) {
  const { data, error } = await supabase.from(table).select('*').limit(1)
  if (data) console.log(`EXPOSED: ${table}`, data)
}
```

**This is why RLS is your ONLY defense** - the anon key is designed to be public, and RLS must block unauthorized access.

**Test This Yourself:**

```typescript
// Create a test script to audit your own app:
// scripts/audit-rls.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const tables = ['profiles', 'items', 'user_roles', 'role_permissions']

async function auditAnonymousAccess() {
  console.log('=== Testing Anonymous Access ===')
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(5)
    if (error) {
      console.log(`✅ ${table}: Blocked (${error.message})`)
    } else if (data && data.length > 0) {
      console.log(`❌ ${table}: EXPOSED! Found ${data.length} rows`)
    } else {
      console.log(`✅ ${table}: Empty or blocked`)
    }
  }
}

async function auditAuthenticatedAccess() {
  // Sign in as a test user
  await supabase.auth.signInWithPassword({
    email: 'testuser@example.com',
    password: 'testpassword'
  })
  
  console.log('\n=== Testing Authenticated Access ===')
  for (const table of tables) {
    const { data, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
    console.log(`${table}: Can see ${count ?? 0} rows`)
  }
}

auditAnonymousAccess()
```

**Using Supabase MCP for RLS Auditing:**

The Supabase MCP tools can help you audit your database, but remember they don't catch everything (see [Supabase MCP Server Limitations](#supabase-mcp-server-limitations-critical)).

```
# 1. List all tables to know what to audit
Use: mcp_supabase_list_tables

# 2. Run the pg_policies query to see all RLS policies
Use: mcp_supabase_execute_sql
Query: SELECT schemaname, tablename, policyname, cmd, qual, with_check 
       FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, cmd;

# 3. Check Security Advisor (but don't fully trust it!)
Use: mcp_supabase_get_advisors (type: security)
Use: mcp_supabase_get_advisors (type: performance)

# 4. Test a specific table's access as anonymous
Use: mcp_supabase_execute_sql
Query: SET request.jwt.claims = '{}'; SELECT * FROM profiles LIMIT 5;

# 5. Check what data is exposed via REST API
Use: mcp_supabase_get_project_url (to get the API URL)
Then use curl to test enumeration as shown above
```

**Example MCP Audit Session:**

```sql
-- Step 1: List all policies (via mcp_supabase_execute_sql)
SELECT tablename, policyname, cmd, qual FROM pg_policies 
WHERE schemaname = 'public';

-- Step 2: Look for dangerous patterns
-- If you see qual = 'true' or qual like '%role()%' without uid check, investigate!

-- Step 3: Test the suspicious table
SET request.jwt.claims = '{}';
SELECT COUNT(*) FROM profiles;  -- Should be 0 for anon

SET request.jwt.claims = '{"sub": "some-random-uuid"}';
SELECT COUNT(*) FROM profiles;  -- Should be 1 (only own profile)
```

**RLS Audit Checklist:**

- [ ] Run `mcp_supabase_list_tables` to get all tables
- [ ] Run the `pg_policies` query via `mcp_supabase_execute_sql`
- [ ] Check EVERY table's SELECT policy has proper `auth.uid()` check
- [ ] Check EVERY table's INSERT/UPDATE/DELETE policies
- [ ] Run `mcp_supabase_get_advisors` for security AND performance
- [ ] **Also check Supabase Dashboard** - MCP misses some issues!
- [ ] Test with anon key - should return empty or 401
- [ ] Test as User A trying to access User B's data
- [ ] Don't trust the linter - it misses permissive SELECT policies

### Red Team Checklist for Every Feature

Before deploying, answer these questions:

#### Data Access
- [ ] Can unauthenticated users access this data?
- [ ] Can authenticated users access OTHER users' data?
- [ ] Can users modify data they don't own?
- [ ] Are all database queries using RLS (not service role)?

#### Value Manipulation
- [ ] Are prices/amounts validated server-side?
- [ ] Can users send negative values?
- [ ] Can users modify quantities/totals in requests?
- [ ] Are calculations done server-side, not client-side?

#### Payment/Transaction Security
- [ ] Is payment success verified with the payment provider?
- [ ] Are webhook signatures validated?
- [ ] Can payment callbacks be replayed?
- [ ] Are order amounts verified against what was actually paid?

#### State Manipulation
- [ ] Can users fake success states?
- [ ] Are there race conditions in critical operations?
- [ ] Is state transition validated (e.g., pending → paid → fulfilled)?
- [ ] Are idempotency keys used for critical operations?

#### Input Handling
- [ ] Is all user input validated and sanitized?
- [ ] Are file uploads validated (type, size, content)?
- [ ] Are URLs validated to prevent open redirects?
- [ ] Are SQL/NoSQL injection attempts blocked?

---

## 3. Authentication & Session Management

### Never Trust Client-Side Auth State for Security

```typescript
// ❌ WRONG: Using client state for authorization
const { isAdmin } = useAuthStore()
if (isAdmin) {
  // perform admin action - INSECURE!
}

// ✅ CORRECT: Always verify on server
// Server Component or API Route
const supabase = await createClient()
const { data, error } = await supabase.auth.getClaims()
if (error || !data?.claims) {
  redirect('/auth/error')
}
const { data: canAccess } = await supabase.rpc('authorize', { 
  requested_permission: 'admin.access' 
})
```

### Server-Side Auth Methods: getSession() vs getUser() vs getClaims()

> 🚨 **CRITICAL SECURITY**: Using the wrong method can allow attackers to spoof authentication!

| Method | What it does | Security | When to use |
|--------|--------------|----------|-------------|
| `getSession()` | Reads from cookies/local storage | ❌ **UNSAFE** - can be tampered | NEVER for security-critical code |
| `getUser()` | Makes request to Supabase Auth server | ✅ Safe - server-validated | When you need fresh user data |
| `getClaims()` | Validates JWT signature cryptographically | ✅ **RECOMMENDED** - fastest secure option | Most server-side auth checks |

**Why `getSession()` is Dangerous:**

```typescript
// ❌ DANGEROUS: getSession() reads from cookies WITHOUT validation
// An attacker can modify cookies in their browser to spoof any user!
const { data: { session } } = await supabase.auth.getSession()
const userId = session?.user?.id // COULD BE SPOOFED!
const role = session?.user?.app_metadata?.role // COULD BE SPOOFED!
```

**Why `getClaims()` is the Best Choice:**

```typescript
// ✅ SECURE: getClaims() validates the JWT signature cryptographically
// It uses Supabase's public keys to verify the token hasn't been tampered with
// Faster than getUser() because it doesn't make a network request to Auth server
const { data, error } = await supabase.auth.getClaims()

if (error || !data?.claims) {
  // Not authenticated or invalid/tampered JWT
  return unauthorized()
}

// These values are cryptographically verified and cannot be spoofed
const userId = data.claims.sub        // Verified user ID
const role = data.claims.user_role    // Verified role (from custom_access_token_hook)
const email = data.claims.email       // Verified email
```

**From Supabase Documentation:**

> "Be careful when protecting pages. The server gets the user session from the cookies, which can be spoofed by anyone."
> 
> "**Never** trust `supabase.auth.getSession()` inside server code such as Middleware. It isn't guaranteed to revalidate the Auth token."
> 
> "It's safe to trust `getClaims()` because it validates the JWT signature against the project's published public keys every time."

### Session Validation Pattern (Updated)

```typescript
// ❌ WRONG - NEVER use getSession() for security
const { data: { session } } = await supabase.auth.getSession()
const userId = session?.user?.id // Could be spoofed via cookie tampering!

// ⚠️ ACCEPTABLE - But slower (makes network request)
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) {
  redirect('/auth/error')
}
const userId = user.id // Verified by Supabase Auth server

// ✅ BEST - Fast AND secure (validates JWT locally)
const { data, error } = await supabase.auth.getClaims()
if (error || !data?.claims) {
  redirect('/auth/error')
}
const userId = data.claims.sub // Cryptographically verified
const role = data.claims.user_role // Custom claim from auth hook
```

### When to Use Each Method

| Scenario | Recommended Method |
|----------|-------------------|
| Checking if user is authenticated | `getClaims()` |
| Getting user ID for database queries | `getClaims()` → `claims.sub` |
| Getting custom claims (role, permissions) | `getClaims()` |
| Need fresh user metadata (name, avatar) | `getUser()` |
| Client-side (browser) - for UI only | `getSession()` is acceptable |
| Middleware/Server Components | `getClaims()` |
| API Routes protecting resources | `getClaims()` |

### Logout Must Clear All State

```typescript
logout: async () => {
  const client = get().supabase
  if (client) {
    await client.auth.signOut()
  }
  // Clear ALL sensitive state
  set({
    user: null,
    session: null,
    isSignedIn: false,
    role: null,
    isAdmin: false,
    isModerator: false,
  })
}
```

---

## 4. Server-Side Rendering (SSR) Safety

### The `hasMounted` Pattern (CRITICAL)

When using Zustand or any client state in Next.js, you MUST prevent hydration mismatches:

```typescript
"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/lib/store/auth-store"

export function MyComponent() {
  // Track if component has mounted (SSR hydration safety)
  const [hasMounted, setHasMounted] = useState(false)
  const { isSignedIn, isAdmin } = useAuthStore()
  
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Show consistent loading state during SSR and initial hydration
  if (!hasMounted) {
    return <LoadingSkeleton />
  }

  // Now safe to use auth state
  return isSignedIn ? <AuthenticatedUI /> : <PublicUI />
}
```

### Why This Matters

1. **Server renders with default state** (isSignedIn: false)
2. **Client hydrates with potentially different state** (isSignedIn: true if logged in)
3. **Mismatch causes React hydration error**
4. **Solution**: Render identical content on server and initial client, then update

### Components That MUST Use This Pattern

- Any component displaying auth-dependent UI
- Components showing user-specific data
- Components with role-based visibility (admin links, etc.)
- Any component using Zustand store with `persist` middleware

### Browser Detection for Store Initialization

```typescript
// In Zustand stores, check for browser environment
const isBrowser = typeof window !== 'undefined'

const useMyStore = create<MyState>()((set, get) => ({
  // Default to safe values for SSR
  isLoading: !isBrowser, // true on server, false on client
  
  initialize: () => {
    // Skip initialization on server
    if (!isBrowser) return
    
    // Safe to use browser APIs here
  }
}))
```

---

## 5. Row Level Security (RLS) Policies

### Golden Rules

1. **ALWAYS enable RLS on tables containing user data**
2. **Default deny** - no policy means no access
3. **Never use `security definer` without extreme caution**
4. **Test policies with different user contexts**

### Policy Templates

#### User-Owned Data (Most Common)

```sql
-- Users can only see their own data
CREATE POLICY "Users can view own data"
ON my_table FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only insert their own data
CREATE POLICY "Users can insert own data"
ON my_table FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own data
CREATE POLICY "Users can update own data"
ON my_table FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own data
CREATE POLICY "Users can delete own data"
ON my_table FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

#### Admin Access Pattern

```sql
-- Admins can view all data (uses authorize function)
CREATE POLICY "Admins can view all data"
ON my_table FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id  -- Own data
  OR 
  (SELECT authorize('admin.read'))  -- Or has admin permission
);
```

#### Public Read, Authenticated Write

```sql
-- Anyone can read
CREATE POLICY "Public read access"
ON public_content FOR SELECT
TO anon, authenticated
USING (true);

-- Only authenticated users can write
CREATE POLICY "Authenticated write access"
ON public_content FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);
```

### Storage Bucket Policies

```sql
-- ALWAYS make user data buckets private
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-files', 'user-files', false);  -- public = false!

-- Users can only access their own folder
CREATE POLICY "Users access own folder"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'user-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Testing RLS Policies

```sql
-- Test as a specific user
SET request.jwt.claims = '{"sub": "user-uuid-here"}';
SELECT * FROM my_table;  -- Should only see that user's data

-- Test as anonymous
SET request.jwt.claims = '{}';
SELECT * FROM my_table;  -- Should see nothing (or only public data)
```

### Database Security Advisor Issues (CRITICAL)

> 🚨 **LESSON LEARNED**: The Supabase Security Advisor flagged critical issues that could expose sensitive data. Always check the Dashboard after schema changes.

#### Use Functions Instead of Views for Sensitive Data

**Problem**: Views that query `auth.users` expose user data to all authenticated users, even with RLS.

```sql
-- ❌ WRONG: View exposes auth.users to all authenticated users
-- Security Advisor Error: "Exposed Auth Users"
-- Security Advisor Error: "Security Definer View"
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
  u.id,
  u.email,
  u.created_at,
  ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id;

GRANT SELECT ON public.admin_users_view TO authenticated;
-- ⚠️ ANY authenticated user can now see ALL users' emails!
```

```sql
-- ✅ CORRECT: Use a security definer FUNCTION with explicit permission check
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  full_name text,
  avatar_url text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Explicit admin check BEFORE returning any data
  IF NOT public.authorize('admin.access') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    u.raw_user_meta_data->>'full_name' AS full_name,
    u.raw_user_meta_data->>'avatar_url' AS avatar_url,
    COALESCE(ur.role::text, 'user') AS role
  FROM auth.users u
  LEFT JOIN public.user_roles ur ON u.id = ur.user_id;
END;
$$;

-- Function enforces its own permission check
GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;
```

**Why Functions Are Safer:**

| Aspect | View | Function |
|--------|------|----------|
| Permission Check | Cannot enforce custom checks | Can check permissions before returning data |
| `auth.users` Access | Exposes to all with SELECT grant | Only returns data if permission check passes |
| Security Definer | ❌ Flagged as security issue | ✅ Allowed and expected pattern |
| RLS Bypass | Views bypass RLS by design | Functions can enforce custom access control |

#### Always Set `search_path` on Security Definer Functions

**Problem**: Functions without `SET search_path` can be exploited via search path injection.

```sql
-- ❌ WRONG: Missing search_path - Security Advisor Error
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- ✅ CORRECT: Always set search_path to empty string
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- Prevents search path injection attacks
AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (new.id, new.email);
  RETURN new;
END;
$$;
```

#### Use `(SELECT auth.uid())` for Performance

**Problem**: Using `auth.uid()` directly in RLS policies causes per-row function re-evaluation.

```sql
-- ❌ WRONG: auth.uid() evaluated for EVERY row - Performance Advisor Warning
CREATE POLICY "Users can view own items"
ON items FOR SELECT
USING (auth.uid() = user_id);

-- ✅ CORRECT: Subquery evaluated ONCE, then used as constant
CREATE POLICY "Users can view own items"
ON items FOR SELECT
USING ((SELECT auth.uid()) = user_id);
```

**Performance Impact:**

| Pattern | 1,000 rows | 100,000 rows |
|---------|------------|--------------|
| `auth.uid()` | 1,000 function calls | 100,000 function calls |
| `(SELECT auth.uid())` | 1 function call | 1 function call |

#### Add Indexes for Foreign Keys

**Problem**: Missing indexes on foreign key columns cause slow queries.

```sql
-- ✅ CORRECT: Always index foreign key columns
CREATE INDEX idx_items_user_id ON public.items(user_id);
CREATE INDEX idx_user_roles_created_by ON public.user_roles(created_by);
```

#### Security Advisor Checklist for Schema Changes

After ANY migration or schema change:

- [ ] Check Supabase Dashboard > Database > Security Advisor
- [ ] **0 Errors** required before deployment
- [ ] Review all Warnings
- [ ] Verify no views expose `auth.users`
- [ ] All `security definer` functions have `SET search_path = ''`
- [ ] All RLS policies use `(SELECT auth.uid())` pattern
- [ ] Foreign key columns have indexes

---

## 6. Service Role Key - DANGER ZONE

> 🚨 **REAL-WORLD BREACH**: Using the service role key to bypass RLS policies led to a complete userbase compromise. An attacker exploited API routes that used service role, gaining access to ALL user data.

### The Service Role Key Bypasses ALL Security

```typescript
// The service role key is GOD MODE - it bypasses RLS completely
import { createClient } from '@supabase/supabase-js'

// ❌ EXTREMELY DANGEROUS - This client can access EVERYTHING
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // BYPASSES ALL RLS!
)

// With this client, an attacker who finds a vulnerability can:
// - Read ALL users' data
// - Modify ANY record
// - Delete ANYTHING
// - Impersonate ANY user
```

### NEVER Use Service Role Key For:

- ❌ User-facing API routes
- ❌ Any route that handles user input
- ❌ Fetching user-specific data
- ❌ CRUD operations on user data
- ❌ Authentication flows
- ❌ ANY operation where RLS should apply

### The ONLY Acceptable Uses:

```typescript
// ✅ Server-side admin scripts (NOT API routes)
// ✅ Database migrations
// ✅ Scheduled jobs with no user input
// ✅ Initial setup/seeding (development only)

// Example: A scheduled job that runs server-side with no user input
// cron-job.ts (server-side script, NOT an API route)
async function cleanupExpiredSessions() {
  const adminClient = createServiceRoleClient()
  // This is acceptable because:
  // 1. No user input
  // 2. Not exposed via API
  // 3. Runs in controlled environment
  await adminClient.from('sessions').delete().lt('expires_at', new Date())
}
```

### Always Use Regular Client with RLS

```typescript
// ✅ CORRECT: Always use the regular client with RLS
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  // This client respects RLS - users can only see their own data
  const supabase = await createClient()
  
  const { data } = await supabase.from('items').select('*')
  // RLS ensures this only returns the current user's items
  
  return NextResponse.json({ data })
}
```

### If You MUST Use Service Role (Extreme Caution)

```typescript
// If absolutely necessary (rare), add multiple layers of protection:
export async function dangerousAdminOperation(request: Request) {
  const supabase = await createClient()
  
  // 1. Verify user with cryptographically validated JWT
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 2. Verify admin permission via RLS-respecting client
  const { data: isAdmin } = await supabase.rpc('authorize', {
    requested_permission: 'admin.access'
  })
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // 3. Validate and sanitize ALL input
  const body = await request.json()
  const validated = adminActionSchema.safeParse(body)
  if (!validated.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  
  // 4. Log the action for audit trail
  console.log(`Admin action by ${user.id}: ${JSON.stringify(validated.data)}`)
  
  // 5. Only NOW use service role for the specific operation
  const adminClient = createServiceRoleClient()
  // ... perform operation
}
```

---

## 7. Payment Gateway Security

> 🚨 **REAL-WORLD BREACH**: An attacker created fraudulent vouchers by sending fake payment success callbacks and manipulating transaction amounts. The system trusted client-side success indicators instead of verifying with the payment provider.

### Golden Rules of Payment Security

1. **NEVER trust client-side payment status**
2. **ALWAYS verify with payment provider server-side**
3. **ALWAYS validate webhook signatures**
4. **ALWAYS compare amounts (paid vs. expected)**
5. **Use idempotency keys to prevent replay attacks**

### Attack Pattern: Fake Success Callback

```typescript
// ❌ VULNERABLE: Trusting client-side success indicator
export async function POST(request: Request) {
  const { orderId, paymentStatus } = await request.json()
  
  // WRONG! Attacker can send: { orderId: "123", paymentStatus: "success" }
  if (paymentStatus === 'success') {
    await fulfillOrder(orderId)  // Attacker gets free stuff!
  }
}
```

### Secure Payment Verification Pattern

```typescript
// ✅ CORRECT: Always verify with payment provider
export async function handlePaymentCallback(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-payment-signature')
  
  // 1. Verify webhook signature
  const isValidSignature = verifyWebhookSignature(body, signature, WEBHOOK_SECRET)
  if (!isValidSignature) {
    console.error('Invalid webhook signature - possible attack')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }
  
  const payload = JSON.parse(body)
  const { transactionId, orderId, amount, status } = payload
  
  // 2. Get the original order from YOUR database
  const order = await getOrder(orderId)
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  
  // 3. Check idempotency - prevent replay attacks
  if (order.payment_verified) {
    console.log('Payment already processed - possible replay attack')
    return NextResponse.json({ message: 'Already processed' })
  }
  
  // 4. Verify with payment provider directly (don't trust webhook alone)
  const paymentDetails = await paymentProvider.getTransaction(transactionId)
  
  // 5. Verify the amount matches
  if (paymentDetails.amount !== order.total_amount) {
    console.error(`Amount mismatch! Expected: ${order.total_amount}, Got: ${paymentDetails.amount}`)
    await flagSuspiciousOrder(orderId)
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
  }
  
  // 6. Verify the status is actually successful
  if (paymentDetails.status !== 'completed') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
  }
  
  // 7. Now safe to fulfill
  await fulfillOrder(orderId)
  await markPaymentVerified(orderId, transactionId)
  
  return NextResponse.json({ success: true })
}
```

### Webhook Signature Verification

```typescript
// Example: Stripe webhook verification
import Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!
  
  let event: Stripe.Event
  
  try {
    // This verifies the webhook came from Stripe
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  
  // Now safe to process the event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    await handleSuccessfulPayment(paymentIntent)
  }
}
```

### Prevent Price Manipulation

```typescript
// ❌ VULNERABLE: Using price from client
export async function createOrder(request: Request) {
  const { productId, price, quantity } = await request.json()
  
  // WRONG! Attacker sends: { productId: "123", price: 1, quantity: 1 }
  const total = price * quantity  // Attacker pays $1 for $100 item!
  await createPaymentIntent(total)
}

// ✅ CORRECT: Get price from YOUR database
export async function createOrder(request: Request) {
  const supabase = await createClient()
  const { productId, quantity } = await request.json()  // Only accept ID and quantity
  
  // Get the REAL price from your database
  const { data: product } = await supabase
    .from('products')
    .select('price')
    .eq('id', productId)
    .single()
  
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
  
  // Calculate total using YOUR price, not client's
  const total = product.price * quantity
  
  // Store the expected amount with the order
  const { data: order } = await supabase
    .from('orders')
    .insert({
      product_id: productId,
      quantity,
      unit_price: product.price,  // Store for verification later
      total_amount: total,
      status: 'pending'
    })
    .select()
    .single()
  
  // Create payment intent with the correct amount
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100),  // Convert to cents
    currency: 'usd',
    metadata: { orderId: order.id }
  })
  
  return NextResponse.json({ clientSecret: paymentIntent.client_secret })
}
```

### Order State Machine

```typescript
// Enforce valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  'pending': ['payment_processing', 'cancelled'],
  'payment_processing': ['paid', 'payment_failed', 'cancelled'],
  'paid': ['processing', 'refunded'],
  'processing': ['shipped', 'refunded'],
  'shipped': ['delivered', 'refunded'],
  'delivered': ['refunded'],
  // Terminal states
  'payment_failed': [],
  'cancelled': [],
  'refunded': [],
}

async function updateOrderStatus(orderId: string, newStatus: string) {
  const order = await getOrder(orderId)
  
  const allowedTransitions = VALID_TRANSITIONS[order.status] || []
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(`Invalid transition: ${order.status} → ${newStatus}`)
  }
  
  await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)
}
```

---

## 8. API & Route Protection

### Middleware Protection Pattern

```typescript
// lib/supabase/proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  const supabase = createServerClient(/* config */)
  
  // Get verified claims (cryptographically validated JWT)
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  
  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    // Verify admin permission server-side
    const { data: isAdmin } = await supabase.rpc('authorize', {
      requested_permission: 'admin.access'
    })
    
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
  
  return response
}
```

### API Route Protection

```typescript
// app/api/admin/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Always verify user with cryptographically validated JWT
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Always verify permissions for sensitive operations
  const { data: canAccess } = await supabase.rpc('authorize', {
    requested_permission: 'admin.access'
  })
  
  if (!canAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Safe to proceed - user ID is data.claims.sub
}
```

---

## 9. Input Validation & Sanitization

### Never Trust User Input

```typescript
// ❌ WRONG: Using user input directly
const { searchTerm } = await request.json()
const results = await supabase
  .from('items')
  .select('*')
  .ilike('title', `%${searchTerm}%`)  // SQL injection risk!

// ✅ CORRECT: Validate and sanitize
import { z } from 'zod'

const searchSchema = z.object({
  searchTerm: z.string().max(100).regex(/^[a-zA-Z0-9\s]*$/)
})

const { searchTerm } = searchSchema.parse(await request.json())
// Now safe to use
```

### URL Validation (Prevent Open Redirects)

```typescript
// ❌ WRONG: Redirecting to user-provided URL
const redirectTo = request.nextUrl.searchParams.get('redirect')
return NextResponse.redirect(redirectTo)  // Open redirect!

// ✅ CORRECT: Whitelist allowed destinations
const ALLOWED_REDIRECTS = ['/', '/dashboard', '/profile']

function getSafeRedirect(url: string | null): string {
  if (!url) return '/'
  
  // Only allow relative paths
  if (url.startsWith('/') && !url.startsWith('//')) {
    // Check against whitelist or validate path
    const pathname = url.split('?')[0]
    if (ALLOWED_REDIRECTS.includes(pathname)) {
      return url
    }
  }
  
  return '/'
}
```

---

## 10. File Upload Security

### Validate File Types Server-Side

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function uploadFile(file: File, userId: string) {
  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type')
  }
  
  // Validate size
  if (file.size > MAX_SIZE) {
    throw new Error('File too large')
  }
  
  // Use user-scoped path
  const path = `${userId}/${crypto.randomUUID()}-${file.name}`
  
  // Upload to private bucket
  const { error } = await supabase.storage
    .from('user-files')  // Private bucket
    .upload(path, file)
}
```

### Generate Signed URLs for Access

```typescript
// Don't expose direct URLs to private files
// Generate short-lived signed URLs instead

const { data } = await supabase.storage
  .from('user-files')
  .createSignedUrl(path, 60)  // 60 seconds expiry
```

---

## 11. Environment Variables

### Required Security Configuration

```env
# .env.local (NEVER commit this file)

# Supabase - Use service role ONLY on server
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Safe for client
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # NEVER expose to client!

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com  # For redirect validation
```

### Environment Variable Rules

1. **Never prefix secrets with `NEXT_PUBLIC_`** - they'll be exposed to client
2. **Service role key is God mode** - only use in server-side code
3. **Always use `.env.local`** for secrets, never `.env`
4. **Add `.env.local` to `.gitignore`**

---

## 12. Error Handling

### Never Expose Internal Errors

```typescript
// ❌ WRONG: Exposing internal details
catch (error) {
  return NextResponse.json({ 
    error: error.message,  // Could expose DB schema, etc.
    stack: error.stack     // Never expose stack traces!
  }, { status: 500 })
}

// ✅ CORRECT: Generic error messages
catch (error) {
  console.error('Internal error:', error)  // Log for debugging
  return NextResponse.json({ 
    error: 'An unexpected error occurred' 
  }, { status: 500 })
}
```

### Auth Error Sanitization

```typescript
// Don't reveal whether email exists
// ❌ "User with this email not found"
// ✅ "Invalid credentials"

// Don't reveal password requirements on login
// ❌ "Password must be 8 characters"
// ✅ "Invalid credentials"
```

---

## 13. RBAC Implementation

### Database-Level Authorization

```sql
-- The authorize function is the single source of truth
CREATE OR REPLACE FUNCTION public.authorize(
  requested_permission app_permission
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.app_role;
BEGIN
  -- Get role from JWT claims (set by custom_access_token_hook)
  SELECT (auth.jwt() -> 'app_metadata' ->> 'user_role')::public.app_role 
  INTO user_role;

  RETURN EXISTS (
    SELECT 1
    FROM public.role_permissions
    WHERE role = user_role
    AND permission = requested_permission
  );
END;
$$;
```

### Permission Checking Pattern

```typescript
// Server-side permission check
async function checkPermission(permission: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('authorize', {
    requested_permission: permission
  })
  return data === true
}

// Usage
if (await checkPermission('items.delete')) {
  // Can delete items
}

if (await checkPermission('admin.access')) {
  // Can access admin panel
}
```

### Role Hierarchy

```typescript
// Roles inherit permissions from lower roles
const ROLE_HIERARCHY: Record<AppRole, AppRole[]> = {
  user: [],
  moderator: ['user'],
  admin: ['user', 'moderator'],
}

// Admin has all permissions of moderator and user
// Moderator has all permissions of user
// User has base permissions only
```

---

## 14. Domain Security Verification

> After connecting a custom domain to your application, you MUST verify that DNS, SSL, and email security are properly configured.

### MXToolbox Domain Check (REQUIRED)

After connecting your domain, run a comprehensive check at **https://mxtoolbox.com/**

#### Step-by-Step Verification

1. **Go to https://mxtoolbox.com/**
2. **Run SuperTool check**: Enter your domain and click "SuperTool"
3. **Check each category below**

#### Critical Checks to Run

| Tool | URL | What It Checks |
|------|-----|----------------|
| **DNS Check** | `mxtoolbox.com/DNSLookup.aspx` | DNS records, propagation |
| **MX Lookup** | `mxtoolbox.com/MXLookup.aspx` | Email server configuration |
| **SPF Record** | `mxtoolbox.com/spf.aspx` | Email spoofing protection |
| **DKIM Check** | `mxtoolbox.com/dkim.aspx` | Email authentication |
| **DMARC Check** | `mxtoolbox.com/DMARC.aspx` | Email policy enforcement |
| **SSL Check** | `mxtoolbox.com/ssl.aspx` | SSL certificate validity |
| **Blacklist Check** | `mxtoolbox.com/blacklists.aspx` | Domain reputation |

#### Email Security Records (Prevent Spoofing)

If your app sends emails (auth emails, notifications), you MUST configure:

```dns
# SPF Record - Authorizes who can send email for your domain
# Add as TXT record for your domain
v=spf1 include:_spf.google.com include:amazonses.com ~all

# DMARC Record - Policy for failed authentication
# Add as TXT record for _dmarc.yourdomain.com
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com

# DKIM - Usually configured through your email provider
# Verify it's working with mxtoolbox.com/dkim.aspx
```

#### SSL/TLS Verification

```bash
# Quick SSL check from terminal
curl -vI https://yourdomain.com 2>&1 | grep -E "SSL|certificate|expire"

# Or use mxtoolbox SSL check for detailed report
# https://mxtoolbox.com/ssl.aspx
```

#### Domain Security Checklist

**After Initial Domain Setup:**

- [ ] DNS records propagated (check with DNS Lookup)
- [ ] SSL certificate valid and not expiring soon
- [ ] No SSL vulnerabilities (weak ciphers, etc.)
- [ ] Domain not on any blacklists

**If Sending Emails:**

- [ ] SPF record configured and valid
- [ ] DKIM record configured and valid  
- [ ] DMARC record configured
- [ ] Test email deliverability (send test to mail-tester.com)

**Periodic Checks (Monthly):**

- [ ] SSL certificate expiry date (automate alerts)
- [ ] Domain blacklist status
- [ ] Email deliverability score

#### What Failures Mean

| Issue | Risk | Fix |
|-------|------|-----|
| No SPF record | Emails marked as spam, spoofing possible | Add SPF TXT record |
| No DMARC | No policy for failed auth | Add DMARC TXT record |
| SSL expiring | Site will show security warnings | Renew certificate |
| On blacklist | Emails blocked, reputation damaged | Request delisting, investigate cause |
| Weak SSL ciphers | Vulnerable to attacks | Update server SSL config |

#### Recommended Tools

- **MXToolbox**: https://mxtoolbox.com/ - Comprehensive DNS/email checks
- **SSL Labs**: https://ssllabs.com/ssltest/ - Deep SSL analysis  
- **Mail-Tester**: https://mail-tester.com/ - Email deliverability scoring
- **DNS Checker**: https://dnschecker.org/ - Global DNS propagation

---

## 15. Security Testing Checklist

### Before Every PR

- [ ] Run Semgrep scan: `mcp_semgrep_semgrep_scan`
- [ ] Check for hardcoded secrets
- [ ] Verify all user inputs are validated
- [ ] Confirm RLS policies cover new tables
- [ ] Test auth flows (login, logout, session expiry)
- [ ] Verify error messages don't leak info

### After Adding New Features

- [ ] Test as unauthenticated user
- [ ] Test as authenticated user (different user)
- [ ] Test as admin
- [ ] Attempt to access other users' data
- [ ] Test with invalid/malformed inputs
- [ ] Check browser console for exposed data

### Periodic Security Audit

- [ ] Run `mcp_semgrep_semgrep_scan_supply_chain`
- [ ] Review all RLS policies
- [ ] Check for unused permissions
- [ ] Audit admin access logs
- [ ] Review error logs for attack patterns
- [ ] Update dependencies with security patches

---

## Quick Reference: Security Patterns

| Scenario | Pattern |
|----------|---------|
| Client auth UI | Use `hasMounted` state |
| Server authorization | Use `supabase.auth.getClaims()` + `authorize()` RPC |
| User data access | RLS with `auth.uid() = user_id` |
| Admin operations | Verify via `authorize('admin.*')` |
| File uploads | Private bucket + user-scoped paths |
| Redirects | Whitelist allowed destinations |
| Error responses | Generic messages, log details server-side |
| Environment secrets | Never use `NEXT_PUBLIC_` prefix |
| Service role key | NEVER use in API routes |
| Payment verification | Always verify server-side with provider |
| Price/amounts | NEVER trust client values |
| Webhooks | ALWAYS verify signatures |

---

## Tools to Use

### Semgrep MCP Tools

```
mcp_semgrep_semgrep_scan          - Scan code files for vulnerabilities
mcp_semgrep_semgrep_scan_supply_chain - Scan dependencies for vulnerabilities
mcp_semgrep_semgrep_scan_with_custom_rule - Scan with custom rules
mcp_semgrep_semgrep_rule_schema   - Get rule schema for custom rules
mcp_semgrep_semgrep_findings      - Get findings from Semgrep platform
```

### When to Run Security Scans

1. **Before committing** - Scan all modified files
2. **After adding dependencies** - Run supply chain scan
3. **Before merging PRs** - Full scan of changed files
4. **Weekly** - Full codebase scan
5. **After security incidents** - Full audit with custom rules

---

## AI-Assisted Security Audit (MANDATORY)

Before deploying any new feature, use this prompt with Copilot:

```
Perform a comprehensive security audit on [feature/code]. Think like a malicious 
hacker and find every possible way to:

1. Bypass authentication or authorization
2. Access data belonging to other users
3. Manipulate prices, quantities, or financial values
4. Create fake success states or bypass payment verification
5. Exploit race conditions for duplicate rewards
6. Inject malicious payloads
7. Escalate privileges
8. Exfiltrate sensitive data

For EACH vulnerability found:
- Show the exact attack (curl command or code)
- Rate severity (Critical/High/Medium/Low)
- Provide the secure fix

Also check:
- Are RLS policies protecting all tables?
- Is service role key used anywhere it shouldn't be?
- Are all prices/amounts from the server, not client?
- Are webhook signatures verified?
- Are error messages leaking information?

Run Semgrep scan on all files involved.
```

---

## Remember

> **Security is not a feature, it's a requirement.**
> 
> Every line of code that handles user data, authentication, or authorization is a potential attack vector. When in doubt, add more protection, not less.

> ⚠️ **Attackers are creative.** They will find attack vectors you never imagined. The only defense is to assume everything can be exploited and verify everything server-side.

> 🔴 **Real breaches happen to real projects.** Service role key bypass led to complete userbase exposure. Payment verification trust led to fraudulent transactions. These aren't theoretical - they happened. Don't let them happen to you.

---

*Last updated: January 2026*
*Template version: 1.0.0*
*Includes lessons from real-world security breaches*
