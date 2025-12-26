#!/bin/bash

# Start AgriTrade in Development Mode (with Hotspot support)
# This script starts both backend and mobile with the correct IP for hotspot testing

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🌾 AgriTrade Development Server${NC}"
echo "================================="
echo ""

# Find hotspot IP (usually 192.168.12.1 for Wi-Hotspot)
HOTSPOT_IP=$(ip addr show | grep -E "inet 192\.168\.12\." | awk '{print $2}' | cut -d'/' -f1 | head -1)

# If no hotspot IP, try getting the main network IP
if [ -z "$HOTSPOT_IP" ]; then
    HOTSPOT_IP=$(ip addr show | grep -E "inet 192\.168\." | grep -v "127.0.0.1" | awk '{print $2}' | cut -d'/' -f1 | head -1)
fi

if [ -z "$HOTSPOT_IP" ]; then
    echo -e "${YELLOW}⚠️  Could not detect network IP. Using localhost${NC}"
    HOTSPOT_IP="localhost"
else
    echo -e "${GREEN}✅ Detected IP: $HOTSPOT_IP${NC}"
fi

echo ""
echo "Starting services..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $MOBILE_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${CYAN}📡 Starting Backend on port 3000...${NC}"
cd backend
npm run start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 5

# Start mobile with correct IP
echo ""
echo -e "${CYAN}📱 Starting Mobile (Expo) in LAN mode...${NC}"
cd mobile
REACT_NATIVE_PACKAGER_HOSTNAME=$HOTSPOT_IP npx expo start --lan &
MOBILE_PID=$!
cd ..

echo ""
echo "================================="
echo -e "${GREEN}✅ Services Started!${NC}"
echo "================================="
echo ""
echo -e "Backend API:  ${CYAN}http://$HOTSPOT_IP:3000${NC}"
echo -e "Expo:         ${CYAN}exp://$HOTSPOT_IP:8081${NC}"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait
