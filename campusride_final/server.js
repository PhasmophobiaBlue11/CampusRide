// CampusRide — High-Performance Node.js Server
// Zero-dependency SQLite backend with Real-Time SSE, Username Authentication, QR Validation, and Safety Auditing
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 8000;
const DB_PATH = path.join(__dirname, 'campusride.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Initialize SQLite Database
const db = new DatabaseSync(DB_PATH);

// Helper: Run schema migrations
// Permanent Master Administrator
const PERMANENT_ADMIN_USERNAME = 'Admin2026';
const PERMANENT_ADMIN_PASSWORD = 'Parth@123';
const BACKUP_JSON_PATH = path.join(__dirname, 'campusride_backup.json');

// Save entire database snapshot to campusride_backup.json to survive Render redeployments
function saveBackupJson() {
  try {
    const backup = {
      users: db.prepare('SELECT * FROM users').all(),
      drivers: db.prepare('SELECT * FROM drivers').all(),
      driver_profiles: db.prepare('SELECT * FROM driver_profiles').all(),
      parents: db.prepare('SELECT * FROM parents').all(),
      children: db.prepare('SELECT * FROM children').all(),
      staff_requests: db.prepare('SELECT * FROM staff_requests').all(),
      sessions: db.prepare('SELECT * FROM sessions').all(),
      van_logs: db.prepare('SELECT * FROM van_logs ORDER BY timestamp DESC LIMIT 100').all()
    };
    fs.writeFileSync(BACKUP_JSON_PATH, JSON.stringify(backup, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[CampusRide] Notice saving backup JSON:', err.message);
  }
}

// Restore database snapshot from campusride_backup.json on cold boots or fresh redeploys
function restoreBackupJson() {
  if (!fs.existsSync(BACKUP_JSON_PATH)) return;
  try {
    const raw = fs.readFileSync(BACKUP_JSON_PATH, 'utf-8');
    const data = JSON.parse(raw);
    
    // Restore users
    if (Array.isArray(data.users)) {
      const insertUser = db.prepare(`
        INSERT OR IGNORE INTO users (id, username, email, password_hash, role, display_name, phone, blocked, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const u of data.users) {
        insertUser.run(u.id, u.username || u.email, u.email || u.username, u.password_hash, u.role || 'user', u.display_name || '', u.phone || '', u.blocked || 0, u.created_at || new Date().toISOString());
      }
    }

    // Restore drivers
    if (Array.isArray(data.drivers)) {
      const insertDriver = db.prepare(`
        INSERT OR IGNORE INTO drivers (id, label, type, driver_name, license_number, van_no, phone, vehicle_type, raw_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of data.drivers) {
        insertDriver.run(d.id, d.label, d.type || 'van', d.driver_name || '', d.license_number || '', d.van_no || '', d.phone || '', d.vehicle_type || '4_wheeler', d.raw_data || '', d.created_at || new Date().toISOString());
      }
    }

    // Restore driver profiles
    if (Array.isArray(data.driver_profiles)) {
      const insertDp = db.prepare(`
        INSERT OR IGNORE INTO driver_profiles (id, user_id, name, phone, selected_van_id, selected_van_label)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const dp of data.driver_profiles) {
        insertDp.run(dp.id, dp.user_id, dp.name || '', dp.phone || '', dp.selected_van_id || null, dp.selected_van_label || null);
      }
    }

    // Restore parents
    if (Array.isArray(data.parents)) {
      const insertPar = db.prepare(`
        INSERT OR IGNORE INTO parents (id, user_id, name, phone, address, address_lat, address_lng, selected_van_id, selected_van_label)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of data.parents) {
        insertPar.run(p.id, p.user_id, p.name || '', p.phone || '', p.address || '', p.address_lat || 0, p.address_lng || 0, p.selected_van_id || null, p.selected_van_label || null);
      }
    }

    // Restore children
    if (Array.isArray(data.children)) {
      const insertChild = db.prepare(`
        INSERT OR IGNORE INTO children (id, parent_id, name, van_id, van_label, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const c of data.children) {
        insertChild.run(c.id, c.parent_id, c.name, c.van_id || null, c.van_label || null, c.created_at || new Date().toISOString());
      }
    }

    // Restore staff requests
    if (Array.isArray(data.staff_requests)) {
      const insertStaff = db.prepare(`
        INSERT OR IGNORE INTO staff_requests (id, user_id, full_name, email, phone, status, notes, is_admin, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of data.staff_requests) {
        insertStaff.run(s.id, s.user_id || null, s.full_name, s.email, s.phone, s.status || 'pending', s.notes || '', s.is_admin || 0, s.created_at || new Date().toISOString());
      }
    }

    // Restore sessions (so users are never randomly logged out across redeployments)
    if (Array.isArray(data.sessions)) {
      const insertSession = db.prepare(`
        INSERT OR IGNORE INTO sessions (token, user_id, created_at, last_active)
        VALUES (?, ?, ?, ?)
      `);
      for (const sess of data.sessions) {
        insertSession.run(sess.token, sess.user_id, sess.created_at, sess.last_active);
      }
    }

    // Restore van logs
    if (Array.isArray(data.van_logs)) {
      const insertLog = db.prepare(`
        INSERT OR IGNORE INTO van_logs (id, qr_identifier, driver_id, driver_name, driver_label, event_type, scanned_by, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const l of data.van_logs) {
        insertLog.run(l.id, l.qr_identifier || '', l.driver_id, l.driver_name || '', l.driver_label || '', l.event_type, l.scanned_by || '', l.timestamp);
      }
    }

    console.log('[CampusRide] Verified and synchronized backup data from campusride_backup.json');
  } catch (err) {
    console.warn('[CampusRide] Notice restoring backup JSON:', err.message);
  }
}

function ensurePermanentAdmin() {
  const now = new Date().toISOString();

  // Ensure Admin2026 always exists and cannot be lost
  const existing = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)').get(PERMANENT_ADMIN_USERNAME, PERMANENT_ADMIN_USERNAME);
  if (!existing) {
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, display_name, phone, blocked, created_at)
      VALUES (?, ?, ?, ?, 'admin', 'Master Administrator (Parth)', '9876500000', 0, ?)
    `).run('usr_perm_admin', PERMANENT_ADMIN_USERNAME, PERMANENT_ADMIN_USERNAME, hashPassword(PERMANENT_ADMIN_PASSWORD), now);
    console.log(`[CampusRide] Master Administrator created: username="${PERMANENT_ADMIN_USERNAME}", password="${PERMANENT_ADMIN_PASSWORD}"`);
  } else {
    db.prepare(`
      UPDATE users SET username = ?, email = ?, role = 'admin', blocked = 0, password_hash = ? WHERE id = ?
    `).run(PERMANENT_ADMIN_USERNAME, PERMANENT_ADMIN_USERNAME, hashPassword(PERMANENT_ADMIN_PASSWORD), existing.id);
    console.log(`[CampusRide] Master Administrator active: username="${PERMANENT_ADMIN_USERNAME}"`);
  }
}

function initDatabase() {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'user'
      display_name TEXT,
      phone TEXT,
      blocked INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      label TEXT UNIQUE NOT NULL, -- 'Van 1', 'Van 2', 'Staff 1'
      type TEXT NOT NULL, -- 'van' | 'staff'
      driver_name TEXT,
      license_number TEXT,
      van_no TEXT,
      phone TEXT,
      vehicle_type TEXT DEFAULT '4_wheeler', -- '4_wheeler' | '2_wheeler'
      raw_data TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS driver_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      selected_van_id TEXT,
      selected_van_label TEXT
    );

    CREATE TABLE IF NOT EXISTS parents (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      address_lat REAL,
      address_lng REAL,
      selected_van_id TEXT,
      selected_van_label TEXT
    );

    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      van_id TEXT,
      van_label TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS van_logs (
      id TEXT PRIMARY KEY,
      qr_identifier TEXT,
      driver_id TEXT NOT NULL,
      driver_name TEXT,
      driver_label TEXT,
      event_type TEXT NOT NULL, -- 'entry' | 'exit' | 'journey_start'
      scanned_by TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS van_locations (
      van_id TEXT PRIMARY KEY,
      van_label TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      live INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parent_notifications (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      van_id TEXT,
      van_label TEXT,
      event_type TEXT NOT NULL,
      event_time TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ride_alerts (
      id TEXT PRIMARY KEY,
      van_id TEXT NOT NULL,
      van_label TEXT,
      driver_name TEXT,
      alert_type TEXT NOT NULL, -- 'entry_no_journey'
      severity TEXT DEFAULT 'warning',
      message TEXT NOT NULL,
      audience TEXT DEFAULT 'all', -- 'driver' | 'parent' | 'admin' | 'all'
      target_user_id TEXT,
      source_id TEXT UNIQUE,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS staff_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
      notes TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_active INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);


  `);

  // Ensure username column exists
  try {
    db.exec(`ALTER TABLE users ADD COLUMN username TEXT;`);
  } catch (e) {}

  // Restore snapshot if needed
  restoreBackupJson();

  // Ensure Admin2026 is active
  ensurePermanentAdmin();

  // Keep backup JSON synchronized
  saveBackupJson();
}

// Simple deterministic hash for demo authentication
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '_campusride_salt').digest('hex');
}

function generateId(prefix = 'id') {
  return prefix + '_' + crypto.randomBytes(8).toString('hex');
}

// Seed initial master admin if database is empty
function seedDefaultData() {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  if (userCount > 0) return;

  const now = new Date().toISOString();

  // Master Admin Account
  const adminId = 'usr_admin_master';
  db.prepare(`
    INSERT INTO users (id, email, password_hash, role, display_name, phone, blocked, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(adminId, 'admin@campusride.edu', hashPassword('admin123'), 'admin', 'System Administrator', '9876500000', now);

  console.log('[CampusRide] SQLite database initialized with Master Admin (admin@campusride.edu).');
}

initDatabase();

// Connected Server-Sent Events clients for real-time live map & notifications
const sseClients = new Set();

function broadcastEvent(type, payload) {
  const message = `event: message\ndata: ${JSON.stringify({ type, payload, timestamp: new Date().toISOString() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Hybrid token storage: RAM Map cache + Persistent SQLite table
// Survived Render spin-downs, restarts & container reboots
const activeSessions = new Map();

function createToken(userId) {
  const token = 'cr_' + crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  activeSessions.set(token, { userId, created: now, last_active: now });
  try {
    db.prepare('INSERT OR REPLACE INTO sessions (token, user_id, created_at, last_active) VALUES (?, ?, ?, ?)').run(token, userId, now, now);
    saveBackupJson();
  } catch (err) {
    console.error('[Session] SQLite insert error:', err.message);
  }
  return token;
}

function deleteSession(token) {
  if (!token) return;
  activeSessions.delete(token);
  try {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  } catch (err) {
    console.error('[Session] SQLite delete error:', err.message);
  }
}

function getUserIdFromReq(req) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }
  if (!token) {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    token = urlObj.searchParams.get('token');
  }
  if (!token) return null;

  // 1. Check in-memory RAM cache first (instant)
  const cached = activeSessions.get(token);
  if (cached) return cached.userId;

  // 2. Query persistent SQLite sessions table (survives container spin-downs)
  try {
    const row = db.prepare('SELECT user_id, created_at, last_active FROM sessions WHERE token = ?').get(token);
    if (row) {
      activeSessions.set(token, { userId: row.user_id, created: row.created_at, last_active: Date.now() });
      try {
        db.prepare('UPDATE sessions SET last_active = ? WHERE token = ?').run(Date.now(), token);
      } catch {}
      return row.user_id;
    }
  } catch (err) {
    console.error('[Session] SQLite lookup error:', err.message);
  }
  return null;
}

function getUserProfile(userId) {
  if (!userId) return null;
  const user = db.prepare('SELECT id, username, email, role, display_name, phone, blocked FROM users WHERE id = ?').get(userId);
  if (!user || user.blocked) return null;

  // Check staff status
  let staffStatus = 'none';
  if (user.role === 'admin') {
    staffStatus = 'approved';
  } else {
    const req = db.prepare('SELECT status FROM staff_requests WHERE user_id = ? OR email = ? OR user_id = ?').get(user.id, user.username, user.email);
    if (req) staffStatus = req.status;
  }

  // Driver profile
  const driverProfile = db.prepare('SELECT * FROM driver_profiles WHERE user_id = ?').get(user.id);
  // Parent profile
  const parentProfile = db.prepare('SELECT * FROM parents WHERE user_id = ?').get(user.id);

  return {
    ...user,
    username: user.username || user.email || user.id,
    staffStatus,
    driverProfile: driverProfile || null,
    parentProfile: parentProfile || null
  };
}

// Auto-label helper for sequential numbering (e.g. Van 1, Van 2, Van 3)
function getNextLabel(type) {
  const prefix = type === 'van' ? 'Van ' : 'Staff ';
  const rows = db.prepare('SELECT label FROM drivers WHERE type = ?').all(type);
  const usedNumbers = new Set();
  for (const row of rows) {
    if (row.label.startsWith(prefix)) {
      const num = parseInt(row.label.slice(prefix.length), 10);
      if (!isNaN(num)) usedNumbers.add(num);
    }
  }
  let next = 1;
  while (usedNumbers.has(next)) next++;
  return `${prefix}${next}`;
}

// Renumber remaining drivers after a deletion as per PRD requirement §7.3
function renumberAllDrivers(type) {
  const prefix = type === 'van' ? 'Van ' : 'Staff ';
  const drivers = db.prepare('SELECT id, label, created_at FROM drivers WHERE type = ? ORDER BY created_at ASC').all(type);
  drivers.forEach((driver, idx) => {
    const newLabel = `${prefix}${idx + 1}`;
    if (driver.label !== newLabel) {
      db.prepare('UPDATE drivers SET label = ? WHERE id = ?').run(newLabel, driver.id);
      db.prepare('UPDATE van_logs SET driver_label = ? WHERE driver_id = ?').run(newLabel, driver.id);
      db.prepare('UPDATE van_locations SET van_label = ? WHERE van_id = ?').run(newLabel, driver.id);
      db.prepare('UPDATE children SET van_label = ? WHERE van_id = ?').run(newLabel, driver.id);
      db.prepare('UPDATE parents SET selected_van_label = ? WHERE selected_van_id = ?').run(newLabel, driver.id);
      db.prepare('UPDATE driver_profiles SET selected_van_label = ? WHERE selected_van_id = ?').run(newLabel, driver.id);
    }
  });
}

// Safety net check: Van entered campus in last 12h without a journey start or exit
function runPendingJourneysSafetyCheck() {
  const cutoff = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
  // Find entries in the last 12h
  const entries = db.prepare(`
    SELECT * FROM van_logs 
    WHERE event_type = 'entry' AND timestamp >= ? 
    ORDER BY timestamp DESC
  `).all(cutoff);

  let newAlertsCount = 0;
  for (const entry of entries) {
    // Check if there is an exit or journey_start after this entry for the same driver
    const nextEvent = db.prepare(`
      SELECT event_type FROM van_logs 
      WHERE driver_id = ? AND timestamp > ? 
      AND (event_type = 'journey_start' OR event_type = 'exit')
      LIMIT 1
    `).get(entry.driver_id, entry.timestamp);

    if (!nextEvent) {
      const sourceId = `entry_alert_${entry.id}`;
      const existing = db.prepare('SELECT id FROM ride_alerts WHERE source_id = ?').get(sourceId);
      if (!existing) {
        const timeFormatted = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const alertId = generateId('alt');
        db.prepare(`
          INSERT INTO ride_alerts (id, van_id, van_label, driver_name, alert_type, severity, message, audience, target_user_id, source_id, read, created_at)
          VALUES (?, ?, ?, ?, 'entry_no_journey', 'warning', ?, 'all', NULL, ?, 0, ?)
        `).run(
          alertId,
          entry.driver_id,
          entry.driver_label || 'Van',
          entry.driver_name || 'Driver',
          `Safety Alert: ${entry.driver_label || 'Van'} entered campus at ${timeFormatted} but has not started journey.`,
          sourceId,
          new Date().toISOString()
        );
        newAlertsCount++;
      }
    }
  }

  if (newAlertsCount > 0) {
    broadcastEvent('alert_updated', { newAlertsCount });
  }
}

// Parse JSON body helper
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) req.destroy(); // 5MB guard
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

// Main HTTP Router
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // -------------------------------------------------------------
  // SSE Endpoint: /api/events
  // -------------------------------------------------------------
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(`event: connected\ndata: {"status": "ok"}\n\n`);
    sseClients.add(res);

    // Keepalive ping every 15s
    const pingInterval = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(pingInterval);
      sseClients.delete(res);
    });
    return;
  }

  // -------------------------------------------------------------
  // API Routes: /api/*
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    try {
      const userId = getUserIdFromReq(req);
      const user = getUserProfile(userId);

      // PUBLIC CONFIG
      if (pathname === '/api/config' && req.method === 'GET') {
        return sendJson(res, 200, {
          permanentAdminUsername: PERMANENT_ADMIN_USERNAME
        });
      }

      // HEALTH CHECK & KEEP-ALIVE (Zero-payload instant response for uptime pings)
      if (pathname === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, {
          status: 'ok',
          service: 'CampusRide',
          uptime: Math.floor(process.uptime()),
          timestamp: new Date().toISOString()
        });
      }

      // AUTH: Logout (removes persistent token from SQLite & RAM)
      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          deleteSession(authHeader.slice(7).trim());
        }
        return sendJson(res, 200, { success: true });
      }

      // AUTH: Check if a Username exists (for availability & device check)
      if (pathname === '/api/auth/check-username' && req.method === 'GET') {
        const username = (urlObj.searchParams.get('username') || '').trim();
        if (!username) return sendJson(res, 200, { exists: false });
        const found = db.prepare('SELECT id, username, email, role, display_name FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)').get(username, username);
        return sendJson(res, 200, {
          exists: Boolean(found),
          username: found ? (found.username || found.email) : null,
          role: found ? found.role : null,
          displayName: found ? found.display_name : null
        });
      }

      // AUTH: Delete Account from Device (Allows registering a new account on this device)
      if (pathname === '/api/auth/delete-device-account' && req.method === 'POST') {
        const { username, role } = await readJsonBody(req);
        if (!username) return sendError(res, 400, 'Username is required');
        const cleanUser = username.trim().toLowerCase();

        // Master Administrator cannot be deleted
        if (cleanUser === PERMANENT_ADMIN_USERNAME.toLowerCase()) {
          return sendError(res, 403, 'Master Administrator account cannot be deleted.');
        }

        const found = db.prepare('SELECT id, role FROM users WHERE lower(username) = ? OR lower(email) = ?').get(cleanUser, cleanUser);
        if (!found) {
          return sendJson(res, 200, { success: true, message: 'Account not found or already deleted.' });
        }

        db.prepare('DELETE FROM children WHERE parent_id = ?').run(found.id);
        db.prepare('DELETE FROM parents WHERE user_id = ?').run(found.id);
        db.prepare('DELETE FROM driver_profiles WHERE user_id = ?').run(found.id);
        db.prepare('DELETE FROM staff_requests WHERE user_id = ?').run(found.id);
        db.prepare('DELETE FROM users WHERE id = ?').run(found.id);
        console.log(`[CampusRide] Device deleted account: "${username}" (role: ${role || found.role})`);
        saveBackupJson();
        return sendJson(res, 200, { success: true, message: `Account "${username}" successfully deleted.` });
      }

      // AUTH: Login with Username & Password (Strict Role Gate Enforcement)
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const { username, email, password, required_role } = await readJsonBody(req);
        const queryUser = (username || email || '').trim();
        if (!queryUser || !password) return sendError(res, 400, 'Username and password are required');

        const foundUser = db.prepare('SELECT * FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)').get(queryUser, queryUser);
        if (!foundUser) return sendError(res, 401, 'No account found with this username');
        if (foundUser.blocked) return sendError(res, 403, 'Account is inactive or blocked.');

        const hash = hashPassword(password);
        if (foundUser.password_hash !== hash) return sendError(res, 401, 'Incorrect password. Please try again.');

        const profile = getUserProfile(foundUser.id);

        // Strict Role Gate: Even with correct username & password, reject if not matching the app portal
        if (required_role === 'parent') {
          if (!profile.parentProfile) {
            return sendError(res, 403, 'Access Denied: This is the Parent App. Your account is NOT registered as a Parent.');
          }
        } else if (required_role === 'driver') {
          if (!profile.driverProfile) {
            return sendError(res, 403, 'Access Denied: This is the Driver App. Your account is NOT registered as a Driver.');
          }
        } else if (required_role === 'staff') {
          if (profile.role !== 'admin' && (profile.driverProfile || profile.parentProfile)) {
            return sendError(res, 403, 'Access Denied: This is the Gate Staff App. Your account is NOT registered as Staff.');
          }
        } else if (required_role === 'admin') {
          if (profile.role !== 'admin') {
            return sendError(res, 403, 'Access Denied: Master Administrator credentials required.');
          }
        }

        const token = createToken(foundUser.id);
        return sendJson(res, 200, { token, user: profile });
      }

      // AUTH: Check blocked
      if (pathname === '/api/auth/check-blocked' && req.method === 'GET') {
        const query = (urlObj.searchParams.get('username') || urlObj.searchParams.get('email') || '').trim();
        if (!query) return sendJson(res, 200, { blocked: false });
        const found = db.prepare('SELECT blocked FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)').get(query, query);
        return sendJson(res, 200, { blocked: Boolean(found && found.blocked) });
      }

      // AUTH: Register Staff
      if (pathname === '/api/auth/register-staff' && req.method === 'POST') {
        const { fullName, username, email, phone, password } = await readJsonBody(req);
        const rawUser = (username || email || '').trim();
        if (!fullName || !rawUser || !phone || !password) return sendError(res, 400, 'All fields (Full Name, Username, Phone, Password) are required');

        // Full Name Validation (Both first and last name required)
        const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
        if (nameParts.length < 2 || nameParts[0].length < 2 || nameParts[1].length < 2) {
          return sendError(res, 400, 'Please enter your full name (both first and last name, e.g. Anand Shinde)');
        }

        if (rawUser.length < 3) return sendError(res, 400, 'Username must be at least 3 characters long');

        // Check if username already taken
        const existing = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)').get(rawUser, rawUser);
        if (existing) return sendError(res, 400, `The username "${rawUser}" is already taken. Please choose another username.`);

        const newUserId = generateId('usr_staff');
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO users (id, username, email, password_hash, role, display_name, phone, blocked, created_at)
          VALUES (?, ?, ?, ?, 'user', ?, ?, 0, ?)
        `).run(newUserId, rawUser, rawUser, hashPassword(password), fullName.trim(), phone.trim(), now);

        const reqId = generateId('req');
        db.prepare(`
          INSERT INTO staff_requests (id, user_id, full_name, email, phone, status, notes, is_admin, created_at)
          VALUES (?, ?, ?, ?, ?, 'pending', 'Submitted self-service staff registration', 0, ?)
        `).run(reqId, newUserId, fullName.trim(), rawUser, phone.trim(), now);

        const token = createToken(newUserId);
        const profile = getUserProfile(newUserId);
        broadcastEvent('staff_request_created', { id: reqId, fullName, username: rawUser });
        saveBackupJson();
        return sendJson(res, 201, { token, user: profile, message: 'Staff registration submitted successfully.' });
      }

      // AUTH: Register Driver (Auto creates Van)
      if (pathname === '/api/auth/register-driver' && req.method === 'POST') {
        const { fullName, username, email, phone, password, vehicleNo, vehicleType } = await readJsonBody(req);
        const rawUser = (username || email || '').trim();
        if (!fullName || !rawUser || !phone || !password || !vehicleNo) return sendError(res, 400, 'All fields (Full Name, Username, Phone, Password, Vehicle No) are required');

        // Full Name Validation (Both first and last name required, e.g. Ramu Chandan)
        const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
        if (nameParts.length < 2 || nameParts[0].length < 2 || nameParts[1].length < 2) {
          return sendError(res, 400, 'Please enter your full name (both first and last name, e.g. Ramu Chandan)');
        }

        if (rawUser.length < 3) return sendError(res, 400, 'Username must be at least 3 characters long');

        const existing = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)').get(rawUser, rawUser);
        if (existing) return sendError(res, 400, `The username "${rawUser}" is already taken. Please choose another username.`);

        const newUserId = generateId('usr_drv');
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO users (id, username, email, password_hash, role, display_name, phone, blocked, created_at)
          VALUES (?, ?, ?, ?, 'user', ?, ?, 0, ?)
        `).run(newUserId, rawUser, rawUser, hashPassword(password), fullName.trim(), phone.trim(), now);

        const nextLabel = getNextLabel('van');
        const vanId = generateId('drv_van');
        db.prepare(`
          INSERT INTO drivers (id, label, type, driver_name, license_number, van_no, phone, vehicle_type, raw_data, created_at)
          VALUES (?, ?, 'van', ?, '', ?, ?, ?, ?, ?)
        `).run(vanId, nextLabel, fullName.trim(), vehicleNo.trim().toUpperCase(), phone.trim(), vehicleType || '4_wheeler', `Name: ${fullName}, Van: ${vehicleNo}`, now);

        db.prepare(`
          INSERT INTO driver_profiles (id, user_id, name, phone, selected_van_id, selected_van_label)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(generateId('dp'), newUserId, fullName.trim(), phone.trim(), vanId, nextLabel);

        db.prepare(`
          INSERT INTO van_locations (van_id, van_label, lat, lng, live, updated_at)
          VALUES (?, ?, 0, 0, 0, ?)
        `).run(vanId, nextLabel, now);

        const token = createToken(newUserId);
        const profile = getUserProfile(newUserId);
        broadcastEvent('driver_registered', { vanId, nextLabel });
        saveBackupJson();
        return sendJson(res, 201, { token, user: profile, message: 'Driver registered successfully!' });
      }

      // AUTH: Register Parent
      if (pathname === '/api/auth/register-parent' && req.method === 'POST') {
        const { fullName, username, email, phone, password, address, lat, lng } = await readJsonBody(req);
        const rawUser = (username || email || '').trim();
        if (!fullName || !rawUser || !phone || !password) return sendError(res, 400, 'All fields (Full Name, Username, Phone, Password) are required');

        // Full Name Validation (Both first and last name required, e.g. Priya Sharma)
        const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
        if (nameParts.length < 2 || nameParts[0].length < 2 || nameParts[1].length < 2) {
          return sendError(res, 400, 'Please enter your full name (both first and last name, e.g. Priya Sharma)');
        }

        if (rawUser.length < 3) return sendError(res, 400, 'Username must be at least 3 characters long');

        const existing = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)').get(rawUser, rawUser);
        if (existing) return sendError(res, 400, `The username "${rawUser}" is already taken. Please choose another username.`);

        const newUserId = generateId('usr_par');
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO users (id, username, email, password_hash, role, display_name, phone, blocked, created_at)
          VALUES (?, ?, ?, ?, 'user', ?, ?, 0, ?)
        `).run(newUserId, rawUser, rawUser, hashPassword(password), fullName.trim(), phone.trim(), now);

        db.prepare(`
          INSERT INTO parents (id, user_id, name, phone, address, address_lat, address_lng, selected_van_id, selected_van_label)
          VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
        `).run(generateId('par'), newUserId, fullName.trim(), phone.trim(), address || '', lat || 0, lng || 0);

        const token = createToken(newUserId);
        const profile = getUserProfile(newUserId);
        saveBackupJson();
        return sendJson(res, 201, { token, user: profile, message: 'Parent account created successfully!' });
      }

      // AUTH: Forgot Password (Reset via Username + Registered Phone Number)
      if (pathname === '/api/auth/forgot-password' && req.method === 'POST') {
        const { username, phone, newPassword } = await readJsonBody(req);
        if (!username || !phone || !newPassword) {
          return sendError(res, 400, 'Username, registered phone number, and new password are required');
        }

        const cleanUser = username.trim().toLowerCase();
        const cleanPhone = phone.trim();

        if (cleanUser === PERMANENT_ADMIN_USERNAME.toLowerCase()) {
          return sendError(res, 403, 'Master Administrator password cannot be reset via this form.');
        }

        const foundUser = db.prepare('SELECT * FROM users WHERE (lower(username) = ? OR lower(email) = ?) AND phone = ?').get(cleanUser, cleanUser, cleanPhone);
        if (!foundUser) {
          return sendError(res, 404, 'No account found matching this username and phone number combination.');
        }

        const newHash = hashPassword(newPassword);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, foundUser.id);
        console.log(`[CampusRide] Password reset for user: ${foundUser.username || foundUser.email}`);
        saveBackupJson();
        return sendJson(res, 200, { success: true, message: 'Password reset successfully! Please sign in with your new password.' });
      }

      // AUTH: Current User Profile
      if (pathname === '/api/auth/me' && req.method === 'GET') {
        if (!user) return sendError(res, 401, 'Unauthorized or session expired');
        return sendJson(res, 200, { user });
      }

      // AUTH: Forgot Password (Simulated secure token)
      if (pathname === '/api/auth/forgot-password' && req.method === 'POST') {
        // Return generic success to avoid email leaking
        return sendJson(res, 200, { success: true, message: 'If an account exists, a reset link/code has been generated.' });
      }

      // AUTH: Self-Delete Account (§7.13)
      if (pathname === '/api/auth/delete-account' && req.method === 'POST') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        if ((user.username && user.username.toLowerCase() === PERMANENT_ADMIN_USERNAME.toLowerCase()) || (user.email && user.email.toLowerCase() === PERMANENT_ADMIN_USERNAME.toLowerCase())) {
          return sendError(res, 403, 'The Permanent Master Administrator account cannot be deleted.');
        }
        db.prepare('DELETE FROM children WHERE parent_id = ?').run(user.id);
        db.prepare('DELETE FROM parents WHERE user_id = ?').run(user.id);
        db.prepare('DELETE FROM driver_profiles WHERE user_id = ?').run(user.id);
        db.prepare('DELETE FROM staff_requests WHERE user_id = ?').run(user.id);
        db.prepare('UPDATE users SET blocked = 1 WHERE id = ?').run(user.id);
        return sendJson(res, 200, { success: true });
      }

      // ADMIN: Get all staff requests
      if (pathname === '/api/staff-requests' && req.method === 'GET') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');
        const requests = db.prepare('SELECT * FROM staff_requests ORDER BY created_at DESC').all();
        return sendJson(res, 200, { requests });
      }

      // ADMIN: Review staff request (Approve / Reject)
      if (pathname.startsWith('/api/staff-requests/') && pathname.endsWith('/review') && req.method === 'POST') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');
        const reqId = pathname.split('/')[3];
        const { status, notes } = await readJsonBody(req);
        if (!['approved', 'rejected', 'pending'].includes(status)) return sendError(res, 400, 'Invalid status');

        db.prepare('UPDATE staff_requests SET status = ?, notes = ? WHERE id = ?').run(status, notes || '', reqId);
        broadcastEvent('staff_status_changed', { reqId, status });
        return sendJson(res, 200, { success: true });
      }

      // ADMIN: Promote staff to Admin
      if (pathname.startsWith('/api/staff-requests/') && pathname.endsWith('/promote') && req.method === 'POST') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');
        const reqId = pathname.split('/')[3];
        const staffReq = db.prepare('SELECT * FROM staff_requests WHERE id = ?').get(reqId);
        if (!staffReq) return sendError(res, 404, 'Request not found');

        db.prepare('UPDATE users SET role = \'admin\' WHERE id = ?').run(staffReq.user_id);
        db.prepare('UPDATE staff_requests SET is_admin = 1, status = \'approved\' WHERE id = ?').run(reqId);
        broadcastEvent('user_promoted', { userId: staffReq.user_id });
        return sendJson(res, 200, { success: true });
      }

      // ADMIN: Block / Remove staff account
      if (pathname.startsWith('/api/staff-requests/') && pathname.endsWith('/block') && req.method === 'POST') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');
        const reqId = pathname.split('/')[3];
        const staffReq = db.prepare('SELECT * FROM staff_requests WHERE id = ?').get(reqId);
        if (!staffReq) return sendError(res, 404, 'Request not found');
        if ((staffReq.email && staffReq.email.toLowerCase() === PERMANENT_ADMIN_USERNAME.toLowerCase()) || (staffReq.username && staffReq.username.toLowerCase() === PERMANENT_ADMIN_USERNAME.toLowerCase())) {
          return sendError(res, 403, 'The Permanent Master Administrator account cannot be blocked.');
        }

        db.prepare('UPDATE users SET blocked = 1 WHERE id = ?').run(staffReq.user_id);
        db.prepare('UPDATE staff_requests SET status = \'rejected\' WHERE id = ?').run(reqId);
        broadcastEvent('user_blocked', { userId: staffReq.user_id });
        return sendJson(res, 200, { success: true });
      }

      // DRIVERS & STAFF REGISTRY: List all (Natural numeric sort: Van 1, Van 2, ... Van 10)
      if (pathname === '/api/drivers' && req.method === 'GET') {
        const type = urlObj.searchParams.get('type');
        let query = 'SELECT * FROM drivers';
        const params = [];
        if (type) {
          query += ' WHERE type = ?';
          params.push(type);
        }
        query += " ORDER BY CAST(SUBSTR(label, INSTR(label, ' ') + 1) AS INTEGER) ASC, label ASC";
        const drivers = db.prepare(query).all(...params);
        return sendJson(res, 200, { drivers });
      }

      // WORKING STAFF: List all account-based staff accounts (e.g. Atharva Deshpande @Staff2026)
      if (pathname === '/api/working-staff' && req.method === 'GET') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const staffRows = db.prepare(`
          SELECT sr.id, sr.user_id, sr.full_name, sr.email as username, sr.phone, sr.status, sr.is_admin, sr.notes, sr.created_at
          FROM staff_requests sr
          ORDER BY sr.created_at ASC
        `).all();

        // Also ensure admin user is included if not in staff_requests
        const adminUser = db.prepare("SELECT id, username, display_name, phone, role, created_at FROM users WHERE role = 'admin'").get();
        const results = [...staffRows];
        if (adminUser && !staffRows.some(s => s.username === adminUser.username || s.user_id === adminUser.id)) {
          results.unshift({
            id: 'admin_sys',
            user_id: adminUser.id,
            full_name: adminUser.display_name || 'System Administrator',
            username: adminUser.username,
            phone: adminUser.phone || '',
            status: 'approved',
            is_admin: 1,
            notes: 'Master Administrator',
            created_at: adminUser.created_at
          });
        }
        return sendJson(res, 200, { staff: results });
      }

      // DRIVERS & STAFF REGISTRY: Add new
      if (pathname === '/api/drivers' && req.method === 'POST') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const { driver_name, van_no, phone, vehicle_type, type, designation, duty } = await readJsonBody(req);
        if (!driver_name) return sendError(res, 400, 'Staff/Driver name is required');

        // Full Name Validation (Both first and last name required, e.g. Ramu Chandan)
        const nameParts = driver_name.trim().split(/\s+/).filter(Boolean);
        if (nameParts.length < 2 || nameParts[0].length < 2 || nameParts[1].length < 2) {
          return sendError(res, 400, 'Please enter the full name (both first and last name, e.g. Ramu Chandan)');
        }

        const kind = type === 'staff' ? 'staff' : 'van';
        const roleOrPlate = (van_no || designation || duty || (kind === 'staff' ? 'Staff Pass' : '')).trim().toUpperCase();
        if (kind === 'van' && !roleOrPlate) {
          return sendError(res, 400, 'Vehicle number is required');
        }

        const label = getNextLabel(kind);
        const id = generateId('drv');
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO drivers (id, label, type, driver_name, license_number, van_no, phone, vehicle_type, raw_data, created_at)
          VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?)
        `).run(id, label, kind, driver_name.trim(), roleOrPlate, phone || '', vehicle_type || (kind === 'staff' ? 'walk_in' : '4_wheeler'), `Name: ${driver_name}`, now);

        if (kind === 'van') {
          db.prepare(`
            INSERT INTO van_locations (van_id, van_label, lat, lng, live, updated_at)
            VALUES (?, ?, 0, 0, 0, ?)
          `).run(id, label, now);
        }

        saveBackupJson();
        broadcastEvent('driver_added', { id, label });
        return sendJson(res, 201, { id, label });
      }

      // DRIVERS & STAFF REGISTRY: Delete van or staff (Cascades logs & renumbers as per §7.3)
      if (pathname.startsWith('/api/drivers/') && req.method === 'DELETE') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const driverId = pathname.split('/')[3];
        const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driverId);
        if (!driver) return sendError(res, 404, 'Driver/Staff entry not found');

        // Cascade delete logs and location
        db.prepare('DELETE FROM van_logs WHERE driver_id = ?').run(driverId);
        db.prepare('DELETE FROM van_locations WHERE van_id = ?').run(driverId);
        db.prepare('DELETE FROM ride_alerts WHERE van_id = ?').run(driverId);
        db.prepare('DELETE FROM drivers WHERE id = ?').run(driverId);

        // Renumber remaining drivers
        renumberAllDrivers(driver.type);
        saveBackupJson();
        broadcastEvent('driver_deleted', { driverId, type: driver.type });
        return sendJson(res, 200, { success: true });
      }

      // GATE SCANNER: Entry / Exit Alternation Check & Log Recording (§7.4)
      if (pathname === '/api/scanner/scan' && req.method === 'POST') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const { qrPayload, scanType } = await readJsonBody(req); // scanType: 'entry' | 'exit'
        if (!qrPayload || !scanType) return sendError(res, 400, 'QR payload and scanType are required');

        // Validate QR format: must be CAMPUSRIDE:DRIVER:<id>
        if (!qrPayload.startsWith('CAMPUSRIDE:DRIVER:')) {
          return sendError(res, 400, 'Not an entry/exit QR — this scanner only accepts CampusRide pass QR codes.');
        }

        const driverId = qrPayload.replace('CAMPUSRIDE:DRIVER:', '').trim();
        const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driverId);
        if (!driver) return sendError(res, 404, 'No registered vehicle or staff matches this pass.');

        // Alternation enforcement:
        // Find last event for this vehicle/staff
        const lastLog = db.prepare(`
          SELECT event_type FROM van_logs 
          WHERE driver_id = ? AND (event_type = 'entry' OR event_type = 'exit') 
          ORDER BY timestamp DESC LIMIT 1
        `).get(driverId);

        const lastState = lastLog ? lastLog.event_type : 'exit'; // Default to outside

        if (scanType === 'entry') {
          if (lastState === 'entry') {
            return sendError(res, 400, 'Already inside campus — scan Exit first.');
          }
        } else if (scanType === 'exit') {
          if (lastState !== 'entry') {
            return sendError(res, 400, "No active entry — hasn't entered, scan Entry first.");
          }
        }

        const now = new Date().toISOString();
        const logId = generateId('log');
        const scannedBy = user.display_name || user.email;

        // Record VanLog
        db.prepare(`
          INSERT INTO van_logs (id, qr_identifier, driver_id, driver_name, driver_label, event_type, scanned_by, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(logId, qrPayload, driver.id, driver.driver_name, driver.label, scanType, scannedBy, now);

        // Notify parents tracking this van
        const trackingChildren = db.prepare('SELECT parent_id, name FROM children WHERE van_id = ?').all(driver.id);
        const eventTitle = scanType === 'entry' ? 'Entered Campus' : 'Exited Campus';
        const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        for (const child of trackingChildren) {
          const notifId = generateId('notif');
          const msg = `${driver.label} (${driver.van_no}) ${scanType === 'entry' ? 'entered campus safely' : 'exited campus'} at ${formattedTime}.`;
          db.prepare(`
            INSERT INTO parent_notifications (id, parent_id, van_id, van_label, event_type, event_time, message, read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
          `).run(notifId, child.parent_id, driver.id, driver.label, scanType, now, msg, now);
        }

        // Exit clears pending alerts for this van
        if (scanType === 'exit') {
          db.prepare('DELETE FROM ride_alerts WHERE van_id = ? AND alert_type = \'entry_no_journey\'').run(driver.id);
        }

        // Entry triggers pending-journey safety net check
        if (scanType === 'entry') {
          setTimeout(runPendingJourneysSafetyCheck, 100);
        }

        const scanResult = {
          success: true,
          event_type: scanType,
          driver: {
            id: driver.id,
            label: driver.label,
            name: driver.driver_name,
            van_no: driver.van_no,
            vehicle_type: driver.vehicle_type
          },
          timestamp: now
        };

        broadcastEvent('scan_recorded', scanResult);
        saveBackupJson();
        return sendJson(res, 200, scanResult);
      }

      // REGISTRATION SCANNER: Register vehicle from plain-text QR (§7.5)
      if (pathname === '/api/scanner/register-qr' && req.method === 'POST') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const { text, type } = await readJsonBody(req);
        if (!text) return sendError(res, 400, 'QR content is empty');

        // Rejection check: cannot scan pass QR in registration scanner
        if (text.startsWith('CAMPUSRIDE:DRIVER:')) {
          return sendError(res, 400, 'Wrong QR code — this is an entry/exit pass, not a registration QR.');
        }

        // Try JSON parse first
        let jsonParsed = null;
        try {
          jsonParsed = JSON.parse(text);
        } catch {}

        // Parse key-value or delimited pairs
        const lines = text.split(/[\n,;]+/);
        const parsed = {};
        for (const line of lines) {
          const parts = line.split(/[:=\-]/);
          if (parts.length >= 2) {
            const k = parts[0].trim().toLowerCase().replace(/\s+/g, '_');
            const v = parts.slice(1).join('-').trim();
            parsed[k] = v;
          }
        }

        const kind = type === 'staff' ? 'staff' : 'van';

        if (kind === 'staff') {
          // Non-gate Staff: ONLY Full Name is required (no vehicle no, no phone no)
          let staffName = '';
          if (jsonParsed && typeof jsonParsed === 'object') {
            staffName = jsonParsed.name || jsonParsed.fullName || jsonParsed.full_name || jsonParsed.staff_name || jsonParsed.driver_name || '';
          }
          if (!staffName) {
            staffName = parsed['name'] || parsed['staff_name'] || parsed['staff'] || parsed['full_name'] || parsed['driver_name'] || '';
          }
          if (!staffName && !text.includes(':') && !text.includes('=')) {
            // Plain text QR (e.g. "Ramu Chandan")
            staffName = text.trim();
          }

          // Strict Sufficiency Validation for Staff
          const nameParts = (staffName || '').trim().split(/\s+/).filter(Boolean);
          const isSufficient = nameParts.length >= 2 && nameParts[0].length >= 2 && nameParts[1].length >= 2 && !/https?:\/\/|[{}\[\]<>]/.test(staffName);

          if (!isSufficient) {
            return sendError(res, 400, `Insufficient information in QR code: The QR code must contain the staff member's full name (both first and last name, e.g. Ramu Chandan). Found: "${(staffName || text).slice(0, 35)}". Not added.`);
          }

          const label = getNextLabel('staff');
          const id = generateId('drv');
          const now = new Date().toISOString();

          db.prepare(`
            INSERT INTO drivers (id, label, type, driver_name, license_number, van_no, phone, vehicle_type, raw_data, created_at)
            VALUES (?, ?, 'staff', ?, '', 'Staff Pass', '', 'walk_in', ?, ?)
          `).run(id, label, staffName.trim(), text, now);

          saveBackupJson();
          broadcastEvent('driver_added', { id, label, driver_name: staffName.trim(), van_no: 'Staff Pass' });
          return sendJson(res, 201, { success: true, label, id, driver_name: staffName.trim(), van_no: 'Staff Pass' });
        }

        // Campus Van / Driver registration
        let driver_name = '';
        if (jsonParsed && typeof jsonParsed === 'object') {
          driver_name = jsonParsed.name || jsonParsed.driver_name || jsonParsed.fullName || '';
        }
        if (!driver_name) {
          driver_name = parsed['name'] || parsed['driver_name'] || parsed['driver'] || '';
        }

        const van_no = (jsonParsed && (jsonParsed.vehicle || jsonParsed.plate || jsonParsed.van_no)) || parsed['vehicle'] || parsed['vehicle_no'] || parsed['vehicle_number'] || parsed['plate'] || '';
        const phone = (jsonParsed && jsonParsed.phone) || parsed['phone'] || parsed['mobile'] || parsed['contact'] || '';
        const vehicle_type = parsed['type'] && parsed['type'].includes('2') ? '2_wheeler' : '4_wheeler';

        // Check if sufficient info for Van
        const nameParts = (driver_name || '').trim().split(/\s+/).filter(Boolean);
        const nameValid = nameParts.length >= 2 && nameParts[0].length >= 2 && nameParts[1].length >= 2;

        if (!driver_name || !van_no || !nameValid) {
          return sendError(res, 400, `Insufficient information in QR code: Missing ${!driver_name ? 'full name ' : !nameValid ? 'valid full name (first & last name) ' : ''}${!van_no ? 'vehicle plate number' : ''}. Not added.`);
        }

        const label = getNextLabel('van');
        const id = generateId('drv');
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO drivers (id, label, type, driver_name, license_number, van_no, phone, vehicle_type, raw_data, created_at)
          VALUES (?, ?, 'van', ?, '', ?, ?, ?, ?, ?)
        `).run(id, label, driver_name.trim(), van_no.toUpperCase(), phone, vehicle_type, text, now);

        db.prepare(`
          INSERT INTO van_locations (van_id, van_label, lat, lng, live, updated_at)
          VALUES (?, ?, 0, 0, 0, ?)
        `).run(id, label, now);

        saveBackupJson();
        broadcastEvent('driver_added', { id, label, driver_name: driver_name.trim(), van_no });
        return sendJson(res, 201, { success: true, label, id, driver_name: driver_name.trim(), van_no });
      }

      // VAN ENTRY/EXIT REGISTER: View logs with date filter & pagination (§7.6)
      if (pathname === '/api/logs' && req.method === 'GET') {
        const driverId = urlObj.searchParams.get('driverId');
        const date = urlObj.searchParams.get('date'); // YYYY-MM-DD
        const limit = parseInt(urlObj.searchParams.get('limit') || '500', 10);
        const offset = parseInt(urlObj.searchParams.get('offset') || '0', 10);

        let query = 'SELECT * FROM van_logs WHERE 1=1';
        const params = [];

        if (driverId) {
          query += ' AND driver_id = ?';
          params.push(driverId);
        }
        if (date) {
          query += ' AND date(timestamp) = date(?)';
          params.push(date);
        }

        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const logs = db.prepare(query).all(...params);
        const safeLogs = logs.map(l => ({
          id: l.id,
          driver_label: l.driver_label || 'Vehicle',
          driver_name: l.driver_name || 'Driver',
          event_type: l.event_type,
          scanned_by: l.scanned_by,
          timestamp: l.timestamp
        }));

        // Daily stats
        let statsQuery = 'SELECT event_type, count(*) as count FROM van_logs WHERE 1=1';
        const statsParams = [];
        if (driverId) {
          statsQuery += ' AND driver_id = ?';
          statsParams.push(driverId);
        }
        if (date) {
          statsQuery += ' AND date(timestamp) = date(?)';
          statsParams.push(date);
        }
        statsQuery += ' GROUP BY event_type';
        const statsRows = db.prepare(statsQuery).all(...statsParams);

        const stats = { entry: 0, exit: 0, journey_start: 0 };
        for (const row of statsRows) {
          if (stats[row.event_type] !== undefined) stats[row.event_type] = row.count;
        }

        return sendJson(res, 200, { logs: safeLogs, stats });
      }

      // VAN REGISTER: Clear logs for driver/day (§7.6)
      if (pathname === '/api/logs' && req.method === 'DELETE') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required to clear logs');
        const driverId = urlObj.searchParams.get('driverId');
        const date = urlObj.searchParams.get('date');

        let query = 'DELETE FROM van_logs WHERE 1=1';
        const params = [];
        if (driverId) {
          query += ' AND driver_id = ?';
          params.push(driverId);
        }
        if (date) {
          query += ' AND date(timestamp) = date(?)';
          params.push(date);
        }

        db.prepare(query).run(...params);
        broadcastEvent('logs_cleared', { driverId, date });
        return sendJson(res, 200, { success: true });
      }

      // DRIVER JOURNEY: Start Journey (§7.8)
      if (pathname === '/api/journey/start' && req.method === 'POST') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        let { vanId, lat, lng } = await readJsonBody(req);
        
        // Auto-resolve van if not directly provided
        if (!vanId && user.driverProfile && user.driverProfile.selected_van_id) {
          vanId = user.driverProfile.selected_van_id;
        }

        let van = vanId ? db.prepare('SELECT * FROM drivers WHERE id = ?').get(vanId) : null;
        if (!van) {
          van = db.prepare("SELECT * FROM drivers WHERE type = 'van' AND (phone = ? OR driver_name = ?)").get(user.phone || '', user.display_name || '');
        }
        if (!van) {
          van = db.prepare("SELECT * FROM drivers WHERE type = 'van' ORDER BY created_at ASC LIMIT 1").get();
        }
        if (!van) return sendError(res, 404, 'No transport van found. Please have gate staff register your van first.');

        vanId = van.id;
        const now = new Date().toISOString();

        // Update driver profile with this resolved van
        if (user.driverProfile) {
          db.prepare('UPDATE driver_profiles SET selected_van_id = ?, selected_van_label = ? WHERE user_id = ?').run(van.id, van.label, user.id);
        }

        // Record journey_start log
        db.prepare(`
          INSERT INTO van_logs (id, qr_identifier, driver_id, driver_name, driver_label, event_type, scanned_by, timestamp)
          VALUES (?, '', ?, ?, ?, 'journey_start', ?, ?)
        `).run(generateId('log'), van.id, van.driver_name, van.label, user.display_name || user.email, now);

        // Clear pending entry alerts
        db.prepare('DELETE FROM ride_alerts WHERE van_id = ? AND alert_type = \'entry_no_journey\'').run(van.id);

        // Mark location live with real hardware coordinates (no dummy city coordinates)
        const realLat = (lat !== undefined && lat !== null && !isNaN(Number(lat)) && Number(lat) !== 0) ? Number(lat) : null;
        const realLng = (lng !== undefined && lng !== null && !isNaN(Number(lng)) && Number(lng) !== 0) ? Number(lng) : null;

        if (realLat !== null && realLng !== null) {
          db.prepare(`
            INSERT INTO van_locations (van_id, van_label, lat, lng, live, updated_at)
            VALUES (?, ?, ?, ?, 1, ?)
            ON CONFLICT(van_id) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, live = 1, updated_at = excluded.updated_at
          `).run(van.id, van.label, realLat, realLng, now);
        } else {
          db.prepare(`
            INSERT INTO van_locations (van_id, van_label, lat, lng, live, updated_at)
            VALUES (?, ?, 0, 0, 1, ?)
            ON CONFLICT(van_id) DO UPDATE SET live = 1, updated_at = excluded.updated_at
          `).run(van.id, van.label, now);
        }

        // Notify tracking parents
        const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const trackingChildren = db.prepare('SELECT parent_id FROM children WHERE van_id = ?').all(van.id);
        for (const child of trackingChildren) {
          db.prepare(`
            INSERT INTO parent_notifications (id, parent_id, van_id, van_label, event_type, event_time, message, read, created_at)
            VALUES (?, ?, ?, ?, 'journey_start', ?, ?, 0, ?)
          `).run(generateId('notif'), child.parent_id, van.id, van.label, now, `${van.label} has started its journey at ${formattedTime}! Live GPS tracking is now active.`, now);
        }

        const locRow = db.prepare('SELECT lat, lng FROM van_locations WHERE van_id = ?').get(van.id);
        const finalLat = realLat !== null ? realLat : (locRow ? locRow.lat : 0);
        const finalLng = realLng !== null ? realLng : (locRow ? locRow.lng : 0);

        broadcastEvent('journey_started', { vanId: van.id, label: van.label, lat: finalLat, lng: finalLng });
        return sendJson(res, 200, { success: true, vanId: van.id, label: van.label, live: true, lat: finalLat, lng: finalLng });
      }

      // DRIVER JOURNEY: Get Status
      if (pathname === '/api/journey/status' && req.method === 'GET') {
        const vanId = urlObj.searchParams.get('vanId');
        if (!vanId) return sendJson(res, 200, { live: false });
        const loc = db.prepare('SELECT live, lat, lng FROM van_locations WHERE van_id = ?').get(vanId);
        return sendJson(res, 200, {
          live: Boolean(loc && loc.live),
          lat: loc ? loc.lat : null,
          lng: loc ? loc.lng : null
        });
      }

      // DRIVER JOURNEY: End Journey
      if (pathname === '/api/journey/end' && req.method === 'POST') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        let { vanId } = await readJsonBody(req);
        if (!vanId && user.driverProfile && user.driverProfile.selected_van_id) {
          vanId = user.driverProfile.selected_van_id;
        }
        const now = new Date().toISOString();
        if (vanId) {
          db.prepare('UPDATE van_locations SET live = 0, updated_at = ? WHERE van_id = ?').run(now, vanId);
          const van = db.prepare('SELECT id, label, driver_name FROM drivers WHERE id = ?').get(vanId);
          if (van) {
            db.prepare(`
              INSERT INTO van_logs (id, qr_identifier, driver_id, driver_name, driver_label, event_type, scanned_by, timestamp)
              VALUES (?, '', ?, ?, ?, 'journey_end', ?, ?)
            `).run(generateId('log'), van.id, van.driver_name, van.label, user.display_name || user.username || user.email, now);

            // Notify parents that journey completed
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const trackingChildren = db.prepare('SELECT parent_id FROM children WHERE van_id = ?').all(van.id);
            for (const child of trackingChildren) {
              db.prepare(`
                INSERT INTO parent_notifications (id, parent_id, van_id, van_label, event_type, event_time, message, read, created_at)
                VALUES (?, ?, ?, ?, 'journey_end', ?, ?, 0, ?)
              `).run(generateId('notif'), child.parent_id, van.id, van.label, now, `${van.label} completed its transit journey at ${timeStr}.`, now);
            }
          }
          broadcastEvent('journey_ended', { vanId, label: van?.label, timestamp: now });
          saveBackupJson();
        }
        return sendJson(res, 200, { success: true, live: false });
      }

      // PARENT DASHBOARD: Dedicated Notification Boards (Journey Activity + Campus Gate Entry/Exit)
      if (pathname === '/api/parent/boards' && req.method === 'GET') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        
        let targetVanId = urlObj.searchParams.get('vanId');
        if (!targetVanId) {
          const child = db.prepare('SELECT van_id FROM children WHERE parent_id = ? AND van_id IS NOT NULL LIMIT 1').get(user.id);
          if (child && child.van_id) targetVanId = child.van_id;
        }
        if (!targetVanId && user.parentProfile && user.parentProfile.selected_van_id) {
          targetVanId = user.parentProfile.selected_van_id;
        }

        let van = null;
        if (targetVanId) {
          van = db.prepare('SELECT id, label, driver_name, van_no, phone, vehicle_type FROM drivers WHERE id = ?').get(targetVanId);
        }
        if (!van) {
          van = db.prepare("SELECT id, label, driver_name, van_no, phone, vehicle_type FROM drivers WHERE type = 'van' LIMIT 1").get();
        }

        const vanId = van ? van.id : null;
        let isJourneyActive = false;
        let isCampusPresent = false;
        let journeyLogs = [];
        let gateLogs = [];

        if (vanId) {
          const loc = db.prepare('SELECT live FROM van_locations WHERE van_id = ?').get(vanId);
          isJourneyActive = Boolean(loc && loc.live);

          // Journey Activity Board: 'journey_start' and 'journey_end'
          journeyLogs = db.prepare(`
            SELECT id, driver_id, driver_name, driver_label, event_type, scanned_by, timestamp 
            FROM van_logs 
            WHERE driver_id = ? AND (event_type = 'journey_start' OR event_type = 'journey_end')
            ORDER BY timestamp DESC LIMIT 30
          `).all(vanId);

          // Campus Gate Security Board: 'entry' and 'exit'
          gateLogs = db.prepare(`
            SELECT id, driver_id, driver_name, driver_label, event_type, scanned_by, timestamp 
            FROM van_logs 
            WHERE driver_id = ? AND (event_type = 'entry' OR event_type = 'exit')
            ORDER BY timestamp DESC LIMIT 30
          `).all(vanId);

          if (gateLogs.length > 0 && gateLogs[0].event_type === 'entry') {
            isCampusPresent = true;
          }
        }

        return sendJson(res, 200, {
          van,
          isJourneyActive,
          isCampusPresent,
          journeyLogs,
          gateLogs
        });
      }

      // LIVE GPS: Update position from driver device (§7.8)
      if (pathname === '/api/location/update' && req.method === 'POST') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const { vanId, lat, lng } = await readJsonBody(req);
        if (!vanId || lat === undefined || lng === undefined) return sendError(res, 400, 'vanId, lat and lng are required');

        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO van_locations (van_id, van_label, lat, lng, live, updated_at)
          VALUES (?, (SELECT label FROM drivers WHERE id = ?), ?, ?, 1, ?)
          ON CONFLICT(van_id) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, live = 1, updated_at = excluded.updated_at
        `).run(vanId, vanId, lat, lng, now);

        const payload = { van_id: vanId, lat, lng, live: 1, updated_at: now };
        broadcastEvent('location_update', payload);
        return sendJson(res, 200, { success: true });
      }

      // LIVE GPS: Get all van locations (§7.10)
      if (pathname === '/api/locations' && req.method === 'GET') {
        const locations = db.prepare(`
          SELECT vl.*, d.driver_name, d.van_no, d.phone 
          FROM van_locations vl
          LEFT JOIN drivers d ON vl.van_id = d.id
        `).all();
        return sendJson(res, 200, { locations });
      }

      // SAFETY ALERTS: Get alerts for user (§7.11)
      if (pathname === '/api/alerts' && req.method === 'GET') {
        runPendingJourneysSafetyCheck();
        const alerts = db.prepare('SELECT * FROM ride_alerts ORDER BY created_at DESC LIMIT 50').all();
        return sendJson(res, 200, { alerts });
      }

      // SAFETY ALERTS: Mark read
      if (pathname === '/api/alerts/mark-read' && req.method === 'POST') {
        db.prepare('UPDATE ride_alerts SET read = 1').run();
        return sendJson(res, 200, { success: true });
      }

      // PARENT: Get notifications (§7.9)
      if (pathname === '/api/notifications' && req.method === 'GET') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const notifications = db.prepare(`
          SELECT * FROM parent_notifications 
          WHERE parent_id = ? 
          ORDER BY created_at DESC LIMIT 50
        `).all(user.id);
        return sendJson(res, 200, { notifications });
      }

      // PARENT: Mark notifications read
      if (pathname === '/api/notifications/mark-read' && req.method === 'POST') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        db.prepare('UPDATE parent_notifications SET read = 1 WHERE parent_id = ?').run(user.id);
        return sendJson(res, 200, { success: true });
      }

      // CHILDREN MANAGER: Get children for parent (§7.9)
      if (pathname === '/api/children' && req.method === 'GET') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const children = db.prepare('SELECT * FROM children WHERE parent_id = ? ORDER BY created_at ASC').all(user.id);
        return sendJson(res, 200, { children });
      }

      // CHILDREN MANAGER: Add child (max 5)
      if (pathname === '/api/children' && req.method === 'POST') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const count = db.prepare('SELECT count(*) as count FROM children WHERE parent_id = ?').get(user.id).count;
        if (count >= 5) return sendError(res, 400, 'Maximum 5 children allowed per parent account');

        const { name, van_id, vanId } = await readJsonBody(req);
        const childName = (name || '').trim();
        const targetVan = van_id || vanId;
        if (!childName || !targetVan) return sendError(res, 400, 'Student full name and assigned van are required');

        // Full Name Validation for student
        const nameParts = childName.split(/\s+/).filter(Boolean);
        if (nameParts.length < 2 || nameParts[0].length < 2 || nameParts[1].length < 2) {
          return sendError(res, 400, 'Please enter the student\'s full name (both first and last name, e.g. Rahul Sharma)');
        }

        const van = db.prepare('SELECT label FROM drivers WHERE id = ?').get(targetVan);
        const vanLabel = van ? van.label : 'Van';
        const childId = generateId('ch');
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO children (id, parent_id, name, van_id, van_label, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(childId, user.id, childName, targetVan, vanLabel, now);

        // Auto sync parent's selected van
        db.prepare(`
          UPDATE parents SET selected_van_id = ?, selected_van_label = ? WHERE user_id = ?
        `).run(targetVan, vanLabel, user.id);

        return sendJson(res, 201, { id: childId, name, van_id, vanLabel });
      }

      // CHILDREN MANAGER: Delete child
      if (pathname.startsWith('/api/children/') && req.method === 'DELETE') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const childId = pathname.split('/')[3];
        db.prepare('DELETE FROM children WHERE id = ? AND parent_id = ?').run(childId, user.id);
        return sendJson(res, 200, { success: true });
      }

      // DRIVER: "View My Students" (child names + addresses + coordinates, NO parent phone, §7.8 & §10)
      if (pathname === '/api/my-students' && req.method === 'GET') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const vanId = urlObj.searchParams.get('vanId') || (user.driverProfile && user.driverProfile.selected_van_id);
        if (!vanId) return sendJson(res, 200, { students: [] });

        const students = db.prepare(`
          SELECT c.id, c.name, p.address, p.address_lat, p.address_lng
          FROM children c
          JOIN parents p ON c.parent_id = p.user_id
          WHERE c.van_id = ?
        `).all(vanId);

        return sendJson(res, 200, { students });
      }

      // DIRECTORIES: Staff Directory (Approved staff public contact list with tap-to-call, §7.7)
      if (pathname === '/api/directories/staff' && req.method === 'GET') {
        const staff = db.prepare(`
          SELECT sr.full_name, sr.phone, sr.email, sr.notes
          FROM staff_requests sr
          WHERE sr.status = 'approved'
          ORDER BY sr.full_name ASC
        `).all();
        return sendJson(res, 200, { staff });
      }

      // DIRECTORIES: Parent Directory (Parents with address + vans derived from children, §7.7)
      if (pathname === '/api/directories/parents' && req.method === 'GET') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const parents = db.prepare(`
          SELECT p.name, p.phone, p.address, p.address_lat, p.address_lng,
                 GROUP_CONCAT(c.van_label, ', ') as vans,
                 GROUP_CONCAT(c.name, ', ') as children_names
          FROM parents p
          LEFT JOIN children c ON p.user_id = c.parent_id
          GROUP BY p.id
          ORDER BY p.name ASC
        `).all();
        return sendJson(res, 200, { parents });
      }

      // SETTINGS: Update address for parent
      if (pathname === '/api/parents/address' && req.method === 'POST') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const { address, lat, lng } = await readJsonBody(req);
        db.prepare(`
          UPDATE parents SET address = ?, address_lat = ?, address_lng = ? WHERE user_id = ?
        `).run(address, lat, lng, user.id);
        return sendJson(res, 200, { success: true });
      }

      return sendError(res, 404, 'API endpoint not found');
    } catch (err) {
      console.error('[API Error]', err);
      return sendError(res, 500, err.message || 'Internal server error');
    }
  }

  // -------------------------------------------------------------
  // Static File Serving & Direct Dedicated App Routes
  // (/driver -> driver.html, /parent -> parent.html, /staff -> staff.html, /admin -> admin.html)
  // Subdomains supported: xyz.parent, xyz.driver, xyz.staff, xyz.admin
  // -------------------------------------------------------------
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname.replace(/^\//, ''));

  const host = (req.headers.host || '').toLowerCase();
  let dedicatedHtml = null;

  if (pathname === '/parent' || pathname.startsWith('/parent/') || pathname === '/parent.html') {
    dedicatedHtml = 'parent.html';
  } else if (pathname === '/driver' || pathname.startsWith('/driver/') || pathname === '/driver.html') {
    dedicatedHtml = 'driver.html';
  } else if (pathname === '/staff' || pathname.startsWith('/staff/') || pathname === '/staff.html') {
    dedicatedHtml = 'staff.html';
  } else if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/admin.html') {
    dedicatedHtml = 'admin.html';
  } else if (host.includes('parent')) {
    dedicatedHtml = 'parent.html';
  } else if (host.includes('driver')) {
    dedicatedHtml = 'driver.html';
  } else if (host.includes('staff')) {
    dedicatedHtml = 'staff.html';
  } else if (host.includes('admin')) {
    dedicatedHtml = 'admin.html';
  }

  const isAsset = pathname.includes('.') && !pathname.endsWith('.html');
  if (dedicatedHtml && !isAsset) {
    filePath = path.join(PUBLIC_DIR, dedicatedHtml);
  } else if (!isAsset && (pathname === '/' || pathname === '/launchpad')) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  // Security check: stay within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if file exists, else fallback to index.html for SPA routing
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, dedicatedHtml || 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.mp4': 'video/mp4'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  CAMPUSRIDE — CAMPUS TRANSPORT MANAGEMENT SYSTEM`);
  console.log(`=======================================================`);
  console.log(`  Local URL:        http://localhost:${PORT}`);
  console.log(`  Network Access:   http://0.0.0.0:${PORT}`);
  console.log(`  Realtime Events:  SSE Active (/api/events)`);
  console.log(`  Database:         SQLite (${DB_PATH})`);
  console.log(`=======================================================`);

  // Render Anti-Sleep Keep-Alive: Automatically pings /api/health every 9 minutes
  const pingTarget = process.env.RENDER_EXTERNAL_URL || 'https://campusride-1-nt84.onrender.com';
  if (pingTarget) {
    const httpLib = pingTarget.startsWith('https') ? https : http;
    setInterval(() => {
      try {
        httpLib.get(`${pingTarget}/api/health`, (res) => {
          // Warm ping succeeded
        }).on('error', () => {});
      } catch {}
    }, 9 * 60 * 1000);
    console.log(`  Keep-Alive:       Auto-pinger active for ${pingTarget}`);
  }
});
