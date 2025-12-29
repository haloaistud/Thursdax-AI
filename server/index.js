const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database initialization
const dbPath = path.join(__dirname, '../database.db');
const dbDirExists = fs.existsSync(path.dirname(dbPath));

if (!dbDirExists) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Database initialization function
function initializeDatabase() {
  // Create sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    )
  `, (err) => {
    if (err) {
      console.error('Error creating sessions table:', err.message);
    } else {
      console.log('Sessions table initialized');
    }
  });

  // Create messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      user_id TEXT,
      content TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES sessions(session_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating messages table:', err.message);
    } else {
      console.log('Messages table initialized');
    }
  });

  // Create indexes for better query performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id)`);
}

// Utility function to generate unique session ID
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// POST /api/session/connect - Create a new session
app.post('/api/session/connect', asyncHandler(async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      success: false,
      error: 'user_id is required'
    });
  }

  const session_id = generateSessionId();

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO sessions (session_id, user_id, created_at, updated_at, is_active)
       VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)`,
      [session_id, user_id],
      function(err) {
        if (err) {
          console.error('Error creating session:', err.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to create session'
          });
        }

        res.status(201).json({
          success: true,
          session_id: session_id,
          user_id: user_id,
          created_at: new Date().toISOString()
        });
        resolve();
      }
    );
  });
}));

// POST /api/session/disconnect - End a session
app.post('/api/session/disconnect', asyncHandler(async (req, res) => {
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({
      success: false,
      error: 'session_id is required'
    });
  }

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE sessions SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?`,
      [session_id],
      function(err) {
        if (err) {
          console.error('Error disconnecting session:', err.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to disconnect session'
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            error: 'Session not found'
          });
        }

        res.status(200).json({
          success: true,
          message: 'Session disconnected successfully',
          session_id: session_id
        });
        resolve();
      }
    );
  });
}));

// GET /api/messages - Retrieve messages for a session
app.get('/api/messages', asyncHandler(async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({
      success: false,
      error: 'session_id is required'
    });
  }

  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, session_id, user_id, content, role, created_at
       FROM messages
       WHERE session_id = ?
       ORDER BY created_at ASC`,
      [session_id],
      (err, rows) => {
        if (err) {
          console.error('Error retrieving messages:', err.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to retrieve messages'
          });
        }

        res.status(200).json({
          success: true,
          session_id: session_id,
          messages: rows || [],
          count: (rows || []).length
        });
        resolve();
      }
    );
  });
}));

// POST /api/messages - Add a new message to a session
app.post('/api/messages', asyncHandler(async (req, res) => {
  const { session_id, user_id, content, role } = req.body;

  // Validation
  if (!session_id) {
    return res.status(400).json({
      success: false,
      error: 'session_id is required'
    });
  }

  if (!content) {
    return res.status(400).json({
      success: false,
      error: 'content is required'
    });
  }

  if (!role || !['user', 'assistant', 'system'].includes(role)) {
    return res.status(400).json({
      success: false,
      error: 'role is required and must be one of: user, assistant, system'
    });
  }

  // Verify session exists and is active
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, user_id FROM sessions WHERE session_id = ? AND is_active = 1`,
      [session_id],
      (err, session) => {
        if (err) {
          console.error('Error verifying session:', err.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to verify session'
          });
        }

        if (!session) {
          return res.status(404).json({
            success: false,
            error: 'Session not found or inactive'
          });
        }

        // Insert message
        db.run(
          `INSERT INTO messages (session_id, user_id, content, role, created_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [session_id, user_id || session.user_id, content, role],
          function(err) {
            if (err) {
              console.error('Error inserting message:', err.message);
              return res.status(500).json({
                success: false,
                error: 'Failed to save message'
              });
            }

            res.status(201).json({
              success: true,
              message_id: this.lastID,
              session_id: session_id,
              role: role,
              content: content,
              created_at: new Date().toISOString()
            });
            resolve();
          }
        );
      }
    );
  });
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
  console.log(`Current time: 2025-12-29 04:25:51 UTC`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

module.exports = app;
