# 🌾 AgriTrade

A mobile marketplace connecting rice farmers directly with consumers in the Philippines.

## 📁 Project Structure

```
agritrade/
├── backend/          # NestJS API server (TypeScript)
├── mobile/           # React Native + Expo mobile app
└── backend-legacy/   # Legacy Express backend (deprecated)
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ ([download](https://nodejs.org/))
- **PostgreSQL** v14+ ([download](https://www.postgresql.org/download/))
- **Expo Go** app on your phone (for testing)

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Initialize database tables
psql -U postgres -d postgres -f init.sql

# Seed sample data
npm run seed

# Start the server
npm run start:dev
```

### 2. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Start Expo (for development)
npx expo start
```

---

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

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Server
PORT=3000
```

---

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

**Configuration:**
1. Set `PRIMARY_DB_URL` to your local PostgreSQL
2. Optionally set `WAREHOUSE_DB_URL` for Supabase backup
3. Set `SYNC_ENABLED=true` to enable warehouse sync

**Database GUI Tools:** Navicat, pgAdmin, DBeaver, TablePlus - connect to `localhost:5432`

---

## 🐳 Docker Support

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

---

## 🔐 Test Accounts

All seeded accounts use password: `password123`

| Role | Email |
|------|-------|
| Admin | admin@agritrade.com |
| Farmer | juan.farmer@example.com |
| Farmer | maria.farmer@example.com |
| Farmer | pedro.farmer@example.com |
| Consumer | consumer1@example.com |
| Consumer | consumer2@example.com |

---

## 🛠️ Available Scripts

### Backend (`/backend`)

| Command | Description |
|---------|-------------|
| `npm run start` | Start production server |
| `npm run start:dev` | Start with hot-reload |
| `npm run seed` | Seed database with sample data |
| `npm run build` | Build for production |

### Mobile (`/mobile`)

| Command | Description |
|---------|-------------|
| `npx expo start` | Start Expo dev server |
| `npx expo start --lan` | Start in LAN mode |
| `npx expo start --tunnel` | Start with public tunnel |

---

## 📖 API Endpoints

Base URL: `http://localhost:3000/api`

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
| GET | `/products` | Get farmer's products |
| POST | `/products` | Create new product |
| GET | `/orders` | Get farmer's orders |

### Consumer (`/api/consumer`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get consumer profile |
| GET | `/products/search` | Search products |
| GET | `/homepage` | Get homepage data |
| GET | `/cart` | Get cart items |
| POST | `/cart` | Add to cart |
| GET | `/favorites` | Get favorites |

### Admin (`/api/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| GET | `/analytics` | Get platform analytics |
| GET | `/verifications/pending` | Get pending verifications |

---

## 🗂️ Backend Structure

```
backend/
├── src/
│   ├── admin/           # Admin module
│   ├── auth/            # Authentication (JWT, guards)
│   ├── consumer/        # Consumer module
│   ├── database/        # Database connection & seeding
│   ├── farmers/         # Farmers module
│   ├── products/        # Products module
│   ├── users/           # Users module
│   └── main.ts          # Entry point
├── init.sql             # Database schema
└── package.json
```

---

## 📱 Testing on Physical Device (via Hotspot)

### Step 1: Find your hotspot IP
```bash
ip addr show | grep "inet " | grep -v "127.0.0.1"
# Look for 192.168.12.1 (typical hotspot IP)
```

### Step 2: Update mobile API URL
Edit `mobile/services/api.js`:
```javascript
const defaultRoot = Platform.OS === 'android' 
  ? 'http://192.168.12.1:3000'  // Your hotspot IP
  : 'http://localhost:3000';
```

### Step 3: Allow firewall access
```bash
sudo ufw allow 3000/tcp
```

### Step 4: Connect phone
1. Connect phone to your laptop's WiFi hotspot
2. Open Expo Go app
3. Scan QR code or enter: `exp://192.168.12.1:8081`

---

## 🔧 Troubleshooting

### Port 3000 already in use
```bash
lsof -ti:3000 | xargs kill -9
```

### Database connection failed
```bash
sudo systemctl status postgresql
psql -U postgres -d postgres -c "SELECT 1"
```

### Mobile can't connect
1. Ensure backend running on `0.0.0.0`
2. Open firewall: `sudo ufw allow 3000/tcp`
3. Verify IP: `ip addr show | grep "192.168"`

---

## 📄 License

This project is licensed under the MIT License.
