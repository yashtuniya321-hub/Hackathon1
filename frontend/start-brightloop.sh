#!/bin/bash
# Brightloop Software — 1-Click System Launcher
# Launches both the Node.js + PostgreSQL Backend (Port 4000) and the React Frontend (Port 5173)

echo "=========================================================="
echo "🚀 Booting Brightloop Software Subscription System"
echo "   Odoo x Flux Hackathon 2026"
echo "=========================================================="

BACKEND_DIR="/Users/riteshsg/Documents/Backend"
FRONTEND_DIR="/Users/riteshsg/Downloads/Subscription Management System"

# 1. Start Backend if not already running
if curl -s http://localhost:4000/ > /dev/null; then
  echo "✓ Backend API is already running on http://localhost:4000"
else
  echo "▶ Starting Backend Server on http://localhost:4000..."
  cd "$BACKEND_DIR" && node src/server.js &
  sleep 2
fi

# 2. Start Frontend
echo "▶ Starting Frontend Client on http://localhost:5173..."
cd "$FRONTEND_DIR" && npx vite --port 5173 --host
