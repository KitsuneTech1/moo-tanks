#!/usr/bin/env bash
if [ ! -d "node_modules" ]; then
    npm install
fi
npx vite --port 3000 --open
