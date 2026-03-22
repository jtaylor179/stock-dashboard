# Stock Dashboard — Build Brief

Build a modern React + NestJS dashboard connected to an existing Supabase backend.

## Stack
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend:** NestJS + TypeScript
- **Database:** Supabase (PostgreSQL) — already exists, DO NOT modify schema
- **Charts:** Recharts or Tremor for data visualization

## Supabase Connection
- Project ID: xjvhgjupwroavlnkzkze
- Region: us-east-1
- Use Supabase JS client (@supabase/supabase-js)
- All tables are in `portfolio_manager` schema
- Connection URL: https://xxx.supabase.co
- Anon key will be provided via env var SUPABASE_ANON_KEY
- Service role key via SUPABASE_SERVICE_KEY

## Database Schema (READ ONLY — do not alter)

### portfolio_manager.watchlist
- id (uuid PK)
- security_id (FK to security)
- status: 'active' | 'watching' | 'building' | 'passed' | 'sold'
- conviction (integer 1-10)
- entry_rsi (numeric) — RSI threshold to trigger buy
- entry_price_low (numeric) — lower bound of entry zone
- entry_price_high (numeric) — upper bound of entry zone
- target_entry_price (numeric)
- cc_target_shares (integer, default 100)
- cc_cost (numeric) — cost for 100 shares
- thesis (text)
- updated_at (timestamp)

### portfolio_manager.security
- security_id (uuid PK)
- symbol (varchar) 
- security_name (varchar)
- security_type (varchar)

### portfolio_manager.portfolio
- portfolio_id (uuid PK)
- portfolio_name (varchar)
- owner_id (uuid)

### portfolio_manager.position
- position_id (uuid PK)
- security_id (FK)
- portfolio_id (FK)
- quantity (numeric)
- purchase_price (numeric)

### portfolio_manager.security_analyses
- id (uuid PK)
- security_id (FK)
- analysis_type (varchar)
- sentiment (varchar)
- conviction (integer)
- narrative (text)
- metrics (jsonb)
- created_at (timestamp)

## Dashboard Pages

### 1. Master Rankings (Main Page)
A sortable, filterable table showing the full pipeline:
- Rank (by conviction DESC)
- Symbol + Name
- Conviction (1-10, color-coded: 8+ green, 6-7 yellow, <6 gray)
- Jeff Screen Score (from thesis text, parse "X/7")
- Status (building/active/watching/passed — color badges)
- Entry Zone (entry_price_low - entry_price_high)
- RSI Gate (entry_rsi)
- Trigger Status (compute from current data: triggered/approaching/not close)
- CC Cost (formatted $XX,XXX)
- Current Price (fetch via Yahoo Finance API or show last known)
- Thesis (expandable row or tooltip)

Filters: by status, by conviction range
Sort: by conviction (default), by symbol, by CC cost

### 2. Portfolio View
Show FrankPortfolio and ETF Portfolio:
- Holdings with quantity, cost basis, current value, P/L %, P/L $
- Portfolio-level totals
- Pie chart of allocation

Portfolio IDs:
- FrankPortfolio: 9337772d-f399-45f7-85bf-892e478cc702
- ETF Portfolio: 54860aa8-f04c-4520-a010-b8333a8e7a6f
- BobPortfolio: 3672bfa3-0583-47a7-a400-b402712e1181

### 3. Analysis View
For each security, show stored analyses from security_analyses table:
- Fundamentals, technicals, AI threat assessment, thesis summary
- Timeline of analyses (sorted by created_at)

## Design Requirements
- Dark mode by default (trader aesthetic)
- Responsive but desktop-first
- Clean, minimal, professional
- Color scheme: dark background (#0a0a0a), green for gains/bullish (#22c55e), red for losses/bearish (#ef4444), blue for neutral (#3b82f6)
- Font: Inter or similar clean sans-serif

## Project Structure
```
/apps
  /web (React frontend - Vite)
  /api (NestJS backend)
/packages
  /shared (shared types/interfaces)
```

Use a monorepo with npm workspaces.

## Getting Started
1. Backend should proxy Supabase queries (don't expose keys to frontend)
2. Add a /api/watchlist endpoint that returns master rankings
3. Add a /api/portfolios/:id endpoint for portfolio positions
4. Add a /api/securities/:id/analyses endpoint for analyses
5. Frontend fetches from NestJS API

## Environment Variables (.env)
```
SUPABASE_URL=https://xjvhgjupwroavlnkzkze.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
PORT=3001
```

When completely finished, run this command to notify me:
openclaw system event --text "Done: Stock dashboard built — React + NestJS + Supabase. Run with npm run dev" --mode now
