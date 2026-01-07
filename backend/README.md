# 🌾 AgriTrade Backend

NestJS-based REST API for the AgriTrade mobile marketplace.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database URL

# Initialize database
psql -U postgres -d postgres -f init.sql

# Seed sample data
npm run seed

# Start server
npm run start
```

## ⚙️ Environment Variables

Create a `.env` file in the backend directory:

```env
# Primary Database (Local PostgreSQL) - All reads/writes
PRIMARY_DB_URL=postgresql://postgres:postgres@localhost:5432/postgres

# Data Warehouse (Supabase) - Optional, for backup/analytics
# WAREHOUSE_DB_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@pooler.supabase.com:6543/postgres

# Sync Configuration (Local → Supabase)
SYNC_ENABLED=false
SYNC_INTERVAL_MS=60000

# Legacy support
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:5432/postgres

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Server
PORT=3000
```

## 🔄 Database Architecture

The backend uses **Local PostgreSQL as primary** with optional Supabase data warehouse:

```
┌─────────────────┐     READ/WRITE     ┌──────────────────────┐
│  NestJS Backend │ ◄────────────────► │  Local PostgreSQL    │
└─────────────────┘                    │  (Primary)           │
                                       └──────────────────────┘
                                               │
                                               │ Sync (optional)
                                               ▼
                                       ┌──────────────────────┐
                                       │  Supabase            │
                                       │  (Data Warehouse)    │
                                       └──────────────────────┘
```

### How it works:
- **All operations** → Local PostgreSQL (fast, zero latency)
- **Warehouse sync** → Optional periodic backup to Supabase

### Configuration:
1. Set `PRIMARY_DB_URL` to your local PostgreSQL
2. Optionally set `WAREHOUSE_DB_URL` for Supabase backup
3. Set `SYNC_ENABLED=true` to enable warehouse sync

### Usage in code:
```typescript
// Inject DatabaseService
constructor(private db: DatabaseService) {}

// All queries go to local PostgreSQL
await this.db.query('SELECT * FROM users');
await this.db.query('INSERT INTO users...');
```

## 🐳 Docker Support

Start the database and backend with Docker:

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

Services:
- PostgreSQL: `localhost:5433`
- Backend API: `localhost:3001`

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start` | Start production server |
| `npm run start:dev` | Start with hot-reload (watch mode) |
| `npm run start:debug` | Start with debugger |
| `npm run build` | Build for production |
| `npm run seed` | Seed database with sample data |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |

## 🗃️ Database Setup

### Initialize Tables
```bash
psql -U postgres -d postgres -f init.sql
```

### Seed Sample Data
```bash
npm run seed
```

This creates:
- 1 Admin user
- 3 Farmer users (with profiles and products)
- 2 Consumer users (with addresses)
- 6 Products (with sack sizes)

### Test Accounts
All use password: `password123`

| Role | Email |
|------|-------|
| Admin | admin@agritrade.com |
| Farmer | juan.farmer@example.com |
| Farmer | maria.farmer@example.com |
| Farmer | pedro.farmer@example.com |
| Consumer | consumer1@example.com |
| Consumer | consumer2@example.com |

## 🌐 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Register new user |
| POST | `/login` | Login and get JWT |
| GET | `/verify` | Verify JWT token |

### Farmer (`/api/farmer`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get farmer profile |
| PUT | `/profile` | Update farmer profile |
| POST | `/verification/documents` | Upload verification docs |
| GET | `/verification/status` | Get verification status |

### Products (`/api/farmer/products`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all farmer products |
| POST | `/` | Create new product |
| GET | `/:productId` | Get product by ID |
| PUT | `/:productId` | Update product |
| POST | `/:productId/archive` | Archive product |
| POST | `/:productId/unarchive` | Unarchive product |
| PUT | `/:productId/inventory` | Update inventory |

### Consumer (`/api/consumer`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get consumer profile |
| PUT | `/profile` | Update consumer profile |
| GET | `/products/search` | Search products |
| GET | `/homepage` | Get homepage data |

### Admin (`/api/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| GET | `/verifications/pending` | Get pending verifications |

## 📱 Mobile Development

When testing with a mobile device via hotspot, the backend listens on all interfaces (`0.0.0.0`).

### Allow firewall access
```bash
sudo ufw allow 3000/tcp
```

### Verify backend is accessible
From your phone's browser (connected to hotspot):
```
http://192.168.12.1:3000/
```
Should return: `Hello World!`

## 🗂️ Project Structure

```
backend/
├── src/
│   ├── admin/           # Admin module
│   ├── auth/            # Authentication (JWT, guards)
│   ├── common/          # Shared utilities
│   ├── consumer/        # Consumer module
│   ├── database/        # Database connection & seeding
│   ├── farmers/         # Farmers module
│   ├── products/        # Products module
│   ├── users/           # Users module
│   ├── app.module.ts    # Main app module
│   └── main.ts          # Entry point
├── init.sql             # Database schema
├── .env                 # Environment variables
└── package.json
```

## 🔧 Troubleshooting

### Port already in use
```bash
lsof -ti:3000 | xargs kill -9
```

### Database connection failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -d postgres -c "SELECT 1"
```

### Mobile can't connect
1. Ensure listening on `0.0.0.0` (check `src/main.ts`)
2. Open firewall: `sudo ufw allow 3000/tcp`
3. Verify IP: `ip addr show | grep "192.168"`

## 📄 License

MIT License
