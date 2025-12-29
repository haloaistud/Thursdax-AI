# Thursday-AI (Updated Prototype)

This repository contains a Vite + React frontend and a minimal Express + SQLite backend to run a local prototype of Thursday AI.

Quick start:

1. Install dependencies:
   npm install

2. Start both frontend and backend together:
   npm run dev

- Frontend (Vite) will run on http://localhost:3000 by default (configured in vite.config.ts).
- Backend (Express) will run on http://localhost:4000.

API endpoints:
- POST /api/session/connect -> start session
- POST /api/session/disconnect -> end session
- GET  /api/messages -> get messages
- POST /api/messages -> post a message (body: { role: 'user'|'model', text: string })

Notes:
- The server uses SQLite; the file `server/data.sqlite` will be created automatically.
- This is a prototype: real audio streaming and production AI integration should be implemented on the server side and protected by credentials/secrets.