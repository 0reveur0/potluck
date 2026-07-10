# Potluck

A private, credit-based peer-to-peer tutoring and knowledge-sharing platform. Students bring skills to share inside private **Potluck Tables** (clans), trading tutoring sessions for credits.

## Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Replit built-in PostgreSQL (via `pg` pool)
- **Auth**: iron-session v8 (cookie-based, no external auth provider)
- **Frontend**: React 18, Tailwind CSS, Framer Motion, Lucide Icons
- **Password hashing**: bcryptjs

## Running the app
```
npm run dev    # starts on port 5000
```

## First-time setup
1. The first user to register at `POST /api/auth/register` is automatically promoted to Super Admin.
2. Visit `/admin` while logged in as admin to manage Potluck Tables.

## Dev admin credentials
- Email: `admin@potluck.dev`
- Password: `potluck123`

## Key routes
| Path | Description |
|---|---|
| `/` | Landing page |
| `/admin` | Super Admin dashboard (create tables, view inventory) |
| `POST /api/auth/register` | Sign up (first user = admin) |
| `POST /api/auth/login` | Sign in |
| `POST /api/auth/logout` | Sign out |
| `GET  /api/auth/me` | Current session |
| `POST /api/admin/tables` | Create a new Potluck Table |
| `GET  /api/admin/tables` | List all tables with member counts |

## Schema
- `profiles` — global user accounts with bcrypt-hashed passwords
- `tables` — private clans with unique 6-char alphanumeric join codes
- `table_members` — bridge: per-clan isolated credit balances (50 credits on join)
- `study_posts` — offer_to_teach / request_to_learn posts inside a clan
- `matches` — escrow tracking when a post is claimed
- `messages` — in-match chat

## User preferences
