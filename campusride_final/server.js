// CampusRide — High-Performance Node.js Server
// Zero-dependency SQLite backend with Real-Time SSE, Authentication, QR Validation, and Safety Auditing
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const tls = require('node:tls');
const { DatabaseSync } = require('node:sqlite');

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  // Optional dependency - direct TLS fallback is used
}

const PORT = process.env.PORT || 8000;
const DB_PATH = path.join(__dirname, 'campusride.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Initialize SQLite Database
const db = new DatabaseSync(DB_PATH);

// Helper: Run schema migrations
// Permanent Master Administrator (§2)
const PERMANENT_ADMIN_EMAIL = 'adphasmo@gmail.com';

function ensurePermanentAdmin() {
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(PERMANENT_ADMIN_EMAIL);
  if (!existing) {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, display_name, phone, blocked, created_at)
      VALUES (?, ?, ?, 'admin', 'Super Administrator (Parth)', '9876500000', 0, ?)
    `).run('usr_perm_admin', PERMANENT_ADMIN_EMAIL, hashPassword('Parth@123'), now);
    console.log(`[CampusRide] Permanent Master Admin created: ${PERMANENT_ADMIN_EMAIL}`);
  } else {
    // Guarantee permanent admin privileges and update credentials
    db.prepare(`
      UPDATE users SET role = 'admin', blocked = 0, password_hash = ? WHERE lower(email) = lower(?)
    `).run(hashPassword('Parth@123'), PERMANENT_ADMIN_EMAIL);
  }
}

function initDatabase() {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
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

    CREATE TABLE IF NOT EXISTS email_otps (
      email TEXT PRIMARY KEY,
      otp TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  ensurePermanentAdmin();
}

// Email OTP Store & Verify helpers
function storeOtp(email, otp) {
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO email_otps (email, otp, expires_at, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET otp = excluded.otp, expires_at = excluded.expires_at, created_at = excluded.created_at
  `).run(email.toLowerCase().trim(), otp, expiresAt, now);
}

function verifyOtp(email, otp) {
  if (!email || !otp) return false;
  const row = db.prepare('SELECT otp, expires_at FROM email_otps WHERE email = ?').get(email.toLowerCase().trim());
  if (!row) return false;
  if (Date.now() > row.expires_at) return false;
  return row.otp === otp.trim();
}

// Send OTP to real Gmail via Nodemailer or Direct TLS socket
async function sendOtpEmail(toEmail, otp) {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || 'adphasmo@gmail.com';
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  const subject = `CampusRide Email Verification Code: ${otp}`;
  const textBody = `Hello,\n\nYour 6-digit CampusRide verification code is: ${otp}\n\nThis code is valid for 10 minutes.\n\nBest regards,\nCampusRide Team`;
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #2563eb; margin: 0; font-size: 24px;">🚌 CampusRide</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Secure Campus Transportation Portal</p>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 20px;">
        <p style="font-size: 14px; color: #475569; margin: 0 0 12px 0;">Your 6-digit verification code is:</p>
        <div style="font-size: 36px; font-weight: 800; font-family: monospace; letter-spacing: 8px; color: #1d4ed8; padding: 8px 16px; background: #eff6ff; border-radius: 8px; display: inline-block;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin: 14px 0 0 0;">⏱️ Valid for 10 minutes. Do not share this code.</p>
      </div>
      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 12px 0;">
        Please enter this code on the registration screen to verify your email address.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
        © CampusRide Safe Transportation System
      </p>
    </div>
  `;

  if (!pass) {
    console.log(`[CampusRide OTP Email] Verification OTP for ${toEmail} is: ${otp}`);
    console.log(`[CampusRide OTP Email] To enable live email dispatch to real Gmail inboxes, set GMAIL_APP_PASSWORD in Render Environment variables.`);
    return { sent: false, reason: 'GMAIL_APP_PASSWORD_NOT_SET' };
  }

  // If nodemailer is installed, use it
  if (nodemailer) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
      await transporter.sendMail({
        from: `"CampusRide Verification" <${user}>`,
        to: toEmail,
        subject,
        text: textBody,
        html: htmlBody
      });
      console.log(`[CampusRide OTP Email] Delivered verification email to ${toEmail} via Nodemailer`);
      return { sent: true };
    } catch (nmErr) {
      console.warn(`[CampusRide OTP Email] Nodemailer error (${nmErr.message}), falling back to direct TLS socket...`);
    }
  }

  // Direct TLS socket to smtp.gmail.com:465
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (result) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    const socket = tls.connect({
      host: 'smtp.gmail.com',
      port: 465,
      rejectUnauthorized: true,
      timeout: 12000
    }, () => {});

    let step = 0;
    let buffer = '';
    socket.setEncoding('utf8');

    socket.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\r\n').filter(Boolean);
      const lastLine = lines[lines.length - 1] || '';

      if (!/^\d{3} /.test(lastLine) && !/^\d{3}$/.test(lastLine)) {
        return;
      }
      buffer = '';

      try {
        if (step === 0 && lastLine.startsWith('220')) {
          step = 1;
          socket.write('EHLO campusride.app\r\n');
        } else if (step === 1 && lastLine.startsWith('250')) {
          step = 2;
          socket.write('AUTH LOGIN\r\n');
        } else if (step === 2 && lastLine.startsWith('334')) {
          step = 3;
          socket.write(Buffer.from(user).toString('base64') + '\r\n');
        } else if (step === 3 && lastLine.startsWith('334')) {
          step = 4;
          socket.write(Buffer.from(pass).toString('base64') + '\r\n');
        } else if (step === 4 && lastLine.startsWith('235')) {
          step = 5;
          socket.write(`MAIL FROM:<${user}>\r\n`);
        } else if (step === 5 && lastLine.startsWith('250')) {
          step = 6;
          socket.write(`RCPT TO:<${toEmail}>\r\n`);
        } else if (step === 6 && lastLine.startsWith('250')) {
          step = 7;
          socket.write('DATA\r\n');
        } else if (step === 7 && lastLine.startsWith('354')) {
          step = 8;
          const boundary = '----=_Part_' + Date.now();
          const rawMessage = [
            `From: "CampusRide Verification" <${user}>`,
            `To: <${toEmail}>`,
            `Subject: ${subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            ``,
            `--${boundary}`,
            `Content-Type: text/plain; charset=UTF-8`,
            `Content-Transfer-Encoding: 7bit`,
            ``,
            textBody,
            ``,
            `--${boundary}`,
            `Content-Type: text/html; charset=UTF-8`,
            `Content-Transfer-Encoding: 7bit`,
            ``,
            htmlBody,
            ``,
            `--${boundary}--`,
            `.`
          ].join('\r\n') + '\r\n';
          socket.write(rawMessage);
        } else if (step === 8 && lastLine.startsWith('250')) {
          step = 9;
          socket.write('QUIT\r\n');
          console.log(`[CampusRide OTP Email] Delivered verification code to ${toEmail} via direct Gmail TLS`);
          finish({ sent: true });
          socket.end();
        } else if (/^[45]\d\d/.test(lastLine)) {
          console.error(`[CampusRide OTP Email] SMTP rejected with: ${lastLine}`);
          finish({ sent: false, error: lastLine });
          socket.destroy();
        }
      } catch (err) {
        console.error(`[CampusRide OTP Email] Error in SMTP stream:`, err.message);
        finish({ sent: false, error: err.message });
        socket.destroy();
      }
    });

    socket.on('timeout', () => {
      finish({ sent: false, error: 'timeout' });
      socket.destroy();
    });

    socket.on('error', (err) => {
      console.error('[CampusRide OTP Email] Socket error:', err.message);
      finish({ sent: false, error: err.message });
    });
  });
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

// In-memory token storage (token -> userId)
const activeSessions = new Map();

function createToken(userId) {
  const token = 'cr_' + crypto.randomBytes(24).toString('hex');
  activeSessions.set(token, { userId, created: Date.now() });
  return token;
}

function getUserIdFromReq(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const session = activeSessions.get(token);
    if (session) return session.userId;
  }
  // Also check query param ?token=
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const qToken = urlObj.searchParams.get('token');
  if (qToken) {
    const session = activeSessions.get(qToken);
    if (session) return session.userId;
  }
  return null;
}

function getUserProfile(userId) {
  if (!userId) return null;
  const user = db.prepare('SELECT id, email, role, display_name, phone, blocked FROM users WHERE id = ?').get(userId);
  if (!user || user.blocked) return null;

  // Check staff status
  let staffStatus = 'none';
  if (user.role === 'admin') {
    staffStatus = 'approved';
  } else {
    const req = db.prepare('SELECT status FROM staff_requests WHERE user_id = ? OR email = ?').get(user.id, user.email);
    if (req) staffStatus = req.status;
  }

  // Driver profile
  const driverProfile = db.prepare('SELECT * FROM driver_profiles WHERE user_id = ?').get(user.id);
  // Parent profile
  const parentProfile = db.prepare('SELECT * FROM parents WHERE user_id = ?').get(user.id);

  return {
    ...user,
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

      // AUTH: Send Email OTP
      if (pathname === '/api/auth/send-otp' && req.method === 'POST') {
        const { email } = await readJsonBody(req);
        if (!email) return sendError(res, 400, 'Valid Gmail address is required');
        const cleanEmail = email.trim().toLowerCase();

        // Strict Gmail validation (blocks typos like @gm.com, @gmai.com)
        const GMAIL_REGEX = /^(?!.*\.\.)[a-z0-9][a-z0-9._%+-]{2,34}@(gmail|googlemail)\.com$/i;
        if (!GMAIL_REGEX.test(cleanEmail)) {
          return sendError(res, 400, 'Invalid Gmail address. Please enter a valid address ending in @gmail.com (e.g. yourname@gmail.com). Typos like @gm.com are not accepted.');
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        storeOtp(cleanEmail, otp);
        console.log(`[CampusRide OTP] Generated 6-digit OTP for ${cleanEmail}: ${otp}`);

        // Dispatch real email via Gmail SMTP (Nodemailer / Direct TLS)
        let mailResult = { sent: false };
        try {
          mailResult = await sendOtpEmail(cleanEmail, otp);
        } catch (mailErr) {
          console.error('[CampusRide OTP Email Error]', mailErr.message);
          mailResult = { sent: false, error: mailErr.message };
        }

        if (mailResult && mailResult.sent) {
          // Live email successfully delivered to Gmail inbox!
          return sendJson(res, 200, {
            success: true,
            emailDelivered: true,
            message: `A 6-digit verification code has been delivered to ${cleanEmail}. Please check your Gmail inbox (and Spam folder).`
          });
        } else {
          // SMTP credentials (GMAIL_APP_PASSWORD) not configured on Render yet, or failed
          console.log(`[CampusRide OTP Email] Live delivery not active (GMAIL_APP_PASSWORD not set). Providing code for test mode: ${otp}`);
          return sendJson(res, 200, {
            success: true,
            emailDelivered: false,
            otp: otp,
            message: `Live email sending requires GMAIL_APP_PASSWORD in Render Environment variables. For testing, your 6-digit code is: ${otp}`
          });
        }
      }

      // AUTH: Verify Email OTP
      if (pathname === '/api/auth/verify-otp' && req.method === 'POST') {
        const { email, otp } = await readJsonBody(req);
        if (!email || !otp) return sendError(res, 400, 'Email and 6-digit OTP are required');
        const cleanEmail = email.trim().toLowerCase();
        const valid = verifyOtp(cleanEmail, otp);
        if (!valid) return sendError(res, 400, 'Invalid or expired verification code');
        return sendJson(res, 200, { success: true, verified: true });
      }

      // AUTH: Login with Strict Role Gate Enforcement
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const { email, password, required_role } = await readJsonBody(req);
        if (!email || !password) return sendError(res, 400, 'Email and password are required');

        const foundUser = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email.trim());
        if (!foundUser) return sendError(res, 401, 'No account with this email exists');
        if (foundUser.blocked) return sendError(res, 403, 'Account removed. Access is blocked.');

        const hash = hashPassword(password);
        if (foundUser.password_hash !== hash) return sendError(res, 401, 'Invalid email or password');

        const profile = getUserProfile(foundUser.id);

        // Strict Role Gate: Even with correct email & password, reject if not matching the app portal
        if (required_role === 'parent') {
          if (!profile.parentProfile) {
            return sendError(res, 403, 'Access Denied: This is the Parent App. Your account is NOT registered as a Parent. Please open your dedicated portal.');
          }
        } else if (required_role === 'driver') {
          if (!profile.driverProfile) {
            return sendError(res, 403, 'Access Denied: This is the Driver App. Your account is NOT registered as a Driver. Please open your dedicated portal.');
          }
        } else if (required_role === 'staff') {
          if (profile.role !== 'admin' && (profile.driverProfile || profile.parentProfile)) {
            return sendError(res, 403, 'Access Denied: This is the Gate Staff App. Your account is NOT registered as Staff. Please open your dedicated portal.');
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
        const email = urlObj.searchParams.get('email');
        if (!email) return sendJson(res, 200, { blocked: false });
        const found = db.prepare('SELECT blocked FROM users WHERE lower(email) = lower(?)').get(email.trim());
        return sendJson(res, 200, { blocked: Boolean(found && found.blocked) });
      }

      // AUTH: Register Staff (Awaiting Approval Flow)
      if (pathname === '/api/auth/register-staff' && req.method === 'POST') {
        const { fullName, email, phone, password } = await readJsonBody(req);
        if (!fullName || !email || !phone || !password) return sendError(res, 400, 'All fields are required');

        // Check if email already registered
        const existing = db.prepare('SELECT id, blocked FROM users WHERE lower(email) = lower(?)').get(email.trim());
        if (existing) return sendError(res, 400, 'An account with this email already exists');

        const newUserId = generateId('usr_staff');
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO users (id, email, password_hash, role, display_name, phone, blocked, created_at)
          VALUES (?, ?, ?, 'user', ?, ?, 0, ?)
        `).run(newUserId, email.trim(), hashPassword(password), fullName.trim(), phone.trim(), now);

        const reqId = generateId('req');
        db.prepare(`
          INSERT INTO staff_requests (id, user_id, full_name, email, phone, status, notes, is_admin, created_at)
          VALUES (?, ?, ?, ?, ?, 'pending', 'Submitted self-service staff registration', 0, ?)
        `).run(reqId, newUserId, fullName.trim(), email.trim(), phone.trim(), now);

        const token = createToken(newUserId);
        const profile = getUserProfile(newUserId);
        broadcastEvent('staff_request_created', { id: reqId, fullName, email });
        return sendJson(res, 201, { token, user: profile, message: 'Staff request submitted. Awaiting admin approval.' });
      }

      // AUTH: Register Driver (Auto creates Van)
      if (pathname === '/api/auth/register-driver' && req.method === 'POST') {
        const { fullName, email, phone, password, vehicleNo, vehicleType } = await readJsonBody(req);
        if (!fullName || !email || !phone || !password || !vehicleNo) return sendError(res, 400, 'All fields are required');

        const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(email.trim());
        if (existing) return sendError(res, 400, 'An account with this email already exists');

        const newUserId = generateId('usr_drv');
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO users (id, email, password_hash, role, display_name, phone, blocked, created_at)
          VALUES (?, ?, ?, 'user', ?, ?, 0, ?)
        `).run(newUserId, email.trim(), hashPassword(password), fullName.trim(), phone.trim(), now);

        // Auto assign sequential label e.g. "Van 3"
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

        // Create initial location (0, 0 awaiting first real driver GPS broadcast)
        db.prepare(`
          INSERT INTO van_locations (van_id, van_label, lat, lng, live, updated_at)
          VALUES (?, ?, 0, 0, 0, ?)
        `).run(vanId, nextLabel, now);

        const token = createToken(newUserId);
        const profile = getUserProfile(newUserId);
        broadcastEvent('driver_registered', { vanId, nextLabel });
        return sendJson(res, 201, { token, user: profile });
      }

      // AUTH: Register Parent
      if (pathname === '/api/auth/register-parent' && req.method === 'POST') {
        const { fullName, email, phone, password, address, lat, lng } = await readJsonBody(req);
        if (!fullName || !email || !phone || !password) return sendError(res, 400, 'All fields are required');

        const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(email.trim());
        if (existing) return sendError(res, 400, 'An account with this email already exists');

        const newUserId = generateId('usr_par');
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO users (id, email, password_hash, role, display_name, phone, blocked, created_at)
          VALUES (?, ?, ?, 'user', ?, ?, 0, ?)
        `).run(newUserId, email.trim(), hashPassword(password), fullName.trim(), phone.trim(), now);

        db.prepare(`
          INSERT INTO parents (id, user_id, name, phone, address, address_lat, address_lng, selected_van_id, selected_van_label)
          VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
        `).run(generateId('par'), newUserId, fullName.trim(), phone.trim(), address || '', lat || 21.1458, lng || 79.0882);

        const token = createToken(newUserId);
        const profile = getUserProfile(newUserId);
        return sendJson(res, 201, { token, user: profile });
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
        if (user.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
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
        if (staffReq.email && staffReq.email.toLowerCase() === PERMANENT_ADMIN_EMAIL.toLowerCase()) {
          return sendError(res, 403, 'The Permanent Master Administrator account cannot be blocked.');
        }

        db.prepare('UPDATE users SET blocked = 1 WHERE id = ?').run(staffReq.user_id);
        db.prepare('UPDATE staff_requests SET status = \'rejected\' WHERE id = ?').run(reqId);
        broadcastEvent('user_blocked', { userId: staffReq.user_id });
        return sendJson(res, 200, { success: true });
      }

      // DRIVERS & STAFF REGISTRY: List all
      if (pathname === '/api/drivers' && req.method === 'GET') {
        const type = urlObj.searchParams.get('type');
        let query = 'SELECT * FROM drivers';
        const params = [];
        if (type) {
          query += ' WHERE type = ?';
          params.push(type);
        }
        query += ' ORDER BY label ASC';
        const drivers = db.prepare(query).all(...params);
        return sendJson(res, 200, { drivers });
      }

      // DRIVERS & STAFF REGISTRY: Add new
      if (pathname === '/api/drivers' && req.method === 'POST') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const { driver_name, van_no, phone, vehicle_type, type } = await readJsonBody(req);
        if (!driver_name || !van_no) return sendError(res, 400, 'Name and vehicle number are required');

        const kind = type === 'staff' ? 'staff' : 'van';
        const label = getNextLabel(kind);
        const id = generateId('drv');
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO drivers (id, label, type, driver_name, license_number, van_no, phone, vehicle_type, raw_data, created_at)
          VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?)
        `).run(id, label, kind, driver_name.trim(), van_no.trim().toUpperCase(), phone || '', vehicle_type || '4_wheeler', `Name: ${driver_name}`, now);

        if (kind === 'van') {
          db.prepare(`
            INSERT INTO van_locations (van_id, van_label, lat, lng, live, updated_at)
            VALUES (?, ?, 0, 0, 0, ?)
          `).run(id, label, now);
        }

        broadcastEvent('driver_added', { id, label });
        return sendJson(res, 201, { id, label });
      }

      // DRIVERS & STAFF REGISTRY: Delete van or staff (Cascades logs & renumbers as per §7.3)
      if (pathname.startsWith('/api/drivers/') && req.method === 'DELETE') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');
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

        // Parse key-value or delimited pairs
        // Accepts formats: "Name: Ramesh, Vehicle: MH31DC9633, Phone: 9876543210" or "Name-..., vehicle no-..."
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

        const driver_name = parsed['name'] || parsed['driver_name'] || parsed['driver'] || '';
        const van_no = parsed['vehicle'] || parsed['vehicle_no'] || parsed['vehicle_number'] || parsed['plate'] || '';
        const phone = parsed['phone'] || parsed['mobile'] || parsed['contact'] || '';
        const vehicle_type = parsed['type'] && parsed['type'].includes('2') ? '2_wheeler' : '4_wheeler';

        if (!driver_name || !van_no) {
          return sendError(res, 400, `Incomplete QR code — Missing: ${!driver_name ? 'name ' : ''}${!van_no ? 'vehicle number' : ''}`);
        }

        const kind = type === 'staff' ? 'staff' : 'van';
        const label = getNextLabel(kind);
        const id = generateId('drv');
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO drivers (id, label, type, driver_name, license_number, van_no, phone, vehicle_type, raw_data, created_at)
          VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?)
        `).run(id, label, kind, driver_name, van_no.toUpperCase(), phone, vehicle_type, text, now);

        if (kind === 'van') {
          db.prepare(`
            INSERT INTO van_locations (van_id, van_label, lat, lng, live, updated_at)
            VALUES (?, ?, 0, 0, 0, ?)
          `).run(id, label, now);
        }

        broadcastEvent('driver_added', { id, label, driver_name, van_no });
        return sendJson(res, 201, { success: true, label, id, driver_name, van_no });
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

        return sendJson(res, 200, { logs, stats });
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
        if (vanId) {
          db.prepare('UPDATE van_locations SET live = 0, updated_at = ? WHERE van_id = ?').run(new Date().toISOString(), vanId);
          broadcastEvent('journey_ended', { vanId });
        }
        return sendJson(res, 200, { success: true, live: false });
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

        const { name, van_id } = await readJsonBody(req);
        if (!name || !van_id) return sendError(res, 400, 'Child name and assigned van are required');

        const van = db.prepare('SELECT label FROM drivers WHERE id = ?').get(van_id);
        const vanLabel = van ? van.label : 'Van';
        const childId = generateId('ch');
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO children (id, parent_id, name, van_id, van_label, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(childId, user.id, name.trim(), van_id, vanLabel, now);

        // Auto sync parent's selected van
        db.prepare(`
          UPDATE parents SET selected_van_id = ?, selected_van_label = ? WHERE user_id = ?
        `).run(van_id, vanLabel, user.id);

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
});
