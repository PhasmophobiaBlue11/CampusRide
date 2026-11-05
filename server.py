#!/usr/bin/env python3
"""
CampusRide — Zero-dependency Python 3 Backend Server
Provides SQLite persistence, Server-Sent Events (SSE), QR Validation, Alternation checks, and Static SPA Serving
"""
import os
import sys
import json
import time
import socket
import sqlite3
import hashlib
import secrets
import mimetypes
from urllib.parse import urlparse, parse_qs
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone

PORT = int(os.environ.get("PORT", 8000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "campusride.db")
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password):
    return hashlib.sha256((password + "_campusride_salt").encode('utf-8')).hexdigest()

def generate_id(prefix="id"):
    return f"{prefix}_{secrets.token_hex(8)}"

PERMANENT_ADMIN_EMAIL = "adphasmo@gmail.com"

def init_db():
    conn = get_db()
    with conn:
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          display_name TEXT,
          phone TEXT,
          blocked INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        );
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS drivers (
          id TEXT PRIMARY KEY,
          label TEXT UNIQUE NOT NULL,
          type TEXT NOT NULL,
          driver_name TEXT,
          license_number TEXT,
          van_no TEXT,
          phone TEXT,
          vehicle_type TEXT DEFAULT '4_wheeler',
          raw_data TEXT,
          created_at TEXT NOT NULL
        );
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS driver_profiles (
          id TEXT PRIMARY KEY,
          user_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          phone TEXT,
          selected_van_id TEXT,
          selected_van_label TEXT
        );
        """)
        conn.execute("""
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
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS children (
          id TEXT PRIMARY KEY,
          parent_id TEXT NOT NULL,
          name TEXT NOT NULL,
          van_id TEXT,
          van_label TEXT,
          created_at TEXT NOT NULL
        );
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS van_logs (
          id TEXT PRIMARY KEY,
          qr_identifier TEXT,
          driver_id TEXT NOT NULL,
          driver_name TEXT,
          driver_label TEXT,
          event_type TEXT NOT NULL,
          scanned_by TEXT,
          timestamp TEXT NOT NULL
        );
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS van_locations (
          van_id TEXT PRIMARY KEY,
          van_label TEXT,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          live INTEGER DEFAULT 0,
          updated_at TEXT NOT NULL
        );
        """)
        conn.execute("""
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
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS ride_alerts (
          id TEXT PRIMARY KEY,
          van_id TEXT NOT NULL,
          van_label TEXT,
          driver_name TEXT,
          alert_type TEXT NOT NULL,
          severity TEXT DEFAULT 'warning',
          message TEXT NOT NULL,
          audience TEXT DEFAULT 'all',
          target_user_id TEXT,
          source_id TEXT UNIQUE,
          read INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        );
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS staff_requests (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          full_name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          notes TEXT,
          is_admin INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        );
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS email_otps (
          email TEXT PRIMARY KEY,
          otp TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at TEXT NOT NULL
        );
        """)

        # Ensure permanent super admin exists and is always active
        row = conn.execute("SELECT id FROM users WHERE lower(email) = ?", (PERMANENT_ADMIN_EMAIL.lower(),)).fetchone()
        now = datetime.now(timezone.utc).isoformat()
        if not row:
            conn.execute("""
            INSERT INTO users VALUES (?, ?, ?, 'admin', 'Super Administrator (Parth)', '9876500000', 0, ?)
            """, ('usr_perm_admin', PERMANENT_ADMIN_EMAIL, hash_password('Parth@123'), now))
        else:
            conn.execute("""
            UPDATE users SET role = 'admin', blocked = 0, password_hash = ? WHERE lower(email) = ?
            """, (hash_password('Parth@123'), PERMANENT_ADMIN_EMAIL.lower()))

init_db()

active_sessions = {}

class CampusRideHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Keep quiet in console
        pass

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def send_json(self, status_code, data):
        payload = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(payload)

    def send_error_json(self, status_code, message):
        self.send_json(status_code, {"error": message})

    def get_auth_user(self):
        auth_header = self.headers.get('Authorization', '')
        token = None
        if auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()
        if not token:
            parsed = urlparse(self.path)
            qs = parse_qs(parsed.query)
            if 'token' in qs:
                token = qs['token'][0]
        if not token or token not in active_sessions:
            return None
        user_id = active_sessions[token]
        conn = get_db()
        user = conn.execute("SELECT id, email, role, display_name, phone, blocked FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user or user['blocked']:
            return None
        user_dict = dict(user)
        # Check staff status
        if user_dict['role'] == 'admin':
            user_dict['staffStatus'] = 'approved'
        else:
            sr = conn.execute("SELECT status FROM staff_requests WHERE user_id = ? OR email = ?", (user['id'], user['email'])).fetchone()
            user_dict['staffStatus'] = sr['status'] if sr else 'none'
        # Driver profile
        dp = conn.execute("SELECT * FROM driver_profiles WHERE user_id = ?", (user['id'],)).fetchone()
        user_dict['driverProfile'] = dict(dp) if dp else None
        # Parent profile
        par = conn.execute("SELECT * FROM parents WHERE user_id = ?", (user['id'],)).fetchone()
        user_dict['parentProfile'] = dict(par) if par else None
        return user_dict

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith('/api/'):
            user = self.get_auth_user()
            conn = get_db()

            if path == '/api/auth/me':
                if not user:
                    return self.send_error_json(401, 'Unauthorized')
                return self.send_json(200, {"user": user})

            if path == '/api/auth/check-blocked':
                qs = parse_qs(parsed.query)
                email = qs.get('email', [''])[0].strip().lower()
                row = conn.execute("SELECT blocked FROM users WHERE lower(email) = ?", (email,)).fetchone()
                return self.send_json(200, {"blocked": bool(row and row['blocked'])})

            if path == '/api/drivers':
                qs = parse_qs(parsed.query)
                kind = qs.get('type', [None])[0]
                if kind:
                    rows = conn.execute("SELECT * FROM drivers WHERE type = ? ORDER BY label ASC", (kind,)).fetchall()
                else:
                    rows = conn.execute("SELECT * FROM drivers ORDER BY label ASC").fetchall()
                return self.send_json(200, {"drivers": [dict(r) for r in rows]})

            if path == '/api/locations':
                rows = conn.execute("""
                SELECT vl.*, d.driver_name, d.van_no, d.phone 
                FROM van_locations vl
                LEFT JOIN drivers d ON vl.van_id = d.id
                """).fetchall()
                return self.send_json(200, {"locations": [dict(r) for r in rows]})

            if path == '/api/alerts':
                rows = conn.execute("SELECT * FROM ride_alerts ORDER BY created_at DESC LIMIT 50").fetchall()
                return self.send_json(200, {"alerts": [dict(r) for r in rows]})

            if path == '/api/logs':
                qs = parse_qs(parsed.query)
                driver_id = qs.get('driverId', [None])[0]
                date = qs.get('date', [None])[0]
                limit = int(qs.get('limit', ['500'])[0])
                offset = int(qs.get('offset', ['0'])[0])

                q = "SELECT * FROM van_logs WHERE 1=1"
                params = []
                if driver_id:
                    q += " AND driver_id = ?"
                    params.append(driver_id)
                if date:
                    q += " AND date(timestamp) = date(?)"
                    params.append(date)
                q += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
                params.extend([limit, offset])

                rows = conn.execute(q, params).fetchall()

                sq = "SELECT event_type, count(*) as count FROM van_logs WHERE 1=1"
                sparams = []
                if driver_id:
                    sq += " AND driver_id = ?"
                    sparams.append(driver_id)
                if date:
                    sq += " AND date(timestamp) = date(?)"
                    sparams.append(date)
                sq += " GROUP BY event_type"
                srows = conn.execute(sq, sparams).fetchall()
                stats = {"entry": 0, "exit": 0, "journey_start": 0}
                for r in srows:
                    if r['event_type'] in stats:
                        stats[r['event_type']] = r['count']

                return self.send_json(200, {"logs": [dict(r) for r in rows], "stats": stats})

            if path == '/api/staff-requests':
                if not user or user.get('role') != 'admin':
                    return self.send_error_json(403, 'Admin access required')
                rows = conn.execute("SELECT * FROM staff_requests ORDER BY created_at DESC").fetchall()
                return self.send_json(200, {"requests": [dict(r) for r in rows]})

            if path == '/api/journey/status':
                qs = parse_qs(parsed.query)
                van_id = qs.get('vanId', [None])[0]
                if not van_id:
                    return self.send_json(200, {"live": False})
                row = conn.execute("SELECT live FROM van_locations WHERE van_id = ?", (van_id,)).fetchone()
                return self.send_json(200, {"live": bool(row and row['live'])})

            if path == '/api/children':
                if not user:
                    return self.send_error_json(401, 'Unauthorized')
                rows = conn.execute("SELECT * FROM children WHERE parent_id = ? ORDER BY created_at ASC", (user['id'],)).fetchall()
                return self.send_json(200, {"children": [dict(r) for r in rows]})

            if path == '/api/notifications':
                if not user:
                    return self.send_error_json(401, 'Unauthorized')
                rows = conn.execute("SELECT * FROM parent_notifications WHERE parent_id = ? ORDER BY created_at DESC LIMIT 50", (user['id'],)).fetchall()
                return self.send_json(200, {"notifications": [dict(r) for r in rows]})

            if path == '/api/my-students':
                if not user:
                    return self.send_error_json(401, 'Unauthorized')
                qs = parse_qs(parsed.query)
                van_id = qs.get('vanId', [None])[0] or (user.get('driverProfile') and user['driverProfile'].get('selected_van_id'))
                if not van_id:
                    return self.send_json(200, {"students": []})
                rows = conn.execute("""
                SELECT c.id, c.name, p.address, p.address_lat, p.address_lng
                FROM children c
                JOIN parents p ON c.parent_id = p.user_id
                WHERE c.van_id = ?
                """, (van_id,)).fetchall()
                return self.send_json(200, {"students": [dict(r) for r in rows]})

            if path == '/api/directories/staff':
                rows = conn.execute("""
                SELECT full_name, phone, email, notes 
                FROM staff_requests WHERE status = 'approved' ORDER BY full_name ASC
                """).fetchall()
                return self.send_json(200, {"staff": [dict(r) for r in rows]})

            if path == '/api/directories/parents':
                if not user:
                    return self.send_error_json(401, 'Unauthorized')
                rows = conn.execute("""
                SELECT p.name, p.phone, p.address, p.address_lat, p.address_lng,
                       GROUP_CONCAT(c.van_label, ', ') as vans,
                       GROUP_CONCAT(c.name, ', ') as children_names
                FROM parents p
                LEFT JOIN children c ON p.user_id = c.parent_id
                GROUP BY p.id ORDER BY p.name ASC
                """).fetchall()
                return self.send_json(200, {"parents": [dict(r) for r in rows]})

        # Static File Serving
        clean_path = path.lstrip('/')
        if not clean_path:
            clean_path = 'index.html'
        file_path = os.path.join(PUBLIC_DIR, clean_path)
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            file_path = os.path.join(PUBLIC_DIR, 'index.html')

        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = 'application/octet-stream'
        if file_path.endswith('.js'):
            mime_type = 'text/javascript; charset=utf-8'

        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        body = {}
        if post_data:
            try:
                body = json.loads(post_data.decode('utf-8'))
            except Exception:
                body = {}

        user = self.get_auth_user()
        conn = get_db()

        if path == '/api/auth/send-otp':
            email = body.get('email', '').strip().lower()
            if not email or '@' not in email:
                return self.send_error_json(400, 'Valid email is required')
            otp = str(secrets.randbelow(900000) + 100000)
            expires_at = int(time.time() * 1000) + 10 * 60 * 1000
            now = datetime.now(timezone.utc).isoformat()
            with conn:
                conn.execute("""
                INSERT INTO email_otps VALUES (?, ?, ?, ?)
                ON CONFLICT(email) DO UPDATE SET otp = excluded.otp, expires_at = excluded.expires_at, created_at = excluded.created_at
                """, (email, otp, expires_at, now))
            print(f"[CampusRide OTP] Code for {email}: {otp}")
            return self.send_json(200, {"success": True, "message": f"Verification code sent to {email}", "otp": otp})

        if path == '/api/auth/verify-otp':
            email = body.get('email', '').strip().lower()
            otp = body.get('otp', '').strip()
            row = conn.execute("SELECT otp, expires_at FROM email_otps WHERE email = ?", (email,)).fetchone()
            if not row or int(time.time() * 1000) > row['expires_at'] or row['otp'] != otp:
                return self.send_error_json(400, 'Invalid or expired verification code')
            return self.send_json(200, {"success": True, "verified": True})

        if path == '/api/auth/login':
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            row = conn.execute("SELECT * FROM users WHERE lower(email) = ?", (email,)).fetchone()
            if not row:
                return self.send_error_json(401, 'No account with this email exists')
            if row['blocked']:
                return self.send_error_json(403, 'Account removed. Access is blocked.')
            if row['password_hash'] != hash_password(password):
                return self.send_error_json(401, 'Invalid email or password')
            token = f"cr_{secrets.token_hex(24)}"
            active_sessions[token] = row['id']
            # Fetch profile
            u_dict = dict(row)
            if u_dict['role'] == 'admin':
                u_dict['staffStatus'] = 'approved'
            else:
                sr = conn.execute("SELECT status FROM staff_requests WHERE user_id = ? OR email = ?", (row['id'], row['email'])).fetchone()
                u_dict['staffStatus'] = sr['status'] if sr else 'none'
            dp = conn.execute("SELECT * FROM driver_profiles WHERE user_id = ?", (row['id'],)).fetchone()
            u_dict['driverProfile'] = dict(dp) if dp else None
            par = conn.execute("SELECT * FROM parents WHERE user_id = ?", (row['id'],)).fetchone()
            u_dict['parentProfile'] = dict(par) if par else None
            return self.send_json(200, {"token": token, "user": u_dict})

        if path == '/api/scanner/scan':
            if not user:
                return self.send_error_json(401, 'Unauthorized')
            payload = body.get('qrPayload', '')
            scan_type = body.get('scanType', '') # 'entry' | 'exit'
            if not payload.startswith('CAMPUSRIDE:DRIVER:'):
                return self.send_error_json(400, 'Not an entry/exit QR — this scanner only accepts CampusRide pass QR codes.')
            driver_id = payload.replace('CAMPUSRIDE:DRIVER:', '').strip()
            driver = conn.execute("SELECT * FROM drivers WHERE id = ?", (driver_id,)).fetchone()
            if not driver:
                return self.send_error_json(404, 'No registered vehicle or staff matches this pass.')
            last_log = conn.execute("""
            SELECT event_type FROM van_logs WHERE driver_id = ? AND (event_type = 'entry' OR event_type = 'exit') ORDER BY timestamp DESC LIMIT 1
            """, (driver_id,)).fetchone()
            last_state = last_log['event_type'] if last_log else 'exit'

            if scan_type == 'entry' and last_state == 'entry':
                return self.send_error_json(400, 'Already inside campus — scan Exit first.')
            if scan_type == 'exit' and last_state != 'entry':
                return self.send_error_json(400, "No active entry — hasn't entered, scan Entry first.")

            now = datetime.now(timezone.utc).isoformat()
            log_id = generate_id('log')
            scanned_by = user.get('display_name') or user.get('email')
            with conn:
                conn.execute("""
                INSERT INTO van_logs VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (log_id, payload, driver['id'], driver['driver_name'], driver['label'], scan_type, scanned_by, now))

                children = conn.execute("SELECT parent_id FROM children WHERE van_id = ?", (driver['id'],)).fetchall()
                formatted_time = datetime.now().strftime("%I:%M %p")
                msg = f"{driver['label']} ({driver['van_no']}) {'entered campus safely' if scan_type == 'entry' else 'exited campus'} at {formatted_time}."
                for ch in children:
                    conn.execute("""
                    INSERT INTO parent_notifications VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
                    """, (generate_id('notif'), ch['parent_id'], driver['id'], driver['label'], scan_type, now, msg, now))

                if scan_type == 'exit':
                    conn.execute("DELETE FROM ride_alerts WHERE van_id = ? AND alert_type = 'entry_no_journey'", (driver['id'],))

            return self.send_json(200, {
                "success": True,
                "event_type": scan_type,
                "driver": {
                    "id": driver['id'],
                    "label": driver['label'],
                    "name": driver['driver_name'],
                    "van_no": driver['van_no']
                },
                "timestamp": now
            })

        if path == '/api/journey/start':
            if not user:
                return self.send_error_json(401, 'Unauthorized')
            van_id = body.get('vanId') or (user.get('driverProfile') and user['driverProfile'].get('selected_van_id'))
            van = None
            if van_id:
                van = conn.execute("SELECT * FROM drivers WHERE id = ?", (van_id,)).fetchone()
            if not van:
                van = conn.execute("SELECT * FROM drivers WHERE type = 'van' ORDER BY created_at ASC LIMIT 1").fetchone()
            if not van:
                return self.send_error_json(404, 'No transport van found. Please have gate staff register your van first.')

            now = datetime.now(timezone.utc).isoformat()
            with conn:
                conn.execute("UPDATE driver_profiles SET selected_van_id = ?, selected_van_label = ? WHERE user_id = ?", (van['id'], van['label'], user['id']))
                conn.execute("INSERT INTO van_logs VALUES (?, '', ?, ?, ?, 'journey_start', ?, ?)", (generate_id('log'), van['id'], van['driver_name'], van['label'], user.get('display_name') or user.get('email'), now))
                conn.execute("DELETE FROM ride_alerts WHERE van_id = ? AND alert_type = 'entry_no_journey'", (van['id'],))
                conn.execute("""
                INSERT INTO van_locations VALUES (?, ?, 21.1458, 79.0882, 1, ?)
                ON CONFLICT(van_id) DO UPDATE SET live = 1, updated_at = excluded.updated_at
                """, (van['id'], van['label'], now))
            return self.send_json(200, {"success": True, "vanId": van['id'], "label": van['label'], "live": True})

        if path == '/api/journey/end':
            if not user:
                return self.send_error_json(401, 'Unauthorized')
            van_id = body.get('vanId') or (user.get('driverProfile') and user['driverProfile'].get('selected_van_id'))
            if van_id:
                with conn:
                    conn.execute("UPDATE van_locations SET live = 0, updated_at = ? WHERE van_id = ?", (datetime.now(timezone.utc).isoformat(), van_id))
            return self.send_json(200, {"success": True, "live": False})

        if path == '/api/location/update':
            if not user:
                return self.send_error_json(401, 'Unauthorized')
            van_id = body.get('vanId')
            lat = body.get('lat')
            lng = body.get('lng')
            now = datetime.now(timezone.utc).isoformat()
            with conn:
                conn.execute("""
                INSERT INTO van_locations (van_id, van_label, lat, lng, live, updated_at)
                VALUES (?, (SELECT label FROM drivers WHERE id = ?), ?, ?, 1, ?)
                ON CONFLICT(van_id) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, live = 1, updated_at = excluded.updated_at
                """, (van_id, van_id, lat, lng, now))
            return self.send_json(200, {"success": True})

        if path == '/api/parents/address':
            if not user:
                return self.send_error_json(401, 'Unauthorized')
            address = body.get('address', '').strip()
            lat = body.get('lat', 21.1219)
            lng = body.get('lng', 79.0601)
            with conn:
                conn.execute("""
                UPDATE parents SET address = ?, address_lat = ?, address_lng = ? WHERE user_id = ?
                """, (address, lat, lng, user['id']))
            return self.send_json(200, {"success": True})

        return self.send_error_json(404, 'API endpoint not found')

def run_server():
    server = ThreadingHTTPServer(('0.0.0.0', PORT), CampusRideHandler)
    print("=======================================================")
    print("  CAMPUSRIDE — PYTHON SERVER RUNNING")
    print("=======================================================")
    print(f"  Local URL:        http://localhost:{PORT}")
    print(f"  Database:         SQLite ({DB_PATH})")
    print("=======================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")

if __name__ == '__main__':
    run_server()
