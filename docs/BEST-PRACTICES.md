# Best Practices for Micro SaaS Template

> Guidelines for writing clean, maintainable, and performant code in this project.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [TypeScript Best Practices](#2-typescript-best-practices)
3. [React & Next.js Patterns](#3-react--nextjs-patterns)
4. [State Management](#4-state-management)
5. [Database & Supabase](#5-database--supabase)
6. [Component Architecture](#6-component-architecture)
7. [Performance Optimization](#7-performance-optimization)
8. [Error Handling](#8-error-handling)
9. [Testing Guidelines](#9-testing-guidelines)
10. [Code Style & Conventions](#10-code-style--conventions)

---

## 1. Project Structure

### Directory Organization

```
├── app/                    # Next.js App Router pages
│   ├── (routes)/          # Route groups for organization
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # Reusable UI primitives (shadcn)
│   └── [feature]/         # Feature-specific components
├── hooks/                 # Custom React hooks
├── lib/
│   ├── store/            # Zustand stores
│   ├── supabase/         # Supabase client utilities
│   ├── rbac/             # Role-based access control
│   ├── types/            # TypeScript type definitions
│   └── utils.ts          # General utilities
├── docs/                  # Documentation
└── supabase/
    └── migrations/        # Database migrations
```

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case | `auth-dialog.tsx` |
| Hooks | camelCase with `use` prefix | `use-items.ts` |
| Utilities | kebab-case | `utils.ts` |
| Types | kebab-case with `.types` suffix | `database.types.ts` |
| Pages | folder-based routing | `app/admin/page.tsx` |

### Import Order

```typescript
// 1. React/Next.js imports
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

// 2. Third-party libraries
import { z } from "zod"

// 3. Internal components (absolute imports)
import { Button } from "@/components/ui/button"
import { AuthDialog } from "@/components/auth-dialog"

// 4. Hooks and utilities
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"

// 5. Types
import type { Database } from "@/lib/types/database.types"
```

---

## 2. TypeScript Best Practices

### Use Database Types as Single Source of Truth

```typescript
// ✅ CORRECT: Derive types from database.types.ts
import type { Database } from "@/lib/types/database.types"

type Item = Database['public']['Tables']['items']['Row']
type InsertItem = Database['public']['Tables']['items']['Insert']
type UpdateItem = Database['public']['Tables']['items']['Update']

// ❌ WRONG: Manually defining types that duplicate database schema
interface Item {
  id: string
  title: string
  // ... duplicates database schema
}
```

### NEVER Manually Edit database.types.ts (CRITICAL)

> ⚠️ **AUTO-GENERATED FILE**: The `lib/types/database.types.ts` file is auto-generated from your database schema. NEVER edit it manually - your changes will be overwritten.

**Always regenerate types after database changes:**

```bash
# After ANY migration or schema change, run:
supabase gen types typescript --local > lib/types/database.types.ts

# Or if using remote database:
supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/types/database.types.ts
```

**When to Regenerate Types:**

| Event | Action Required |
|-------|----------------|
| Added/modified migration | ✅ Regenerate types |
| Ran `supabase db reset` | ✅ Regenerate types |
| Added new table/column | ✅ Regenerate types |
| Changed RLS policies | ❌ No regeneration needed |
| Added database function | ✅ Regenerate types |
| Changed enum values | ✅ Regenerate types |

**Type Generation Checklist:**

- [ ] Run migration or make schema changes
- [ ] Run `supabase gen types typescript --local > lib/types/database.types.ts`
- [ ] Verify no TypeScript errors in your codebase
- [ ] Commit both the migration AND the updated types file together

```typescript
// ❌ WRONG: Manually adding types to database.types.ts
// This file will be overwritten!
export type MyCustomType = {
  id: string
  // ...
}

// ✅ CORRECT: Create custom types in a separate file
// lib/types/custom.types.ts
import type { Database } from './database.types'

export type ItemWithProfile = Database['public']['Tables']['items']['Row'] & {
  profile: Database['public']['Tables']['profiles']['Row']
}
```

### Type Inference Over Explicit Types

```typescript
// ✅ Let TypeScript infer when possible
const items = await supabase.from('items').select('*')
// items.data is automatically typed

// ✅ Use satisfies for type checking without widening
const config = {
  maxItems: 100,
  allowedTypes: ['image', 'video'],
} satisfies Config

// ❌ Avoid unnecessary type annotations
const count: number = items.length  // number is inferred
```

### Strict Null Checks

```typescript
// ✅ Handle null/undefined explicitly
const user = session?.user
if (!user) {
  return redirect('/login')
}
// user is now guaranteed to exist

// ✅ Use nullish coalescing
const name = user.name ?? 'Anonymous'

// ❌ Don't use non-null assertion without validation
const userId = session!.user!.id  // Dangerous!
```

### Generic Patterns

```typescript
// ✅ Type-safe API responses
type ApiResponse<T> = {
  data: T | null
  error: string | null
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url)
    const data = await response.json()
    return { data, error: null }
  } catch (e) {
    return { data: null, error: 'Failed to fetch' }
  }
}
```

---

## 3. React & Next.js Patterns

### Server vs Client Components

```typescript
// Server Component (default) - No "use client" directive
// ✅ Use for: Data fetching, SEO content, static rendering
export default async function Page() {
  const data = await fetchData()  // Direct async/await
  return <div>{data.title}</div>
}

// Client Component - Has "use client" directive
// ✅ Use for: Interactivity, browser APIs, state, effects
"use client"
export function InteractiveWidget() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### Component Composition

```typescript
// ✅ Compose server and client components
// Server Component (page.tsx)
export default async function DashboardPage() {
  const items = await getItems()  // Server-side fetch
  
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Pass server data to client component */}
      <ItemsClient initialItems={items} />
    </div>
  )
}

// Client Component (items-client.tsx)
"use client"
export function ItemsClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems)
  // Interactive logic here
}
```

### The `hasMounted` Pattern for Hydration Safety

```typescript
"use client"

import { useState, useEffect } from "react"

export function AuthDependentComponent() {
  const [hasMounted, setHasMounted] = useState(false)
  const { isSignedIn } = useAuthStore()
  
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Render loading state during SSR and initial hydration
  if (!hasMounted) {
    return <Skeleton />  // Same on server and client
  }

  // Safe to use client state after mount
  return isSignedIn ? <Dashboard /> : <LoginPrompt />
}
```

### When to Use This Pattern

| Scenario | Use `hasMounted`? |
|----------|-------------------|
| Auth-dependent UI | ✅ Yes |
| User-specific data display | ✅ Yes |
| Role-based visibility | ✅ Yes |
| Zustand store with persist | ✅ Yes |
| Static content | ❌ No |
| Server-fetched data | ❌ No |

### Route Handlers (API Routes)

```typescript
// app/api/items/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  // Always verify user with cryptographically validated JWT
  // NEVER use getSession() - it can be spoofed via cookie tampering
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // User ID is available as data.claims.sub
  const { data: items, error: dbError } = await supabase
    .from('items')
    .select('*')
  
  if (dbError) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
  
  return NextResponse.json({ data: items })
}
```

---

## 4. State Management

### Zustand Store Structure

```typescript
// lib/store/my-store.ts
import { create } from 'zustand'

const isBrowser = typeof window !== 'undefined'

interface MyState {
  // State
  items: Item[]
  isLoading: boolean
  
  // Actions
  fetchItems: () => Promise<void>
  addItem: (item: Item) => void
  reset: () => void
}

const initialState = {
  items: [],
  isLoading: false,
}

export const useMyStore = create<MyState>()((set, get) => ({
  ...initialState,
  
  fetchItems: async () => {
    if (!isBrowser) return  // Skip on server
    
    set({ isLoading: true })
    try {
      const items = await fetchItemsFromAPI()
      set({ items, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
    }
  },
  
  addItem: (item) => {
    set((state) => ({ items: [...state.items, item] }))
  },
  
  reset: () => set(initialState),
}))
```

### Selective Subscriptions

```typescript
// ✅ Subscribe to specific slices (better performance)
const items = useMyStore((state) => state.items)
const isLoading = useMyStore((state) => state.isLoading)

// ❌ Avoid subscribing to entire store
const store = useMyStore()  // Re-renders on ANY state change
```

### When to Use Different State Solutions

| State Type | Solution |
|------------|----------|
| Server data | React Query / SWR / Server Components |
| UI state (modals, tabs) | `useState` |
| Form state | React Hook Form |
| Global client state | Zustand |
| URL state | `useSearchParams` |

---

## 5. Database & Supabase

### Query Patterns

```typescript
// ✅ Select only needed columns
const { data } = await supabase
  .from('items')
  .select('id, title, created_at')  // Specific columns
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(20)

// ❌ Avoid selecting everything when not needed
const { data } = await supabase
  .from('items')
  .select('*')  // Fetches all columns
```

### Joins and Relations

```typescript
// ✅ Use Supabase's relation syntax
const { data } = await supabase
  .from('items')
  .select(`
    id,
    title,
    profiles (
      id,
      full_name,
      avatar_url
    )
  `)
  .eq('id', itemId)
  .single()
```

### Transactions with RPC

```typescript
// For complex operations, use database functions
const { data, error } = await supabase.rpc('transfer_item', {
  item_id: itemId,
  new_owner_id: newOwnerId
})
```

### Real-time Subscriptions

```typescript
// ✅ Clean up subscriptions
useEffect(() => {
  const channel = supabase
    .channel('items-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'items' },
      (payload) => handleChange(payload)
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)  // Cleanup!
  }
}, [])
```

---

## 6. Component Architecture

### Component Size Guidelines

```typescript
// ✅ Single responsibility - one main purpose
export function ItemCard({ item }: { item: Item }) {
  return (
    <Card>
      <CardHeader>{item.title}</CardHeader>
      <CardContent>{item.description}</CardContent>
    </Card>
  )
}

// ❌ Avoid: Component doing too many things
export function ItemCardWithEditingAndDeletingAndSharing() {
  // Too much logic in one component
}
```

### Props Interface Pattern

```typescript
// ✅ Clear, documented props
interface ItemCardProps {
  /** The item to display */
  item: Item
  /** Called when the item is clicked */
  onClick?: (id: string) => void
  /** Whether to show the action buttons */
  showActions?: boolean
  /** Additional CSS classes */
  className?: string
}

export function ItemCard({ 
  item, 
  onClick, 
  showActions = true,
  className 
}: ItemCardProps) {
  // ...
}
```

### Compound Components

```typescript
// ✅ Flexible composition
<Card>
  <Card.Header>
    <Card.Title>My Card</Card.Title>
    <Card.Description>Optional description</Card.Description>
  </Card.Header>
  <Card.Content>
    Main content here
  </Card.Content>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>
```

### Custom Hooks for Logic Extraction

```typescript
// ✅ Extract complex logic into hooks
function useItemOperations() {
  const [isLoading, setIsLoading] = useState(false)
  
  const createItem = async (data: InsertItem) => {
    setIsLoading(true)
    try {
      const result = await supabase.from('items').insert(data)
      return { success: true, data: result.data }
    } catch (error) {
      return { success: false, error }
    } finally {
      setIsLoading(false)
    }
  }
  
  return { createItem, isLoading }
}

// Usage
function CreateItemForm() {
  const { createItem, isLoading } = useItemOperations()
  // ...
}
```

---

## 7. Performance Optimization

### Image Optimization

```typescript
import Image from 'next/image'

// ✅ Use Next.js Image component
<Image
  src={item.image_url}
  alt={item.title}
  width={300}
  height={200}
  placeholder="blur"
  blurDataURL={item.blur_hash}
/>

// ❌ Avoid unoptimized images
<img src={item.image_url} />
```

### Lazy Loading

```typescript
import dynamic from 'next/dynamic'

// ✅ Lazy load heavy components
const HeavyChart = dynamic(() => import('@/components/heavy-chart'), {
  loading: () => <Skeleton className="h-64" />,
  ssr: false,  // Disable SSR for client-only components
})
```

### Memoization

```typescript
import { memo, useMemo, useCallback } from 'react'

// ✅ Memoize expensive computations
const sortedItems = useMemo(() => {
  return items.sort((a, b) => b.date - a.date)
}, [items])

// ✅ Memoize callbacks passed to children
const handleDelete = useCallback((id: string) => {
  deleteItem(id)
}, [deleteItem])

// ✅ Memoize components that receive stable props
const MemoizedItem = memo(ItemCard)
```

### Pagination

```typescript
// ✅ Implement pagination for large datasets
const PAGE_SIZE = 20

const { data } = await supabase
  .from('items')
  .select('*', { count: 'exact' })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
```

---

## 8. Error Handling

### Error Boundaries

```typescript
// components/error-boundary.tsx
"use client"

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback: ReactNode
}

export class ErrorBoundary extends Component<Props, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}
```

### Async Error Handling

```typescript
// ✅ Consistent error handling pattern
async function fetchItems(): Promise<Result<Item[]>> {
  try {
    const { data, error } = await supabase.from('items').select('*')
    
    if (error) {
      console.error('Database error:', error)
      return { success: false, error: 'Failed to fetch items' }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
```

### User-Friendly Error Messages

```typescript
// ✅ Map technical errors to user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  '23505': 'This item already exists',
  '23503': 'Referenced item not found',
  'PGRST116': 'Item not found',
  default: 'Something went wrong. Please try again.',
}

function getUserMessage(error: PostgrestError): string {
  return ERROR_MESSAGES[error.code] ?? ERROR_MESSAGES.default
}
```

---

## 9. Testing Guidelines

### Test File Organization

```
├── __tests__/
│   ├── components/
│   │   └── item-card.test.tsx
│   ├── hooks/
│   │   └── use-items.test.ts
│   └── utils/
│       └── helpers.test.ts
```

### Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ItemCard } from '@/components/item-card'

describe('ItemCard', () => {
  const mockItem = {
    id: '1',
    title: 'Test Item',
    description: 'Test description',
  }

  it('renders item title', () => {
    render(<ItemCard item={mockItem} />)
    expect(screen.getByText('Test Item')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<ItemCard item={mockItem} onClick={handleClick} />)
    fireEvent.click(screen.getByRole('article'))
    expect(handleClick).toHaveBeenCalledWith('1')
  })
})
```

### Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react'
import { useItems } from '@/hooks/use-items'

describe('useItems', () => {
  it('creates an item', async () => {
    const { result } = renderHook(() => useItems())
    
    await act(async () => {
      await result.current.createItem({ title: 'New Item' })
    })
    
    expect(result.current.items).toContainEqual(
      expect.objectContaining({ title: 'New Item' })
    )
  })
})
```

---

## 10. Code Style & Conventions

### Naming Conventions

```typescript
// Components: PascalCase
export function UserProfile() {}

// Hooks: camelCase with 'use' prefix
export function useUserData() {}

// Utilities: camelCase
export function formatDate(date: Date) {}

// Constants: SCREAMING_SNAKE_CASE
export const MAX_FILE_SIZE = 5 * 1024 * 1024

// Types/Interfaces: PascalCase
interface UserProfile {}
type AppRole = 'admin' | 'user'

// Boolean variables: is/has/can/should prefix
const isLoading = true
const hasPermission = false
const canEdit = true
```

### Function Patterns

```typescript
// ✅ Early returns for guard clauses
function processItem(item: Item | null) {
  if (!item) return null
  if (!item.isActive) return null
  
  // Main logic here
  return transformItem(item)
}

// ✅ Destructure props
function ItemCard({ title, description, onClick }: ItemCardProps) {
  // ...
}

// ✅ Use arrow functions for callbacks
const handleClick = () => {
  // ...
}
```

### Comment Guidelines

```typescript
// ✅ Explain "why", not "what"
// Delay initialization to avoid SSR hydration mismatch
useEffect(() => {
  setHasMounted(true)
}, [])

// ✅ Document complex logic
/**
 * Calculates the user's permission level based on their role
 * and any temporary elevated permissions they may have.
 * 
 * @param user - The user object with role information
 * @returns The effective permission level (0-100)
 */
function calculatePermissionLevel(user: User): number {
  // ...
}

// ❌ Avoid obvious comments
// Set loading to true
setLoading(true)
```

### File Length Guidelines

| File Type | Recommended Max Lines |
|-----------|----------------------|
| Component | 200-300 |
| Hook | 100-150 |
| Utility | 50-100 |
| Store | 150-200 |

If a file exceeds these limits, consider splitting it.

---

## Quick Reference

### Do's ✅

- Use TypeScript strict mode
- Derive types from `database.types.ts`
- Use `hasMounted` for auth-dependent UI
- Handle all error cases
- Write self-documenting code
- Use early returns
- Keep components focused
- Clean up subscriptions and effects

### Don'ts ❌

- Don't duplicate database types manually
- Don't ignore TypeScript errors
- Don't use `any` type
- Don't trust client state for security
- Don't expose internal errors to users
- Don't create components with multiple responsibilities
- Don't skip error handling
- Don't leave console.logs in production

---

## Related Documentation

- [SECURITY-GUIDELINES.md](./SECURITY-GUIDELINES.md) - Security-specific guidelines
- [QUICKSTART.md](./QUICKSTART.md) - Getting started guide
- [TEMPLATE-SUMMARY.md](./TEMPLATE-SUMMARY.md) - Template overview

---

*Last updated: January 2026*
*Template version: 1.0.0*
