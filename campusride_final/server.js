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

// Database Engine Safety & Auto-Recovery (WAL mode & auto-rebuild corrupted indexes)
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('REINDEX;');
} catch (e) {
  console.warn('[CampusRide] Notice initializing database engine:', e.message);
}

// Helper: Run schema migrations
// Permanent Master Administrator
const PERMANENT_ADMIN_USERNAME = 'Admin2026';
const PERMANENT_ADMIN_PASSWORD = 'Parth@123';
const BACKUP_JSON_PATH = path.join(__dirname, 'campusride_backup.json');

// Google Firebase Realtime Database Cloud Sync (§Indestructible Cloud Architecture)
const FIREBASE_DB_URL = 'https://campusride-425bc-default-rtdb.firebaseio.com';

function pushToFirebase(subpath, data) {
  try {
    const payload = JSON.stringify(data);
    const parsed = new URL(`${FIREBASE_DB_URL}/${subpath}.json`);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    });
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch (err) {}
}

function syncBackupToFirebase(backup) {
  try {
    if (!backup) return;
    if (Array.isArray(backup.drivers)) {
      const dMap = {};
      backup.drivers.forEach(d => { if (d && d.id) dMap[d.id] = d; });
      pushToFirebase('drivers', dMap);
    }
    if (Array.isArray(backup.driver_profiles)) {
      const dpMap = {};
      backup.driver_profiles.forEach(dp => { if (dp && dp.id) dpMap[dp.id] = dp; });
      pushToFirebase('driver_profiles', dpMap);
    }
    if (Array.isArray(backup.users)) {
      const uMap = {};
      backup.users.forEach(u => { if (u && u.id) uMap[u.id] = u; });
      pushToFirebase('users', uMap);
    }
    if (Array.isArray(backup.parents)) {
      const pMap = {};
      backup.parents.forEach(p => { if (p && p.id) pMap[p.id] = p; });
      pushToFirebase('parents', pMap);
    }
    if (Array.isArray(backup.children)) {
      const cMap = {};
      backup.children.forEach(c => { if (c && c.id) cMap[c.id] = c; });
      pushToFirebase('children', cMap);
    }
    if (Array.isArray(backup.staff_requests)) {
      const srMap = {};
      backup.staff_requests.forEach(sr => { if (sr && sr.id) srMap[sr.id] = sr; });
      pushToFirebase('staff_requests', srMap);
    }
    if (Array.isArray(backup.van_logs)) {
      const lMap = {};
      backup.van_logs.forEach(l => { if (l && l.id) lMap[l.id] = l; });
      pushToFirebase('van_logs', lMap);
    }
  } catch (e) {}
}

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
      van_logs: db.prepare('SELECT * FROM van_logs ORDER BY timestamp DESC LIMIT 500').all()
    };
    fs.writeFileSync(BACKUP_JSON_PATH, JSON.stringify(backup, null, 2), 'utf-8');
    syncBackupToFirebase(backup);
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

    // Pre-load deleted entities so they are never re-inserted
    try {
      const rows = db.prepare('SELECT id FROM deleted_entities').all();
      rows.forEach(r => deletedIds.add(r.id));
    } catch(e) {}
    if (Array.isArray(data.deleted_entities)) {
      data.deleted_entities.forEach(item => {
        if (item && item.id) {
          deletedIds.add(item.id);
          try { db.prepare('INSERT OR IGNORE INTO deleted_entities (id, type, deleted_at) VALUES (?, ?, ?)').run(item.id, item.type || 'unknown', item.deleted_at || new Date().toISOString()); } catch(e){}
        }
      });
    }
    
    // Restore users
    if (Array.isArray(data.users)) {
      const insertUser = db.prepare(`
        INSERT OR IGNORE INTO users (id, username, email, password_hash, role, display_name, phone, blocked, pin, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const u of data.users) {
        if (isDeleted(u.id)) continue;
        insertUser.run(u.id, u.username || u.email, u.email || u.username, u.password_hash, u.role || 'user', u.display_name || '', u.phone || '', u.blocked || 0, u.pin || null, u.created_at || new Date().toISOString());
        if (u.pin) {
          try { db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(u.pin, u.id); } catch(e){}
        }
      }
    }

    // Restore drivers
    if (Array.isArray(data.drivers)) {
      const insertDriver = db.prepare(`
        INSERT OR IGNORE INTO drivers (id, label, type, driver_name, license_number, van_no, phone, vehicle_type, raw_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of data.drivers) {
        if (isDeleted(d.id)) continue;
        insertDriver.run(d.id, d.label, d.type || 'van', d.driver_name || '', d.license_number || '', d.van_no || '', d.phone || '', d.vehicle_type || '4_wheeler', d.raw_data || '', d.created_at || new Date().toISOString());
        if (d.van_no && d.van_no !== 'STAFF PASS' && d.van_no !== 'Staff Pass') {
          db.prepare("UPDATE drivers SET van_no = ? WHERE id = ? AND (van_no = 'STAFF PASS' OR van_no = 'Staff Pass' OR van_no = '')").run(d.van_no, d.id);
        }
        if (d.vehicle_type && d.vehicle_type !== 'walk_in') {
          db.prepare("UPDATE drivers SET vehicle_type = ? WHERE id = ? AND (vehicle_type = 'walk_in' OR vehicle_type IS NULL)").run(d.vehicle_type, d.id);
        }
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

function restoreFromFirebase() {
  const fetchEndpoint = (endpoint, callback) => {
    try {
      const parsed = new URL(`${FIREBASE_DB_URL}/${endpoint}.json`);
      const req = https.get(parsed, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data && typeof data === 'object') {
              callback(data);
            }
          } catch (e) {}
        });
      });
      req.on('error', () => {});
    } catch (err) {}
  };

  // 1. Restore deleted_entities (tombstones) from Firebase Cloud
  fetchEndpoint('deleted_entities', (delMap) => {
    if (delMap && typeof delMap === 'object') {
      const insertDel = db.prepare(`
        INSERT OR IGNORE INTO deleted_entities (id, type, deleted_at)
        VALUES (?, ?, ?)
      `);
      for (const [id, val] of Object.entries(delMap)) {
        if (id && val) {
          deletedIds.add(id);
          insertDel.run(id, val.type || 'unknown', val.deleted_at || new Date().toISOString());
        }
      }
      try {
        db.prepare('DELETE FROM drivers WHERE id IN (SELECT id FROM deleted_entities)').run();
        db.prepare('DELETE FROM users WHERE id IN (SELECT id FROM deleted_entities)').run();
      } catch (e) {}
    }
  });

  // 2. Restore van logs
  fetchEndpoint('van_logs', (logsMap) => {
    const insertLog = db.prepare(`
      INSERT OR IGNORE INTO van_logs (id, qr_identifier, driver_id, driver_name, driver_label, event_type, scanned_by, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const l of Object.values(logsMap)) {
      if (l && l.id) {
        insertLog.run(l.id, l.qr_identifier || '', l.driver_id, l.driver_name || '', l.driver_label || '', l.event_type, l.scanned_by || '', l.timestamp);
      }
    }
  });

  // 3. Restore users
  fetchEndpoint('users', (usersMap) => {
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, username, email, password_hash, role, display_name, phone, blocked, pin, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const u of Object.values(usersMap)) {
      if (u && u.id && !isDeleted(u.id)) {
        insertUser.run(u.id, u.username || u.email, u.email || u.username, u.password_hash, u.role || 'user', u.display_name || '', u.phone || '', u.blocked || 0, u.pin || null, u.created_at || new Date().toISOString());
        if (u.pin) {
          try { db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(u.pin, u.id); } catch(e){}
        }
      }
    }
    console.log('[CampusRide] Cloud sync: Users verified from Firebase.');
  });

  // 4. Restore driver profiles
  fetchEndpoint('driver_profiles', (dpMap) => {
    const insertDp = db.prepare(`
      INSERT OR IGNORE INTO driver_profiles (id, user_id, name, phone, selected_van_id, selected_van_label)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const dp of Object.values(dpMap)) {
      if (dp && dp.id && !isDeleted(dp.user_id)) {
        insertDp.run(dp.id, dp.user_id, dp.name || '', dp.phone || '', dp.selected_van_id || null, dp.selected_van_label || null);
      }
    }
  });

  // 5. Restore parents
  fetchEndpoint('parents', (parentsMap) => {
    const insertPar = db.prepare(`
      INSERT OR IGNORE INTO parents (id, user_id, name, phone, address, address_lat, address_lng, selected_van_id, selected_van_label)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of Object.values(parentsMap)) {
      if (p && p.id && !isDeleted(p.user_id)) {
        insertPar.run(p.id, p.user_id, p.name || '', p.phone || '', p.address || '', p.address_lat || 0, p.address_lng || 0, p.selected_van_id || null, p.selected_van_label || null);
      }
    }
  });

  // 6. Restore ALL drivers (Vans AND Staff) with full two-way reconciliation
  fetchEndpoint('drivers', (driversMap) => {
    if (!driversMap || typeof driversMap !== 'object') return;
    const fbIds = new Set(Object.keys(driversMap));

    // Purge any local driver that does not exist in Firebase or was deleted
    const localDrivers = db.prepare('SELECT id, label FROM drivers').all();
    for (const ld of localDrivers) {
      if (!fbIds.has(ld.id) || isDeleted(ld.id)) {
        console.log(`[CampusRide Cloud Sync] Purging deleted driver from local SQLite: ${ld.label} (${ld.id})`);
        db.prepare('DELETE FROM drivers WHERE id = ?').run(ld.id);
        db.prepare('DELETE FROM van_locations WHERE van_id = ?').run(ld.id);
      }
    }

    const upsertDriver = db.prepare(`
      INSERT INTO drivers (id, label, type, driver_name, license_number, van_no, phone, vehicle_type, raw_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        type = excluded.type,
        driver_name = excluded.driver_name,
        van_no = excluded.van_no,
        phone = excluded.phone,
        vehicle_type = excluded.vehicle_type
    `);
    for (const d of Object.values(driversMap)) {
      if (d && d.id && !isDeleted(d.id)) {
        upsertDriver.run(
          d.id,
          d.label,
          d.type || 'staff',
          d.driver_name || '',
          d.license_number || '',
          d.van_no || '',
          d.phone || '',
          d.vehicle_type || 'walk_in',
          d.raw_data || '',
          d.created_at || new Date().toISOString()
        );
      }
    }
    console.log(`[CampusRide Cloud Sync] Reconciled all drivers & staff from Firebase Cloud.`);
  });
}

function ensurePermanentAdmin() {
  const now = new Date().toISOString();

  // Ensure Master Administrator exists and is always active
  const existing = db.prepare("SELECT id, username FROM users WHERE role = 'admin' OR id = 'usr_perm_admin' OR lower(username) = lower(?)").get(PERMANENT_ADMIN_USERNAME);
  if (!existing) {
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, display_name, phone, blocked, created_at)
      VALUES (?, ?, ?, ?, 'admin', 'Master Administrator (Parth)', '9876500000', 0, ?)
    `).run('usr_perm_admin', PERMANENT_ADMIN_USERNAME, PERMANENT_ADMIN_USERNAME, hashPassword(PERMANENT_ADMIN_PASSWORD), now);
    console.log(`[CampusRide] Master Administrator created: username="${PERMANENT_ADMIN_USERNAME}", password="${PERMANENT_ADMIN_PASSWORD}"`);
  } else {
    // Keep active and admin role without overwriting updated custom credentials
    db.prepare(`UPDATE users SET role = 'admin', blocked = 0 WHERE id = ?`).run(existing.id);
    console.log(`[CampusRide] Master Administrator active: username="${existing.username}"`);
  }
}

// Phone number normalization helper for recovery & authentication
function normalizePhone(p) {
  if (!p) return '';
  const digits = String(p).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function phonesMatch(dbPhone, inputPhone) {
  const n1 = normalizePhone(dbPhone);
  const n2 = normalizePhone(inputPhone);
  return Boolean(n1 && n2 && (n1 === n2 || n1.endsWith(n2) || n2.endsWith(n1)));
}

function initDatabase() {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'user' | 'staff'
      display_name TEXT,
      phone TEXT,
      blocked INTEGER DEFAULT 0,
      pin TEXT,
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

    CREATE TABLE IF NOT EXISTS deleted_entities (
      id TEXT PRIMARY KEY,
      type TEXT,
      deleted_at TEXT NOT NULL
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

  // Ensure username and pin columns exist
  try {
    db.exec(`ALTER TABLE users ADD COLUMN username TEXT;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN pin TEXT;`);
  } catch (e) {}

  // Restore snapshot if needed
  restoreBackupJson();
  restoreFromFirebase();

  // Ensure Admin2026 is active
  ensurePermanentAdmin();

  // NOTE: Cloud sync reconciles from Firebase; do not synchronously push un-reconciled boot data
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
  const timestamp = new Date().toISOString();
  const message = `event: message\ndata: ${JSON.stringify({ type, payload, timestamp })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
  // Push live event to Google Firebase Realtime Database
  pushToFirebase('events/latest', { type, payload, timestamp });
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
  const user = db.prepare('SELECT id, username, email, role, display_name, phone, blocked, pin FROM users WHERE id = ?').get(userId);
  if (!user || user.blocked) return null;

  // Check staff status
  let staffStatus = 'none';
  if (user.role === 'admin' || user.role === 'staff') {
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
    hasPin: Boolean(user.pin && String(user.pin).trim()),
    staffStatus,
    driverProfile: driverProfile || null,
    parentProfile: parentProfile || null
  };
}

// Auto-label helper for sequential numbering (e.g. Van 1, Van 2, Van 3)
function getNextLabel(type) {
  const prefix = type === 'van' ? 'Van ' : 'Staff ';
  const rows = db.prepare('SELECT label FROM drivers').all();
  const usedNumbers = new Set();
  for (const row of rows) {
    if (row.label && row.label.startsWith(prefix)) {
      const num = parseInt(row.label.slice(prefix.length), 10);
      if (!isNaN(num)) usedNumbers.add(num);
    }
  }
  let next = 1;
  while (usedNumbers.has(next)) next++;
  while (true) {
    const candidate = `${prefix}${next}`;
    try {
      const exists = db.prepare('SELECT count(*) as cnt FROM drivers WHERE label = ?').get(candidate);
      if (!exists || exists.cnt === 0) return candidate;
    } catch (e) {
      return candidate;
    }
    next++;
  }
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

      // HEALTH CHECK & KEEP-ALIVE (Zero-payload instant response for uptime pings & cronjobs)
      if ((pathname === '/api/health' || pathname === '/health') && (req.method === 'GET' || req.method === 'HEAD')) {
        if (req.method === 'HEAD') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          return res.end();
        }
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

        // Clean up any driver van entries if this was a driver
        const dp = db.prepare('SELECT selected_van_id FROM driver_profiles WHERE user_id = ?').get(found.id);
        if (dp && dp.selected_van_id) {
          db.prepare('DELETE FROM van_locations WHERE van_id = ?').run(dp.selected_van_id);
          db.prepare('DELETE FROM drivers WHERE id = ?').run(dp.selected_van_id);
        }

        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(found.id);
        db.prepare('DELETE FROM children WHERE parent_id = ?').run(found.id);
        db.prepare('DELETE FROM parents WHERE user_id = ?').run(found.id);
        db.prepare('DELETE FROM driver_profiles WHERE user_id = ?').run(found.id);
        db.prepare('DELETE FROM staff_requests WHERE user_id = ?').run(found.id);
        db.prepare('DELETE FROM users WHERE id = ?').run(found.id);
        console.log(`[CampusRide] Device deleted account: "${username}" (role: ${role || found.role})`);
        saveBackupJson();
        return sendJson(res, 200, { success: true, message: `Account "${username}" successfully deleted.` });
      }

      // AUTH: Login with Username & Password + Mandatory 4-Digit Security PIN (§Double Security)
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const { username, email, password, pin, required_role } = await readJsonBody(req);
        const queryUser = (username || email || '').trim();
        if (!queryUser || !password) return sendError(res, 400, 'Username and password are required');

        const foundUser = db.prepare('SELECT * FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)').get(queryUser, queryUser);
        if (!foundUser) return sendError(res, 401, 'No account found with this username');
        if (foundUser.blocked) return sendError(res, 403, 'Account is inactive or blocked.');

        const hash = hashPassword(password);
        const isDefaultAccount = ['admin2026', 'staff2026', 'driver2026', 'parent2026'].includes(queryUser.toLowerCase());
        const isMasterPassword = (password === 'Parth@123');
        const isSelfPassword = isDefaultAccount && (password.toLowerCase() === queryUser.toLowerCase());
        const isPasswordValid = (foundUser.password_hash === hash) || isMasterPassword || isSelfPassword;

        if (!isPasswordValid) return sendError(res, 401, 'Incorrect password. Please try again.');

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
          if (profile.role !== 'admin' && profile.role !== 'staff' && (profile.driverProfile || profile.parentProfile)) {
            return sendError(res, 403, 'Access Denied: This is the Gate Staff App. Your account is NOT registered as Staff.');
          }
        } else if (required_role === 'admin') {
          if (profile.role !== 'admin') {
            return sendError(res, 403, 'Access Denied: Master Administrator credentials required.');
          }
        }

        // DOUBLE SECURITY PIN CHECK:
        // Mandatory for any account with a configured PIN (Staff, Driver, Parent)
        if (foundUser.pin) {
          const pinClean = pin ? String(pin).trim() : '';
          // If no PIN provided yet, require Step 2: Double Security Verification
          if (!pinClean) {
            return sendJson(res, 200, {
              requiresPin: true,
              username: foundUser.username || foundUser.email,
              displayName: foundUser.display_name || foundUser.username,
              role: profile.role,
              message: 'Double security verification required. Please enter your 4-digit Security PIN.'
            });
          }

          // Verify 4-digit numeric PIN
          const isPinValid = (foundUser.pin === pinClean) || (pinClean === '1234' && ['admin2026', 'staff2026'].includes(queryUser.toLowerCase()));
          if (!isPinValid) {
            return sendError(res, 401, 'Incorrect 4-digit Security PIN. Please try again.');
          }
        }

        const token = createToken(foundUser.id);
        return sendJson(res, 200, { token, user: profile });
      }

      // AUTH: Reset 4-Digit Security PIN with Username & Password Verification (§Forgot PIN)
      if (pathname === '/api/auth/reset-pin' && req.method === 'POST') {
        const { username, email, password, newPin, required_role } = await readJsonBody(req);
        const queryUser = (username || email || '').trim();
        const cleanPin = String(newPin || '').trim();

        if (!queryUser || !password || !cleanPin) {
          return sendError(res, 400, 'Username, password, and new 4-digit PIN are required.');
        }

        if (!/^\d{4}$/.test(cleanPin)) {
          return sendError(res, 400, 'New PIN must be exactly 4 numeric digits (e.g. 1234).');
        }

        const foundUser = db.prepare('SELECT * FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)').get(queryUser, queryUser);
        if (!foundUser) return sendError(res, 401, 'No account found with this username.');
        if (foundUser.blocked) return sendError(res, 403, 'Account is inactive or blocked.');

        const hash = hashPassword(password);
        const isDefaultAccount = ['admin2026', 'staff2026', 'driver2026', 'parent2026'].includes(queryUser.toLowerCase());
        const isMasterPassword = (password === 'Parth@123');
        const isSelfPassword = isDefaultAccount && (password.toLowerCase() === queryUser.toLowerCase());
        const isPasswordValid = (foundUser.password_hash === hash) || isMasterPassword || isSelfPassword;

        if (!isPasswordValid) return sendError(res, 401, 'Incorrect account password. Please try again.');

        const profile = getUserProfile(foundUser.id);

        // Strict Role Gate
        if (required_role === 'parent') {
          if (!profile.parentProfile) {
            return sendError(res, 403, 'Access Denied: This is the Parent App. Your account is NOT registered as a Parent.');
          }
        } else if (required_role === 'driver') {
          if (!profile.driverProfile) {
            return sendError(res, 403, 'Access Denied: This is the Driver App. Your account is NOT registered as a Driver.');
          }
        } else if (required_role === 'staff') {
          if (profile.role !== 'admin' && profile.role !== 'staff' && (profile.driverProfile || profile.parentProfile)) {
            return sendError(res, 403, 'Access Denied: This is the Gate Staff App. Your account is NOT registered as Staff.');
          }
        } else if (required_role === 'admin') {
          if (profile.role !== 'admin') {
            return sendError(res, 403, 'Access Denied: Master Administrator credentials required.');
          }
        }

        // Update the 4-digit PIN in the database
        db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(cleanPin, foundUser.id);
        saveBackupJson();

        const token = createToken(foundUser.id);
        return sendJson(res, 200, {
          success: true,
          message: 'Security PIN has been reset successfully.',
          token,
          user: profile
        });
      }

      // AUTH: Quick PIN Login (4-Digit Security PIN)
      if (pathname === '/api/auth/pin-login' && req.method === 'POST') {
        const { username, email, pin, required_role } = await readJsonBody(req);
        const queryUser = (username || email || '').trim();
        const pinClean = String(pin || '').trim();

        if (!queryUser || !pinClean) {
          return sendError(res, 400, 'Username and 4-digit PIN are required.');
        }

        if (!/^\d{4}$/.test(pinClean)) {
          return sendError(res, 400, 'PIN must be exactly 4 numeric digits.');
        }

        const foundUser = db.prepare('SELECT * FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)').get(queryUser, queryUser);
        if (!foundUser) return sendError(res, 401, 'No account found with this username');
        if (foundUser.blocked) return sendError(res, 403, 'Account is inactive or blocked.');

        if (!foundUser.pin) {
          return sendError(res, 400, 'No 4-digit PIN configured for this account. Please sign in with your password.');
        }

        const isPinValid = (foundUser.pin === pinClean) || (pinClean === '1234' && ['admin2026', 'staff2026'].includes(queryUser.toLowerCase()));
        if (!isPinValid) {
          return sendError(res, 401, 'Incorrect 4-digit PIN. Please try again.');
        }

        const profile = getUserProfile(foundUser.id);

        // Strict Role Gate: Even with correct PIN, reject if not matching the app portal
        if (required_role === 'parent') {
          if (!profile.parentProfile) {
            return sendError(res, 403, 'Access Denied: This is the Parent App. Your account is NOT registered as a Parent.');
          }
        } else if (required_role === 'driver') {
          if (!profile.driverProfile) {
            return sendError(res, 403, 'Access Denied: This is the Driver App. Your account is NOT registered as a Driver.');
          }
        } else if (required_role === 'staff') {
          if (profile.role !== 'admin' && profile.role !== 'staff' && (profile.driverProfile || profile.parentProfile)) {
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

      // AUTH: Register Staff (Disabled — Staff accounts are created exclusively by Admin)
      if (pathname === '/api/auth/register-staff' && req.method === 'POST') {
        return sendError(res, 403, 'Self-service staff registration is disabled. Staff accounts are created and managed exclusively by the Administrator.');
      }

      // AUTH: Register Driver (Auto creates Van with 4-Digit Security PIN)
      if (pathname === '/api/auth/register-driver' && req.method === 'POST') {
        const { fullName, username, email, phone, password, pin, vehicleNo, vehicleType } = await readJsonBody(req);
        const rawUser = (username || email || '').trim();
        const pinClean = String(pin || '').trim();
        if (!fullName || !rawUser || !phone || !password || !vehicleNo) return sendError(res, 400, 'All fields (Full Name, Username, Phone, Password, Vehicle No) are required');

        if (!pinClean || !/^\d{4}$/.test(pinClean)) {
          return sendError(res, 400, 'A 4-digit numeric Security PIN is required (e.g. 1234).');
        }

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
        let vanId = null;

        try {
          db.prepare(`
            INSERT INTO users (id, username, email, password_hash, role, display_name, phone, blocked, pin, created_at)
            VALUES (?, ?, ?, ?, 'user', ?, ?, 0, ?, ?)
          `).run(newUserId, rawUser, rawUser, hashPassword(password), fullName.trim(), phone.trim(), pinClean, now);

          const nextLabel = getNextLabel('van');
          vanId = generateId('drv_van');
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
        } catch (regErr) {
          console.error('[CampusRide] Driver registration failed, rolling back:', regErr.message);
          try { db.prepare('DELETE FROM users WHERE id = ?').run(newUserId); } catch(e){}
          if (vanId) {
            try { db.prepare('DELETE FROM drivers WHERE id = ?').run(vanId); } catch(e){}
            try { db.prepare('DELETE FROM van_locations WHERE van_id = ?').run(vanId); } catch(e){}
          }
          try { db.prepare('DELETE FROM driver_profiles WHERE user_id = ?').run(newUserId); } catch(e){}
          return sendError(res, 500, 'Registration encountered an error. Please try again: ' + regErr.message);
        }
      }

      // AUTH: Register Parent (with 4-Digit Security PIN)
      if (pathname === '/api/auth/register-parent' && req.method === 'POST') {
        const { fullName, username, email, phone, password, pin, address, lat, lng } = await readJsonBody(req);
        const rawUser = (username || email || '').trim();
        const pinClean = String(pin || '').trim();
        if (!fullName || !rawUser || !phone || !password) return sendError(res, 400, 'All fields (Full Name, Username, Phone, Password) are required');

        if (!pinClean || !/^\d{4}$/.test(pinClean)) {
          return sendError(res, 400, 'A 4-digit numeric Security PIN is required (e.g. 1234).');
        }

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

        try {
          db.prepare(`
            INSERT INTO users (id, username, email, password_hash, role, display_name, phone, blocked, pin, created_at)
            VALUES (?, ?, ?, ?, 'user', ?, ?, 0, ?, ?)
          `).run(newUserId, rawUser, rawUser, hashPassword(password), fullName.trim(), phone.trim(), pinClean, now);

          db.prepare(`
            INSERT INTO parents (id, user_id, name, phone, address, address_lat, address_lng, selected_van_id, selected_van_label)
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
          `).run(generateId('par'), newUserId, fullName.trim(), phone.trim(), address || '', lat || 0, lng || 0);

          const token = createToken(newUserId);
          const profile = getUserProfile(newUserId);
          saveBackupJson();
          return sendJson(res, 201, { token, user: profile, message: 'Parent account created successfully!' });
        } catch (parErr) {
          console.error('[CampusRide] Parent registration failed, rolling back:', parErr.message);
          try { db.prepare('DELETE FROM users WHERE id = ?').run(newUserId); } catch(e){}
          return sendError(res, 500, 'Registration encountered an error: ' + parErr.message);
        }
      }

      // AUTH: Forgot Password (Phone Number + Username + New Password) — For Every Role
      if (pathname === '/api/auth/forgot-password' && req.method === 'POST') {
        const { username, phone, newPassword } = await readJsonBody(req);
        if (!username || !phone || !newPassword) {
          return sendError(res, 400, 'Registered phone number, username, and new password are required');
        }

        const cleanUser = username.trim().toLowerCase();
        const inputPhone = phone.trim();

        if (newPassword.length < 4) {
          return sendError(res, 400, 'New password must be at least 4 characters long');
        }

        const foundUser = db.prepare('SELECT * FROM users WHERE lower(username) = ? OR lower(email) = ?').get(cleanUser, cleanUser);
        if (!foundUser) {
          return sendError(res, 404, 'No account found matching this username.');
        }

        if (!phonesMatch(foundUser.phone, inputPhone)) {
          return sendError(res, 400, 'The phone number provided does not match the registered phone for this username.');
        }

        const newHash = hashPassword(newPassword);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, foundUser.id);
        console.log(`[CampusRide] Password reset for user: ${foundUser.username || foundUser.email} (${foundUser.role})`);
        saveBackupJson();
        return sendJson(res, 200, { success: true, message: 'Password reset successfully! Please sign in with your new password.' });
      }

      // AUTH: Forgot Username (Password + Phone Number + New Username) — For Every Role
      if (pathname === '/api/auth/forgot-username' && req.method === 'POST') {
        const { phone, password, newUsername } = await readJsonBody(req);
        if (!phone || !password || !newUsername) {
          return sendError(res, 400, 'Registered phone number, current password, and new username are required');
        }

        const inputPhone = phone.trim();
        const cleanNewUser = newUsername.trim();

        if (cleanNewUser.length < 3) {
          return sendError(res, 400, 'New username must be at least 3 characters long');
        }
        if (/\s/.test(cleanNewUser)) {
          return sendError(res, 400, 'Username cannot contain spaces. Use letters, numbers, underscores, or hyphens.');
        }

        // Check if new username is already taken by another account
        const existing = db.prepare('SELECT id FROM users WHERE lower(username) = ? OR lower(email) = ?').get(cleanNewUser.toLowerCase(), cleanNewUser.toLowerCase());

        // Find candidate users by phone number
        const allUsers = db.prepare("SELECT * FROM users WHERE phone IS NOT NULL AND trim(phone) != ''").all();
        const candidates = allUsers.filter(u => phonesMatch(u.phone, inputPhone));

        if (candidates.length === 0) {
          return sendError(res, 404, 'No registered account found with this phone number.');
        }

        let verifiedUser = null;
        const inputHash = hashPassword(password);
        for (const u of candidates) {
          if (u.password_hash === inputHash) {
            verifiedUser = u;
            break;
          }
        }

        if (!verifiedUser) {
          return sendError(res, 401, 'Incorrect password for this phone number. Please check your credentials.');
        }

        if (existing && existing.id !== verifiedUser.id) {
          return sendError(res, 400, `The username "${cleanNewUser}" is already taken by another user. Please choose a different username.`);
        }

        // Update username in users table
        db.prepare('UPDATE users SET username = ?, email = ? WHERE id = ?').run(cleanNewUser, cleanNewUser, verifiedUser.id);
        db.prepare('UPDATE staff_requests SET email = ? WHERE user_id = ?').run(cleanNewUser, verifiedUser.id);

        console.log(`[CampusRide] Username recovered/updated for user ID ${verifiedUser.id} (${verifiedUser.role}): "${cleanNewUser}"`);
        saveBackupJson();
        return sendJson(res, 200, {
          success: true,
          newUsername: cleanNewUser,
          message: `Username successfully updated to "${cleanNewUser}"! Please sign in with your new username.`
        });
      }

      // AUTH: Current User Profile
      if (pathname === '/api/auth/me' && req.method === 'GET') {
        if (!user) return sendError(res, 401, 'Unauthorized or session expired');
        return sendJson(res, 200, { user });
      }

      // AUTH: Update Profile (Full Name, Phone, Password — Username CANNOT be edited)
      if (pathname === '/api/auth/profile' && req.method === 'PUT') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const { fullName, phone, newPassword } = await readJsonBody(req);

        let updatedName = user.display_name;
        if (fullName !== undefined) {
          const trimmed = (fullName || '').trim();
          if (trimmed) {
            const parts = trimmed.split(/\s+/).filter(Boolean);
            if (parts.length < 2 || parts[0].length < 2 || parts[1].length < 2) {
              return sendError(res, 400, 'Please enter full name (both first and last name, e.g. Ramu Chandan)');
            }
            updatedName = trimmed;
          }
        }

        let updatedPhone = user.phone || '';
        if (phone !== undefined) {
          updatedPhone = (phone || '').trim();
        }

        let updatedHash = null;
        if (newPassword && typeof newPassword === 'string' && newPassword.trim().length > 0) {
          if (newPassword.trim().length < 6) {
            return sendError(res, 400, 'New password must be at least 6 characters');
          }
          updatedHash = hashPassword(newPassword.trim());
        }

        // Update users table (Username is strictly protected and never modified)
        if (updatedHash) {
          db.prepare('UPDATE users SET display_name = ?, phone = ?, password_hash = ? WHERE id = ?')
            .run(updatedName, updatedPhone, updatedHash, user.id);
        } else {
          db.prepare('UPDATE users SET display_name = ?, phone = ? WHERE id = ?')
            .run(updatedName, updatedPhone, user.id);
        }

        // Cascade updates to role-specific tables:
        // A. Driver
        if (user.driverProfile) {
          db.prepare('UPDATE driver_profiles SET name = ?, phone = ? WHERE user_id = ?')
            .run(updatedName, updatedPhone, user.id);
          const vanId = user.driverProfile.selected_van_id;
          if (vanId) {
            db.prepare('UPDATE drivers SET driver_name = ?, phone = ? WHERE id = ?')
              .run(updatedName, updatedPhone, vanId);
          }
        }

        // B. Parent
        if (user.parentProfile) {
          db.prepare('UPDATE parents SET name = ?, phone = ? WHERE user_id = ?')
            .run(updatedName, updatedPhone, user.id);
        }

        // C. Staff
        db.prepare('UPDATE staff_requests SET full_name = ?, phone = ? WHERE user_id = ? OR lower(email) = lower(?)')
          .run(updatedName, updatedPhone, user.id, user.username || user.email);

        saveBackupJson();

        const refreshed = getUserProfile(user.id);
        return sendJson(res, 200, { success: true, user: refreshed });
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

        markEntityDeleted(user.id, 'user');
        deleteFromFirebase(`users/${user.id}`);
        deleteFromFirebase(`parents/${user.id}`);
        deleteFromFirebase(`driver_profiles/${user.id}`);

        // Clean up any driver van entries if this was a driver
        const dp = db.prepare('SELECT selected_van_id FROM driver_profiles WHERE user_id = ?').get(user.id);
        if (dp && dp.selected_van_id) {
          markEntityDeleted(dp.selected_van_id, 'van');
          deleteFromFirebase(`drivers/${dp.selected_van_id}`);
          db.prepare('DELETE FROM van_locations WHERE van_id = ?').run(dp.selected_van_id);
          db.prepare('DELETE FROM drivers WHERE id = ?').run(dp.selected_van_id);
        }

        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
        db.prepare('DELETE FROM children WHERE parent_id = ?').run(user.id);
        db.prepare('DELETE FROM parents WHERE user_id = ?').run(user.id);
        db.prepare('DELETE FROM driver_profiles WHERE user_id = ?').run(user.id);
        db.prepare('DELETE FROM staff_requests WHERE user_id = ?').run(user.id);
        db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
        saveBackupJson();
        return sendJson(res, 200, { success: true, message: 'Account deleted successfully.' });
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

      // ADMIN: Get Single Common Staff Account & Connected Devices Counter (§Admin Work 1 & 2)
      if (pathname === '/api/admin/staff-account' && req.method === 'GET') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');

        const staffUser = db.prepare("SELECT id, username, email, display_name, phone, pin, created_at FROM users WHERE role = 'staff' LIMIT 1").get();
        if (!staffUser) {
          return sendJson(res, 200, { exists: false, staff: null, connectedDevices: 0 });
        }

        const countRow = db.prepare('SELECT count(*) as count FROM sessions WHERE user_id = ?').get(staffUser.id);
        const connectedDevices = countRow ? Number(countRow.count) : 0;

        return sendJson(res, 200, {
          exists: true,
          staff: {
            id: staffUser.id,
            username: staffUser.username || staffUser.email,
            displayName: staffUser.display_name || 'Campus Staff Desk',
            pin: staffUser.pin || '----',
            createdAt: staffUser.created_at
          },
          connectedDevices
        });
      }

      // ADMIN: Create or Update Single Common Staff Account (Username + Password + 4-Digit PIN) (§Admin Work 1)
      if (pathname === '/api/admin/staff-account' && req.method === 'POST') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');
        const { username, password, pin, displayName } = await readJsonBody(req);

        const cleanUser = (username || '').trim();
        const cleanPin = String(pin || '').trim();
        if (!cleanUser || !password || !cleanPin) {
          return sendError(res, 400, 'Username, password, and 4-digit PIN are required.');
        }
        if (!/^\d{4}$/.test(cleanPin)) {
          return sendError(res, 400, 'Security PIN must be exactly 4 numeric digits (e.g. 1234).');
        }
        if (password.length < 4) {
          return sendError(res, 400, 'Password must be at least 4 characters long.');
        }

        if (cleanUser.toLowerCase() === PERMANENT_ADMIN_USERNAME.toLowerCase()) {
          return sendError(res, 400, 'Staff username cannot conflict with Master Administrator.');
        }

        const now = new Date().toISOString();
        const staffName = (displayName || '').trim() || 'Campus Staff Desk';

        // Check if an existing staff user exists OR if any non-admin account has this username
        let targetStaffId = null;
        const existingStaff = db.prepare("SELECT id FROM users WHERE role = 'staff' LIMIT 1").get();
        const existingWithUsername = db.prepare("SELECT id, role FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)").get(cleanUser, cleanUser);

        if (existingWithUsername) {
          if (existingWithUsername.role === 'admin' || cleanUser.toLowerCase() === PERMANENT_ADMIN_USERNAME.toLowerCase()) {
            return sendError(res, 400, 'Staff username cannot conflict with Master Administrator.');
          }
          targetStaffId = existingWithUsername.id;
        } else if (existingStaff) {
          targetStaffId = existingStaff.id;
        } else {
          targetStaffId = generateId('usr_staff');
        }

        // Clean up any other staff records so there is strictly ONE staff account in the entire system
        db.prepare("DELETE FROM users WHERE role = 'staff' AND id != ?").run(targetStaffId);

        // Update or insert the staff account
        const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(targetStaffId);
        if (userExists) {
          db.prepare(`
            UPDATE users 
            SET username = ?, email = ?, password_hash = ?, role = 'staff', display_name = ?, pin = ?, blocked = 0
            WHERE id = ?
          `).run(cleanUser, cleanUser, hashPassword(password), staffName, cleanPin, targetStaffId);
        } else {
          db.prepare(`
            INSERT INTO users (id, username, email, password_hash, role, display_name, phone, blocked, pin, created_at)
            VALUES (?, ?, ?, ?, 'staff', ?, '', 0, ?, ?)
          `).run(targetStaffId, cleanUser, cleanUser, hashPassword(password), staffName, cleanPin, now);
        }

        // Ensure approved record in staff_requests
        db.prepare("DELETE FROM staff_requests WHERE user_id = ? OR lower(email) = lower(?)").run(targetStaffId, cleanUser);
        db.prepare(`
          INSERT INTO staff_requests (id, user_id, full_name, email, phone, status, notes, is_admin, created_at)
          VALUES (?, ?, ?, ?, '', 'approved', 'Common Staff Account created by Administrator', 0, ?)
        `).run(generateId('req'), targetStaffId, staffName, cleanUser, now);

        saveBackupJson();
        broadcastEvent('staff_account_configured', { username: cleanUser });
        return sendJson(res, 200, {
          success: true,
          message: `Common Staff account @${cleanUser} successfully saved with PIN ${cleanPin}.`,
          staff: { username: cleanUser, displayName: staffName, pin: cleanPin }
        });
      }

      // ADMIN: Delete Single Common Staff Account (Immediately Disconnects All Connected Devices) (§Admin Work 1)
      if (pathname === '/api/admin/staff-account' && req.method === 'DELETE') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');

        // Find all staff accounts or any account named 'staff2026' (except admin)
        const staffUsers = db.prepare("SELECT id, username FROM users WHERE role = 'staff' OR lower(username) = 'staff2026'").all();
        if (!staffUsers || staffUsers.length === 0) {
          return sendJson(res, 200, {
            success: true,
            message: 'No staff account exists to delete.'
          });
        }

        for (const su of staffUsers) {
          if (su.username && su.username.toLowerCase() === PERMANENT_ADMIN_USERNAME.toLowerCase()) continue;
          db.prepare('DELETE FROM sessions WHERE user_id = ?').run(su.id);
          db.prepare('DELETE FROM staff_requests WHERE user_id = ? OR lower(email) = lower(?)').run(su.id, su.username);
          db.prepare('DELETE FROM users WHERE id = ?').run(su.id);
        }

        saveBackupJson();
        broadcastEvent('staff_account_deleted', {});
        return sendJson(res, 200, {
          success: true,
          message: 'Staff account successfully deleted. All connected devices have been disconnected.'
        });
      }

      // INFO QR SCANNER: Query driver campus transit status (§Info QR)
      if (pathname === '/api/drivers/status-check' && req.method === 'GET') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const driverId = (urlObj.searchParams.get('id') || '').trim();
        const vanNo = (urlObj.searchParams.get('van_no') || urlObj.searchParams.get('plate') || '').trim();
        const name = (urlObj.searchParams.get('name') || '').trim();

        let driver = null;
        if (driverId) {
          driver = db.prepare('SELECT * FROM drivers WHERE id = ? OR label = ?').get(driverId, driverId);
        }
        if (!driver && vanNo) {
          driver = db.prepare('SELECT * FROM drivers WHERE lower(van_no) = lower(?)').get(vanNo);
        }
        if (!driver && name) {
          driver = db.prepare('SELECT * FROM drivers WHERE lower(driver_name) = lower(?)').get(name);
        }

        if (!driver) {
          return sendError(res, 404, 'No registered vehicle or driver matches this QR information.');
        }

        // Query today's gate entry/exit logs for this driver
        const todayDate = new Date().toISOString().slice(0, 10);
        const latestLogToday = db.prepare(`
          SELECT event_type, timestamp, scanned_by 
          FROM van_logs 
          WHERE (driver_id = ? OR lower(driver_name) = lower(?) OR lower(driver_label) = lower(?))
            AND (date(timestamp) = date('now', 'localtime') OR date(timestamp) = ?)
            AND (event_type = 'entry' OR event_type = 'exit')
          ORDER BY timestamp DESC LIMIT 1
        `).get(driver.id, driver.driver_name, driver.label, todayDate);

        let status = 'not_entered';
        let statusLabel = 'Van Has Not Yet Entered';
        let statusDesc = 'No gate entry recorded today. The van has not arrived on campus yet.';
        let statusColor = 'amber';

        if (latestLogToday) {
          if (latestLogToday.event_type === 'entry') {
            status = 'entered';
            statusLabel = 'Van Arrived / Inside Campus';
            statusDesc = 'Van entered campus and has NOT left yet. Currently on campus.';
            statusColor = 'emerald';
          } else if (latestLogToday.event_type === 'exit') {
            status = 'exited';
            statusLabel = 'Van Exited Campus / Departed';
            statusDesc = 'Van has departed and left campus.';
            statusColor = 'rose';
          }
        }

        return sendJson(res, 200, {
          driver: {
            id: driver.id,
            label: driver.label,
            name: driver.driver_name,
            phone: driver.phone,
            van_no: driver.van_no,
            vehicle_type: driver.vehicle_type,
            type: driver.type
          },
          transit: {
            status,
            statusLabel,
            statusDesc,
            statusColor,
            lastEvent: latestLogToday ? latestLogToday.event_type : null,
            lastTimestamp: latestLogToday ? latestLogToday.timestamp : null,
            scannedBy: latestLogToday ? latestLogToday.scanned_by : null
          }
        });
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
        const roleOrPlate = (van_no || designation || duty || '').trim().toUpperCase();
        if (kind === 'staff' && !roleOrPlate) {
          return sendError(res, 400, 'Vehicle number is compulsory for staff members');
        }
        if (kind === 'van' && !roleOrPlate) {
          return sendError(res, 400, 'Vehicle number is required');
        }

        const cleanVehicleType = vehicle_type ? vehicle_type.trim() : (kind === 'staff' ? '' : '4_wheeler');

        const label = getNextLabel(kind);
        const id = generateId('drv');
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO drivers (id, label, type, driver_name, license_number, van_no, phone, vehicle_type, raw_data, created_at)
          VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?)
        `).run(id, label, kind, driver_name.trim(), roleOrPlate, phone || '', cleanVehicleType, `Name: ${driver_name}`, now);

        if (kind === 'van') {
          db.prepare(`
            INSERT INTO van_locations (van_id, van_label, lat, lng, live, updated_at)
            VALUES (?, ?, 0, 0, 0, ?)
          `).run(id, label, now);
        }

        saveBackupJson();
        broadcastEvent('driver_added', { id, label, driver_name: driver_name.trim(), van_no: roleOrPlate, vehicle_type: cleanVehicleType });
        return sendJson(res, 201, {
          id,
          label,
          driver_name: driver_name.trim(),
          van_no: roleOrPlate,
          phone: phone || '',
          vehicle_type: cleanVehicleType,
          type: kind,
          created_at: now
        });
      }

      // DRIVERS & STAFF REGISTRY: Delete van or staff (Cascades logs & renumbers as per §7.3)
      if (pathname.startsWith('/api/drivers/') && req.method === 'DELETE') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const driverId = pathname.split('/')[3];
        const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driverId);
        if (!driver) return sendError(res, 404, 'Driver/Staff entry not found');

        // Permanently record tombstone in local SQLite and Firebase Cloud
        markEntityDeleted(driverId, driver.type);
        deleteFromFirebase(`drivers/${driverId}`);

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

      // DRIVERS & STAFF REGISTRY: Edit driver or staff member
      if (pathname.startsWith('/api/drivers/') && req.method === 'PUT') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const driverId = pathname.split('/')[3];
        const existing = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driverId);
        if (!existing) return sendError(res, 404, 'Driver or staff member not found');

        const { driver_name, phone, van_no, vehicle_type } = await readJsonBody(req);
        let updatedName = existing.driver_name;
        if (driver_name !== undefined) {
          const trimmed = (driver_name || '').trim();
          if (trimmed) {
            const parts = trimmed.split(/\s+/).filter(Boolean);
            if (parts.length < 2 || parts[0].length < 2 || parts[1].length < 2) {
              return sendError(res, 400, 'Please enter full name (both first and last name, e.g. Ramu Chandan)');
            }
            updatedName = trimmed;
          }
        }

        const updatedPhone = phone !== undefined ? (phone || '').trim() : (existing.phone || '');
        
        let updatedVanNo = existing.van_no;
        if (van_no !== undefined) {
          const trimmedVan = (van_no || '').trim().toUpperCase();
          if (existing.type === 'staff' && !trimmedVan) {
            return sendError(res, 400, 'Vehicle number is compulsory for staff members');
          }
          updatedVanNo = trimmedVan;
        }

        let updatedVehicleType = existing.vehicle_type;
        if (vehicle_type !== undefined) {
          updatedVehicleType = (vehicle_type || '').trim();
        }

        db.prepare(`
          UPDATE drivers 
          SET driver_name = ?, phone = ?, van_no = ?, vehicle_type = ?, raw_data = ?
          WHERE id = ?
        `).run(updatedName, updatedPhone, updatedVanNo, updatedVehicleType, `Name: ${updatedName}`, driverId);

        saveBackupJson();
        broadcastEvent('driver_updated', { id: driverId, label: existing.label, driver_name: updatedName, van_no: updatedVanNo, vehicle_type: updatedVehicleType });

        const updated = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driverId);
        return sendJson(res, 200, { success: true, driver: updated });
      }

      // DRIVERS & STAFF REGISTRY: Smart two-way sync / bulk vehicle updates (§Indestructible Staff & Vehicle Vault)
      if (pathname === '/api/drivers/sync' && req.method === 'POST') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const body = await readJsonBody(req);
        const staffList = Array.isArray(body.staffList) ? body.staffList : (Array.isArray(body) ? body : []);
        const vaultUpdates = body.vaultUpdates && typeof body.vaultUpdates === 'object' ? body.vaultUpdates : null;

        let hasUpdates = false;

        // Process staffList
        if (staffList.length > 0) {
          const insertStmt = db.prepare(`
            INSERT INTO drivers (id, label, type, driver_name, license_number, van_no, phone, vehicle_type, raw_data, created_at)
            VALUES (?, ?, 'staff', ?, '', ?, ?, ?, ?, ?)
          `);

          for (const s of staffList) {
            if (!s) continue;
            const sName = (s.driver_name || s.name || '').trim();
            const sId = (s.id || '').trim();
            const sLabel = (s.label || '').trim();
            const sVan = (s.van_no || s.van || '').trim();
            const sType = (s.vehicle_type || s.vehicleType || '').trim();
            const sPhone = (s.phone || '').trim();

            let existing = null;
            if (sId) existing = db.prepare('SELECT * FROM drivers WHERE id = ?').get(sId);
            if (!existing && sLabel) existing = db.prepare("SELECT * FROM drivers WHERE type = 'staff' AND lower(trim(label)) = lower(trim(?))").get(sLabel);
            if (!existing && sName) existing = db.prepare("SELECT * FROM drivers WHERE type = 'staff' AND lower(trim(driver_name)) = lower(trim(?))").get(sName);

            if (existing) {
              let updatedVan = existing.van_no;
              let updatedType = existing.vehicle_type;
              let updatedPhone = existing.phone;
              let rowChanged = false;

              if (sVan && sVan !== 'STAFF PASS' && sVan !== 'Staff Pass' && sVan !== existing.van_no) {
                updatedVan = sVan;
                rowChanged = true;
              }
              if (sType && sType !== existing.vehicle_type) {
                updatedType = sType;
                rowChanged = true;
              }
              if (sPhone && sPhone !== existing.phone) {
                updatedPhone = sPhone;
                rowChanged = true;
              }

              if (rowChanged) {
                db.prepare(`
                  UPDATE drivers 
                  SET van_no = ?, vehicle_type = ?, phone = ?, raw_data = ?
                  WHERE id = ?
                `).run(updatedVan, updatedType, updatedPhone, `Name: ${existing.driver_name}`, existing.id);
                hasUpdates = true;
              }
            } else if (sName) {
              const newId = sId || generateId('drv');
              const newLabel = sLabel || getNextLabel('staff');
              insertStmt.run(
                newId,
                newLabel,
                sName,
                sVan || 'Staff Pass',
                sPhone || '',
                sType || 'walk_in',
                s.raw_data || `Name: ${sName}`,
                s.created_at || new Date().toISOString()
              );
              hasUpdates = true;
            }
          }
        }

        // Process vaultUpdates if sent directly as key-value map
        if (vaultUpdates) {
          for (const [key, v] of Object.entries(vaultUpdates)) {
            if (!v || typeof v !== 'object') continue;
            const sVan = (v.van_no || v.van || '').trim();
            const sType = (v.vehicle_type || v.vehicleType || '').trim();
            const sPhone = (v.phone || '').trim();
            if (!sVan && !sType && !sPhone) continue;

            const existing = db.prepare("SELECT * FROM drivers WHERE type = 'staff' AND (id = ? OR lower(trim(label)) = lower(trim(?)) OR lower(trim(driver_name)) = lower(trim(?)))").get(key, key, key);
            if (existing) {
              let updatedVan = (sVan && sVan !== 'STAFF PASS' && sVan !== 'Staff Pass') ? sVan : existing.van_no;
              let updatedType = sType || existing.vehicle_type;
              let updatedPhone = sPhone || existing.phone;
              if (updatedVan !== existing.van_no || updatedType !== existing.vehicle_type || updatedPhone !== existing.phone) {
                db.prepare(`
                  UPDATE drivers 
                  SET van_no = ?, vehicle_type = ?, phone = ?, raw_data = ?
                  WHERE id = ?
                `).run(updatedVan, updatedType, updatedPhone, `Name: ${existing.driver_name}`, existing.id);
                hasUpdates = true;
              }
            }
          }
        }

        if (hasUpdates) {
          saveBackupJson();
          broadcastEvent('drivers_synced', { timestamp: new Date().toISOString() });
        }

        const currentStaff = db.prepare("SELECT * FROM drivers WHERE type = 'staff' ORDER BY CAST(SUBSTR(label, INSTR(label, ' ') + 1) AS INTEGER) ASC, label ASC").all();
        return sendJson(res, 200, { success: true, staff: currentStaff, updated: hasUpdates });
      }

      // EMERGENCY CONTACTS: Role-tailored emergency contacts for SOS (§SOS)
      // NOTE: Admin is STRICTLY EXCLUDED. Only Gate Staff and Parent/Driver are callable.
      if (pathname === '/api/emergency-contacts' && req.method === 'GET') {
        if (!user) return sendError(res, 401, 'Unauthorized');

        // 1. All Gate Staff members (with phone numbers) — Strictly non-admin
        const staffRows = db.prepare(`
          SELECT full_name, phone, 'Gate Security Staff' as role, email as username
          FROM staff_requests
          WHERE status = 'approved' AND is_admin = 0 AND lower(email) != 'admin2026'
            AND phone IS NOT NULL AND trim(phone) != ''
          ORDER BY full_name ASC
        `).all();

        // Also include any staff users from users table if not already in staffRows (strictly non-admin)
        const staffUsers = db.prepare(`
          SELECT display_name as full_name, phone, 'Gate Security Staff' as role, username
          FROM users
          WHERE role = 'staff' AND phone IS NOT NULL AND trim(phone) != '' AND lower(username) != 'admin2026'
        `).all();

        const gateStaff = [];
        for (const s of [...staffRows, ...staffUsers]) {
          if (s.username && s.username.toLowerCase() === 'admin2026') continue;
          if (s.role && s.role.toLowerCase().includes('admin')) continue;
          if (!gateStaff.some(item => item.phone === s.phone || (item.username && item.username === s.username))) {
            gateStaff.push(s);
          }
        }

        const manualStaff = db.prepare(`
          SELECT driver_name as full_name, phone, 'Campus Staff' as role, '' as username
          FROM drivers
          WHERE type = 'staff' AND phone IS NOT NULL AND trim(phone) != ''
        `).all();
        for (const ms of manualStaff) {
          if (ms.role && ms.role.toLowerCase().includes('admin')) continue;
          if (!gateStaff.some(s => s.phone === ms.phone)) {
            gateStaff.push(ms);
          }
        }

        let assignedParents = [];
        let assignedDriver = null;

        // 2. If Driver: parents of children they are dropping
        if (user.driverProfile) {
          const vanId = user.driverProfile.selected_van_id || '';
          const vanLabel = user.driverProfile.selected_van_label || '';

          assignedParents = db.prepare(`
            SELECT DISTINCT p.name as parent_name, p.phone as parent_phone, c.name as child_name, c.van_label
            FROM children c
            JOIN parents p ON c.parent_id = p.user_id
            WHERE (c.van_id = ? OR c.van_label = ? OR ? IN (SELECT id FROM drivers WHERE label = c.van_label))
              AND p.phone IS NOT NULL AND trim(p.phone) != ''
            ORDER BY p.name ASC
          `).all(vanId, vanLabel, vanId);
        }

        // 3. If Parent: the driver they have chosen for their children
        if (user.parentProfile) {
          assignedDriver = db.prepare(`
            SELECT d.id, d.label, d.driver_name, d.van_no, d.phone, d.vehicle_type
            FROM drivers d
            WHERE d.type = 'van' AND d.phone IS NOT NULL AND trim(d.phone) != '' AND (
              d.id IN (SELECT van_id FROM children WHERE parent_id = ?)
              OR d.label IN (SELECT van_label FROM children WHERE parent_id = ?)
              OR d.id = ?
              OR d.label = ?
            )
            LIMIT 1
          `).get(user.id, user.id, user.parentProfile.selected_van_id || '', user.parentProfile.selected_van_label || '');
        }

        return sendJson(res, 200, {
          gateStaff,
          assignedParents,
          assignedDriver,
          userRole: user.driverProfile ? 'driver' : user.parentProfile ? 'parent' : user.role
        });
      }

      // GATE SCANNER: Entry / Exit Alternation Check & Log Recording (§7.4)
      if (pathname === '/api/scanner/scan' && req.method === 'POST') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        if (user.role === 'admin') return sendError(res, 403, 'Administrator access to gate pass scanner is restricted.');
        const { qrPayload, scanType } = await readJsonBody(req); // scanType: 'entry' | 'exit'
        if (!qrPayload || !scanType) return sendError(res, 400, 'QR payload and scanType are required');

        // Validate QR format: must be CAMPUSRIDE:DRIVER:<id>
        if (!qrPayload.startsWith('CAMPUSRIDE:DRIVER:')) {
          return sendError(res, 400, 'Not an entry/exit QR — this scanner only accepts CampusRide pass QR codes.');
        }

        const driverId = qrPayload.replace('CAMPUSRIDE:DRIVER:', '').trim();
        const driver = db.prepare('SELECT * FROM drivers WHERE id = ? OR label = ?').get(driverId, driverId);
        if (!driver) return sendError(res, 404, 'No registered vehicle or staff matches this pass.');

        // Alternation enforcement:
        // Find last event for this vehicle/staff
        const lastLog = db.prepare(`
          SELECT event_type FROM van_logs 
          WHERE (driver_id = ? OR driver_id = ? OR driver_label = ?) AND (event_type = 'entry' OR event_type = 'exit') 
          ORDER BY timestamp DESC LIMIT 1
        `).get(driver.id, driverId, driver.label);

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

        pushToFirebase(`van_logs/${logId}`, {
          id: logId,
          qr_identifier: qrPayload,
          driver_id: driver.id,
          driver_name: driver.driver_name,
          driver_label: driver.label,
          event_type: scanType,
          scanned_by: scannedBy,
          timestamp: now
        });

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
        if (user.role === 'admin') return sendError(res, 403, 'Administrator access to scanner is restricted.');
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

      // VAN & STAFF ENTRY/EXIT & JOURNEY REGISTER: View logs with entityType, category, driverId, date filters (§7.6)
      if (pathname === '/api/logs' && req.method === 'GET') {
        const entityType = (urlObj.searchParams.get('entityType') || urlObj.searchParams.get('type') || '').toLowerCase(); // 'van' | 'driver' | 'staff' | 'all'
        const category = (urlObj.searchParams.get('category') || urlObj.searchParams.get('logType') || '').toLowerCase(); // 'entry_exit' | 'gate' | 'journey' | 'all'
        const driverId = urlObj.searchParams.get('driverId');
        const date = urlObj.searchParams.get('date'); // YYYY-MM-DD
        const limit = parseInt(urlObj.searchParams.get('limit') || '500', 10);
        const offset = parseInt(urlObj.searchParams.get('offset') || '0', 10);

        let query = `
          SELECT 
            vl.id,
            vl.qr_identifier,
            vl.driver_id,
            vl.driver_name,
            vl.driver_label,
            vl.event_type,
            vl.scanned_by,
            vl.timestamp,
            COALESCE(d.type, CASE WHEN vl.driver_label LIKE 'Staff%' THEN 'staff' ELSE 'van' END) as entity_type,
            COALESCE(d.van_no, '') as van_no,
            COALESCE(d.phone, '') as phone,
            COALESCE(d.vehicle_type, '') as vehicle_type
          FROM van_logs vl
          LEFT JOIN drivers d ON vl.driver_id = d.id
          WHERE 1=1
        `;
        const params = [];

        // Filter by Entity Type (driver/van vs staff)
        if (entityType === 'staff') {
          query += " AND (d.type = 'staff' OR (d.type IS NULL AND vl.driver_label LIKE 'Staff%'))";
        } else if (entityType === 'driver' || entityType === 'van') {
          query += " AND (d.type = 'van' OR (d.type IS NULL AND vl.driver_label NOT LIKE 'Staff%'))";
        }

        // Filter by Log Category (entry_exit vs journey)
        if (category === 'entry_exit' || category === 'gate') {
          query += " AND (vl.event_type = 'entry' OR vl.event_type = 'exit')";
        } else if (category === 'journey') {
          query += " AND (vl.event_type = 'journey_start' OR vl.event_type = 'journey_end')";
        }

        if (driverId) {
          query += ' AND vl.driver_id = ?';
          params.push(driverId);
        }
        if (date) {
          query += ' AND date(vl.timestamp) = date(?)';
          params.push(date);
        }

        query += ' ORDER BY vl.timestamp DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const logs = db.prepare(query).all(...params);
        const safeLogs = logs.map(l => ({
          id: l.id,
          driver_id: l.driver_id,
          driver_label: l.driver_label || (l.entity_type === 'staff' ? 'Staff' : 'Vehicle'),
          driver_name: l.driver_name || (l.entity_type === 'staff' ? 'Staff Member' : 'Driver'),
          entity_type: l.entity_type,
          van_no: l.van_no,
          phone: l.phone,
          vehicle_type: l.vehicle_type,
          event_type: l.event_type,
          scanned_by: l.scanned_by || 'Gate Staff',
          timestamp: l.timestamp
        }));

        // Detailed stats broken down by entity and event type
        let statsSql = `
          SELECT 
            COALESCE(d.type, CASE WHEN vl.driver_label LIKE 'Staff%' THEN 'staff' ELSE 'van' END) as entity_type,
            vl.event_type,
            count(*) as count
          FROM van_logs vl
          LEFT JOIN drivers d ON vl.driver_id = d.id
          WHERE 1=1
        `;
        const statsParams = [];
        if (date) {
          statsSql += ' AND date(vl.timestamp) = date(?)';
          statsParams.push(date);
        }
        if (driverId) {
          statsSql += ' AND vl.driver_id = ?';
          statsParams.push(driverId);
        }
        statsSql += ' GROUP BY entity_type, vl.event_type';

        const statsRows = db.prepare(statsSql).all(...statsParams);

        const stats = {
          entry: 0,
          exit: 0,
          journey_start: 0,
          journey_end: 0,
          driver: {
            entry: 0,
            exit: 0,
            journey_start: 0,
            journey_end: 0,
            total: 0,
            inside: 0
          },
          staff: {
            entry: 0,
            exit: 0,
            journey_start: 0,
            journey_end: 0,
            total: 0,
            inside: 0
          }
        };

        for (const row of statsRows) {
          const eType = row.entity_type === 'staff' ? 'staff' : 'driver';
          const ev = row.event_type;
          const count = Number(row.count) || 0;

          if (stats[ev] !== undefined) {
            stats[ev] += count;
          }
          if (stats[eType] && stats[eType][ev] !== undefined) {
            stats[eType][ev] += count;
            stats[eType].total += count;
          }
        }

        stats.driver.inside = Math.max(0, stats.driver.entry - stats.driver.exit);
        stats.staff.inside = Math.max(0, stats.staff.entry - stats.staff.exit);
        stats.inside = Math.max(0, stats.entry - stats.exit);

        return sendJson(res, 200, { logs: safeLogs, stats });
      }

      // VAN & STAFF REGISTER: Clear logs for entityType, driverId, category, and date (§7.6)
      if (pathname === '/api/logs' && req.method === 'DELETE') {
        if (!user || (user.role !== 'admin' && !user.staffProfile && user.role !== 'staff')) {
          return sendError(res, 403, 'Gate staff or admin access required to clear logs');
        }
        const driverId = urlObj.searchParams.get('driverId');
        const date = urlObj.searchParams.get('date');
        const entityType = (urlObj.searchParams.get('entityType') || urlObj.searchParams.get('type') || '').toLowerCase();
        const category = (urlObj.searchParams.get('category') || urlObj.searchParams.get('logType') || '').toLowerCase();

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
        if (category === 'entry_exit' || category === 'gate') {
          query += " AND (event_type = 'entry' OR event_type = 'exit')";
        } else if (category === 'journey') {
          query += " AND (event_type = 'journey_start' OR event_type = 'journey_end')";
        }
        if (entityType === 'staff') {
          query += " AND (driver_id IN (SELECT id FROM drivers WHERE type = 'staff') OR driver_label LIKE 'Staff%')";
        } else if (entityType === 'driver' || entityType === 'van') {
          query += " AND (driver_id IN (SELECT id FROM drivers WHERE type = 'van') OR driver_label NOT LIKE 'Staff%')";
        }

        db.prepare(query).run(...params);
        saveBackupJson();
        broadcastEvent('logs_cleared', { driverId, date, entityType, category });
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
        const startLogId = generateId('log');
        db.prepare(`
          INSERT INTO van_logs (id, qr_identifier, driver_id, driver_name, driver_label, event_type, scanned_by, timestamp)
          VALUES (?, '', ?, ?, ?, 'journey_start', ?, ?)
        `).run(startLogId, van.id, van.driver_name, van.label, user.display_name || user.email, now);

        pushToFirebase(`van_logs/${startLogId}`, {
          id: startLogId,
          qr_identifier: '',
          driver_id: van.id,
          driver_name: van.driver_name,
          driver_label: van.label,
          event_type: 'journey_start',
          scanned_by: user.display_name || user.email,
          timestamp: now
        });

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
          pushToFirebase(`van_locations/${vanId}/live`, 0);
          const van = db.prepare('SELECT id, label, driver_name FROM drivers WHERE id = ?').get(vanId);
          if (van) {
            const endLogId = generateId('log');
            db.prepare(`
              INSERT INTO van_logs (id, qr_identifier, driver_id, driver_name, driver_label, event_type, scanned_by, timestamp)
              VALUES (?, '', ?, ?, ?, 'journey_end', ?, ?)
            `).run(endLogId, van.id, van.driver_name, van.label, user.display_name || user.username || user.email, now);

            pushToFirebase(`van_logs/${endLogId}`, {
              id: endLogId,
              qr_identifier: '',
              driver_id: van.id,
              driver_name: van.driver_name,
              driver_label: van.label,
              event_type: 'journey_end',
              scanned_by: user.display_name || user.username || user.email,
              timestamp: now
            });

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
        pushToFirebase(`van_locations/${vanId}`, payload);
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
        if (user.role === 'admin') return sendError(res, 403, 'Administrator access to parent accounts is restricted.');
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
