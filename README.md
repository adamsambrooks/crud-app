<h1 align="center">
  <a href="https://safdarjamal.github.io/crud-app/">
    CRUD App
  </a>
</h1>

<p align="center">
  <a href="https://github.com/SafdarJamal/crud-app/actions?query=workflow%3A%22Node.js+CI%22">
    <img src="https://github.com/SafdarJamal/crud-app/workflows/Node.js%20CI/badge.svg" alt="Node.js CI" />
  </a>
  <a href="https://github.com/SafdarJamal/crud-app/releases">
    <img src="https://img.shields.io/github/v/release/SafdarJamal/crud-app" alt="GitHub Release (latest by date)" />
  </a>
  <a href="https://github.com/SafdarJamal/crud-app/blob/master/LICENSE">
    <img src="https://img.shields.io/github/license/SafdarJamal/crud-app" alt="License" />
  </a>
</p>

<p align="center">
  A modern employee management <a href="https://www.codecademy.com/articles/what-is-crud">CRUD</a> application built with <a href="https://nextjs.org">Next.js 15</a> and <a href="https://tailwindcss.com">Tailwind CSS</a>.
</p>

## Technologies Used

- [Next.js 15](https://nextjs.org) - React framework with App Router
- [React 19](http://reactjs.org) - UI library
- [TypeScript](https://www.typescriptlang.org) - Type safety
- [Prisma](https://www.prisma.io) - Next-generation ORM
- [SQLite](https://www.sqlite.org) - Embedded database
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [SweetAlert2](https://sweetalert2.github.io) - Beautiful alerts and modals
- [Turbopack](https://turbo.build/pack) - Fast bundler for development

## Features

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Server-side authentication with HTTP-only cookies
- ✅ Protected routes with Next.js middleware
- ✅ RESTful API routes
- ✅ SQLite database with Prisma ORM
- ✅ Type-safe database queries
- ✅ Responsive design with Tailwind CSS
- ✅ TypeScript for type safety
- ✅ Modern Next.js App Router architecture

## Development

To get a local copy of the code, clone it using git:

```bash
git clone https://github.com/SafdarJamal/crud-app.git
cd crud-app
```

Install dependencies:

```bash
npm install
```

Set up the database:

```bash
# Create database and apply schema
npm run db:push

# Seed with sample data (10 employees)
npm run migrate-data
```

Now, you can start the development server with Turbopack:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

### Default Credentials

- **Email**: admin@example.com
- **Password**: qwerty

### Available Scripts

| Script               | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| `npm run dev`        | Runs the app in development mode with Turbopack                |
| `npm run build`      | Builds the app for production                                  |
| `npm start`          | Runs the production build                                      |
| `npm run lint`       | Runs ESLint to check code quality                              |
| `npm run db:push`    | Push Prisma schema to database (creates/updates DB)            |
| `npm run db:studio`  | Open Prisma Studio (database GUI)                              |
| `npm run migrate-data` | Seed database with 10 sample employee records                |

## Architecture

This app uses the **Next.js App Router** with:
- **Server Components** for improved performance
- **API Routes** for backend logic (`/app/api`)
- **Prisma ORM** for type-safe database access
- **SQLite** for embedded database storage
- **Middleware** for authentication (`middleware.ts`)
- **Client Components** for interactive UI (`'use client'`)
- **File-based routing** instead of manual route configuration

## Project Structure

```
crud-app/
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers
│   │   ├── auth/         # Authentication endpoints
│   │   └── employees/    # Employee CRUD endpoints
│   ├── dashboard/         # Protected dashboard page
│   ├── login/            # Login page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/            # Reusable React components
├── lib/                   # Shared utilities and types
│   ├── auth.ts           # Authentication helpers
│   ├── db.ts             # Prisma client & database utilities
│   ├── data.ts           # Seed data
│   └── types.ts          # TypeScript types
├── prisma/                # Prisma ORM
│   ├── schema.prisma     # Database schema
│   └── dev.db            # SQLite database (gitignored)
├── scripts/               # Utility scripts
│   └── migrate-data.ts   # Database seeding script
└── middleware.ts          # Next.js middleware for auth
```

## Migration from React

This project has been migrated from Create React App to Next.js 15. Key improvements:

- **Server-side rendering** for better performance
- **API routes** for backend logic (no separate backend needed)
- **SQLite + Prisma ORM** instead of file-based JSON storage
- **Type-safe database queries** with auto-generated types
- **HTTP-only cookies** instead of localStorage for better security
- **Fixed ID collision bug** from the original implementation
- **Auto-incrementing database IDs** instead of manual calculation
- **Unique email constraints** enforced at database level
- **TypeScript** for type safety throughout
- **Tailwind CSS** for modern styling
- **Turbopack** for faster development builds

See `CLAUDE.md` for detailed architecture documentation and development guides.

## Credits

CRUD App is built and maintained by [Safdar Jamal](https://safdarjamal.github.io).

Migrated to Next.js 15 with modern best practices.

## License

CRUD App is open-source software licensed under the [MIT License](https://github.com/SafdarJamal/crud-app/blob/master/LICENSE).
