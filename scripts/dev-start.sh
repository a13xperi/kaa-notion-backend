#!/bin/bash

# SAGE MVP Platform - Development Quick Start
# Starts both frontend and backend in development mode

echo "=========================================="
echo "  SAGE MVP Platform - Development Mode"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f ".env" ] && [ ! -f "server/.env" ]; then
    echo "Warning: No .env file found. Copy env.example to .env first."
    echo "  cp env.example .env"
    echo ""
fi

# Install dependencies if needed
echo "Checking dependencies..."

if [ ! -d "server/node_modules" ]; then
    echo "Installing server dependencies..."
    cd server && npm install && cd ..
fi

if [ ! -d "kaa-app/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd kaa-app && npm install && cd ..
fi

# Build server if needed
if [ ! -d "server/dist" ]; then
    echo "Building server..."
    cd server && npm run build && cd ..
fi

echo ""
echo "Starting services..."
echo "  - Backend: http://localhost:3001"
echo "  - Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
cd server
npm start &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend
cd kaa-app
npm start &
FRONTEND_PID=$!
cd ..

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
