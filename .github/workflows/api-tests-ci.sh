#!/usr/bin/env bash

set -e

npm run db:local:recreate

echo "Starting Worker..."
npm run worker:dev > worker.log 2>&1 &
WORKER_PID=$!

cleanup() {
    echo "Stopping Worker..."
    kill "$WORKER_PID" 2>/dev/null || true
    wait "$WORKER_PID" 2>/dev/null || true
}

trap cleanup EXIT

echo "Waiting for Worker..."
npx wait-on http://127.0.0.1:3001

echo "Running API tests..."
npm run api:tests:bruno