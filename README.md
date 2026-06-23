# Micro-SaaS Template

A production-ready, security-hardened Next.js 16 template for building micro-SaaS applications with authentication, RBAC, database, file uploads, and modern UI components.

## Documentation

- **[Full Documentation](./docs/README.md)** - Complete guide with features, architecture, and customization
- **[Quick Start Guide](./docs/QUICKSTART.md)** - Get up and running in 5 minutes
- **[Technical Summary](./docs/TEMPLATE-SUMMARY.md)** - Architecture details and security implementation
- **[Setup Checklist](./docs/CHECKLIST.md)** - Step-by-step setup checklist

## Quick Start

```bash
# Install dependencies
pnpm install

# Start Supabase
supabase start

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with credentials from supabase start output

# Start development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app!

## What's Included

- ✅ **Authentication**: Google OAuth with Supabase
- ✅ **RBAC**: Role-based access control (User, Moderator, Admin)
- ✅ **Admin Dashboard**: User management with role assignment
- ✅ **Security**: Defense in depth (Middleware → Server → RLS)
- ✅ **Database**: PostgreSQL with Row Level Security
- ✅ **File Uploads**: Private Supabase Storage
- ✅ **State Management**: Zustand with SSR support
- ✅ **UI Components**: 40+ shadcn/ui components
- ✅ **TypeScript**: Strict mode with auto-generated DB types
- ✅ **Responsive**: Mobile-first design with dark mode

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth with Custom JWT Claims
- **Storage**: Supabase Storage (Private)
- **State**: Zustand
- **UI**: shadcn/ui + Tailwind CSS
- **Language**: TypeScript (Strict)

## Security Features

| Feature | Description |
|---------|-------------|
| RBAC | Three roles with JWT-embedded permissions |
| Defense in Depth | Middleware → Server → Database authorization |
| RLS | Row Level Security on all tables |
| Private Storage | User-scoped file access |
| Error Sanitization | No sensitive data leaks in production |

## Project Structure

```
├── app/                    # Next.js app router pages
│   └── admin/             # Admin dashboard (protected)
├── components/            # React components
│   ├── admin/            # Admin-specific components
│   └── ui/               # shadcn/ui components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configurations
│   ├── rbac/            # Role-based access control
│   ├── store/           # Zustand stores
│   ├── supabase/        # Supabase clients & middleware
│   └── types/           # Auto-generated database types
├── supabase/            # Database migrations & config
└── docs/                # Full documentation
```

## License

MIT - Feel free to use this template for your projects!

## Support

For detailed documentation and guides, see the [docs](./docs) folder.

---

**Version**: 2.0.0 | **Security Audit**: Passed (Semgrep - 0 vulnerabilities)
