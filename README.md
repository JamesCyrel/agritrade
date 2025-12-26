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
npm run start
```

### 2. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Start Expo (for development)
npx expo start
```

## 📱 Testing on Physical Device (via Hotspot)

When testing on a physical device using your laptop as a WiFi hotspot:

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

### Step 4: Start services
```bash
# Terminal 1 - Backend
cd backend
npm run start

# Terminal 2 - Mobile (with correct IP)
cd mobile
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.12.1 npx expo start --lan
```

### Step 5: Connect phone
1. Connect phone to your laptop's WiFi hotspot
2. Open Expo Go app
3. Scan QR code or enter: `exp://192.168.12.1:8081`

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
| `npx expo start --clear` | Clear cache and start |

## 🔧 Troubleshooting

### "Network Error" on mobile
1. Ensure backend is running on `0.0.0.0` (all interfaces)
2. Check firewall: `sudo ufw allow 3000/tcp`
3. Verify phone is connected to the same network as laptop
4. Check API URL in `mobile/services/api.js`

### "Port 3000 already in use"
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### "Failed to download remote update" in Expo Go
Use LAN mode instead of tunnel when on hotspot:
```bash
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.12.1 npx expo start --lan
```

### Database connection issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -d postgres -c "SELECT 1"
```

## 📖 API Documentation

Base URL: `http://localhost:3000/api`

### Auth
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify JWT token

### Farmer
- `GET /api/farmer/profile` - Get farmer profile
- `PUT /api/farmer/profile` - Update profile
- `GET /api/farmer/products` - Get farmer's products
- `POST /api/farmer/products` - Create product

### Consumer
- `GET /api/consumer/profile` - Get consumer profile
- `GET /api/consumer/products/search` - Search products
- `GET /api/consumer/homepage` - Get homepage data

## 📄 License

This project is licensed under the MIT License.
