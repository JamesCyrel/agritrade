#!/bin/bash

# AgriTrade Setup Script
# This script sets up the development environment

set -e

echo "🌾 AgriTrade Setup Script"
echo "========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js v18+${NC}"
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}⚠️  Node.js version is < 18. Recommended: v18+${NC}"
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v)${NC}"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  psql not found. Make sure PostgreSQL is installed and accessible${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL $(psql --version | head -1)${NC}"
fi

echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo -e "${GREEN}✅ Backend dependencies installed${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file from example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created. Please edit it with your database credentials.${NC}"
    else
        echo -e "${YELLOW}⚠️  No .env.example found. Creating default .env...${NC}"
        cat > .env << EOF
# Database
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:5432/postgres

# JWT Secret (change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Server Port
PORT=3000
EOF
        echo -e "${GREEN}✅ Default .env file created${NC}"
    fi
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

echo ""
echo "📦 Installing mobile dependencies..."
cd ../mobile
npm install
echo -e "${GREEN}✅ Mobile dependencies installed${NC}"

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "========================="
echo "📋 Next Steps:"
echo "========================="
echo ""
echo "1. Edit backend/.env with your database credentials"
echo ""
echo "2. Initialize the database:"
echo "   cd backend"
echo "   psql -U postgres -d postgres -f init.sql"
echo ""
echo "3. Seed sample data:"
echo "   npm run seed"
echo ""
echo "4. Start the backend:"
echo "   npm run start"
echo ""
echo "5. In another terminal, start the mobile app:"
echo "   cd mobile"
echo "   npx expo start"
echo ""
echo "========================="
echo "🔐 Test Accounts (password: password123)"
echo "========================="
echo "Admin:    admin@agritrade.com"
echo "Farmer:   juan.farmer@example.com"
echo "Consumer: consumer1@example.com"
echo ""
echo "Happy coding! 🚀"
