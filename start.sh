#!/bin/bash
# Brightloop Software — 1-Click Launch Script
# Starts the full-stack server (serving both the React UI and REST API on http://localhost:4000)

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================================="
echo "🚀 Booting Brightloop Software Subscription System"
echo "   Odoo x Flux Hackathon 2026"
echo "=========================================================="

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

if [ ! -d "data/postgres" ]; then
  echo "Seeding initial PostgreSQL database (2,500+ records)..."
  npm run seed
fi

echo "▶ Starting Unified Server on http://localhost:4000..."
npm start
