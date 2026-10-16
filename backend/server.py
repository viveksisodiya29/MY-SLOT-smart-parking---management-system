#!/usr/bin/env python3
"""
MY-SLOT - Python Backend Server
Car Parking & EV Charging Real-Time Reservation System
With SQLite SQL Database, RBAC Authentication, Stripe Payment Processing,
GPS Haversine Distance Calculation, and Email Notification Dispatcher.
"""

import sys
import os
import json
import sqlite3
import hashlib
import hmac
import secrets
import math
import time
import base64
from datetime import datetime, timedelta
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import urllib.request
import urllib.error
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configuration
PORT = int(os.environ.get("PYTHON_PORT", 5001))
DB_PATH = os.environ.get("DATABASE_PATH") or os.environ.get("DB_PATH") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "MY-SLOT.db")

IS_PRODUCTION = os.environ.get("NODE_ENV") == "production"

# Secrets & Security
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    if IS_PRODUCTION:
        raise RuntimeError("JWT_SECRET must be set in production and kept stable across restarts.")
    else:
        JWT_SECRET = "myslot_dev_secret_key_2026_local_only"

ADMIN_SECRET_KEY = os.environ.get("ADMIN_SECRET_KEY", "").strip()

CORS_ORIGIN = os.environ.get("CORS_ORIGIN", "*")

# Real Payment Processing (Stripe)
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "").strip()

# Real Email Delivery (SMTP)
SMTP_HOST = os.environ.get("SMTP_HOST", "").strip()
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER", "").strip()
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "").strip()
SMTP_FROM = os.environ.get("SMTP_FROM", "").strip() or SMTP_USER or "noreply@my-slot.app"
SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def normalize_phone(phone):
    digits = "".join(character for character in str(phone or "") if character.isdigit())
    return digits if 7 <= len(digits) <= 15 else None

def init_db():
    db_dir = os.path.dirname(os.path.abspath(DB_PATH))
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

    conn = get_db()
    cursor = conn.cursor()

    # Enable WAL mode for high concurrency
    cursor.execute("PRAGMA journal_mode=WAL;")

    # 1. Users table (RBAC with real authentication)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        phone_normalized TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        is_active INTEGER NOT NULL DEFAULT 1,
        deleted_at TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Parking Locations table with GPS coordinates
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS parking_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        total_spots INTEGER NOT NULL,
        ev_spots INTEGER NOT NULL,
        hourly_rate REAL NOT NULL,
        ev_rate_kwh REAL NOT NULL,
        amenities TEXT,
        image_url TEXT,
        owner_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cursor.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS one_owner_account
    ON users(role) WHERE role = 'owner';
    """)
    cursor.execute("PRAGMA table_info(users);")
    user_cols = [row["name"] for row in cursor.fetchall()]
    if "phone_normalized" not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN phone_normalized TEXT;")
    if "is_active" not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;")
    if "deleted_at" not in user_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN deleted_at TEXT;")
    cursor.execute("SELECT id, phone FROM users")
    legacy_phones = [(row["id"], normalize_phone(row["phone"])) for row in cursor.fetchall()]
    phone_counts = {}
    for _, normalized in legacy_phones:
        if normalized:
            phone_counts[normalized] = phone_counts.get(normalized, 0) + 1
    for user_id, normalized in legacy_phones:
        unique_phone = normalized if normalized and phone_counts[normalized] == 1 else None
        cursor.execute("UPDATE users SET phone_normalized = ? WHERE id = ?", (unique_phone, user_id))
    cursor.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS one_user_per_phone
    ON users(phone_normalized) WHERE phone_normalized IS NOT NULL AND phone_normalized <> '';
    """)
    # Ensure owner_id column exists if table was created in an older migration
    cursor.execute("PRAGMA table_info(parking_locations);")
    existing_cols = [r["name"] for r in cursor.fetchall()]
    if "owner_id" not in existing_cols:
        try:
            cursor.execute("ALTER TABLE parking_locations ADD COLUMN owner_id INTEGER REFERENCES users(id);")
            conn.commit()
        except Exception as e:
            print(f"[DB Migration Error] {e}")
    cursor.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS one_admin_per_garage
    ON parking_locations(owner_id) WHERE owner_id IS NOT NULL;
    """)

    # 3. Parking Spots & EV Charging Slots
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS parking_spots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id INTEGER NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
        spot_number TEXT NOT NULL,
        floor_level TEXT NOT NULL,
        spot_type TEXT NOT NULL, -- 'regular', 'compact', 'accessible', 'ev_charger'
        ev_charger_type TEXT,   -- 'Type 2 AC', 'CCS2 DC Fast', 'CHAdeMO Fast', 'Tesla Supercharger', 'None'
        ev_power_kw REAL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'available', -- 'available', 'reserved', 'occupied', 'maintenance'
        price_per_hour REAL NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 4. Bookings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_code TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        spot_id INTEGER NOT NULL REFERENCES parking_spots(id),
        location_id INTEGER NOT NULL REFERENCES parking_locations(id),
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        total_hours REAL NOT NULL,
        vehicle_plate TEXT NOT NULL,
        vehicle_model TEXT NOT NULL,
        is_ev INTEGER DEFAULT 0,
        charger_type TEXT,
        total_amount REAL NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'paid',
        stripe_payment_id TEXT,
        stripe_receipt_url TEXT,
        status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'active', 'completed', 'cancelled'
        gate_pin TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 5. Payments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER REFERENCES bookings(id),
        user_id INTEGER REFERENCES users(id),
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        stripe_payment_intent_id TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL,
        receipt_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 6. Email Notifications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS email_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER REFERENCES bookings(id),
        recipient_email TEXT NOT NULL,
        recipient_name TEXT,
        subject TEXT NOT NULL,
        body_html TEXT NOT NULL,
        status TEXT DEFAULT 'sent',
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()

    # Seed Initial Locations and Spots if empty or migrate if old US seed
    cursor.execute("SELECT COUNT(*) as count FROM parking_locations;")
    loc_count = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM parking_locations WHERE city LIKE '%San Francisco%' OR city LIKE '%Palo Alto%';")
    us_count = cursor.fetchone()["count"]

    if us_count > 0:
        cursor.execute("DELETE FROM bookings WHERE location_id IN (SELECT id FROM parking_locations WHERE city LIKE '%San Francisco%' OR city LIKE '%Palo Alto%');")
        cursor.execute("DELETE FROM parking_spots WHERE location_id IN (SELECT id FROM parking_locations WHERE city LIKE '%San Francisco%' OR city LIKE '%Palo Alto%');")
        cursor.execute("DELETE FROM parking_locations WHERE city LIKE '%San Francisco%' OR city LIKE '%Palo Alto%';")
        cursor.execute("SELECT COUNT(*) as count FROM parking_locations;")
        if cursor.fetchone()["count"] == 0:
            seed_data(cursor)
        conn.commit()
    elif loc_count == 0:
        seed_data(cursor)
        conn.commit()

    conn.close()

def seed_spots_for_location(cursor, loc_id, hourly_rate, total_spots=60, ev_spots=20):
    """Generates standard and EV charging spots for a facility."""
    floors = ["Level 1", "Level 2"]
    for f in floors:
        for i in range(1, 9):
            cursor.execute("""
            INSERT INTO parking_spots (location_id, spot_number, floor_level, spot_type, ev_charger_type, ev_power_kw, status, price_per_hour)
            VALUES (?, ?, ?, 'regular', 'None', 0, 'available', ?);
            """, (loc_id, f"{f[6]}-R{i:02d}", f, hourly_rate))

    for f in floors:
        for i in range(1, 5):
            charger_type = "CCS2 DC Fast" if i % 2 == 0 else "Tesla Supercharger"
            power = 150.0 if i % 2 == 0 else 250.0
            cursor.execute("""
            INSERT INTO parking_spots (location_id, spot_number, floor_level, spot_type, ev_charger_type, ev_power_kw, status, price_per_hour)
            VALUES (?, ?, ?, 'ev_charger', ?, ?, 'available', ?);
            """, (loc_id, f"{f[6]}-EV{i:02d}", f, charger_type, power, hourly_rate + 20.0))

    for i in range(1, 3):
        cursor.execute("""
        INSERT INTO parking_spots (location_id, spot_number, floor_level, spot_type, ev_charger_type, ev_power_kw, status, price_per_hour)
        VALUES (?, ?, 'Level 1', 'accessible', 'Type 2 AC', 22.0, 'available', ?);
        """, (loc_id, f"1-ACC{i:02d}", hourly_rate))

def seed_data(cursor):
    """Seed real-world Indian parking hubs with GPS coordinates and EV charging slots."""
    locations = [
        (
            "Connaught Place Central Park & EV Hub",
            "Radial Road 2, Inner Circle, Connaught Place",
            "New Delhi",
            28.6315,
            77.2167,
            80,
            30,
            80.00,
            14.00,
            json.dumps(["24/7 Security", "150kW DC Fast Charging", "CCTV Surveillance", "Covered Basement", "Valet Service", "Restrooms"]),
            "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80"
        ),
        (
            "Cyber Hub Smart Mobility Garage",
            "DLF Cyber City, Phase 2, Sector 24",
            "Gurugram, Haryana",
            28.4952,
            77.0890,
            120,
            50,
            100.00,
            16.00,
            json.dumps(["CCS2 250kW Ultra Fast", "Tesla Compatible", "Solar Canopy", "Free High-Speed WiFi", "Food Court Access", "EV Battery Swap"]),
            "https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80"
        ),
        (
            "Bandra Kurla Complex (BKC) EV Superhub",
            "G Block, Bandra Kurla Complex, Bandra East",
            "Mumbai, Maharashtra",
            19.0657,
            72.8687,
            90,
            40,
            120.00,
            18.00,
            json.dumps(["Underground Climate-Controlled", "Automated Boom Barrier", "350kW Hypercharger", "Valet Option", "Executive Lounge"]),
            "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=800&q=80"
        ),
        (
            "Indiranagar 100ft Road Eco Park",
            "100 Feet Road, HAL 2nd Stage, Indiranagar",
            "Bengaluru, Karnataka",
            12.9716,
            77.6412,
            75,
            30,
            90.00,
            15.00,
            json.dumps(["Type 2 AC & DC Fast", "App-Based Gate Entry", "24/7 Security Patrol", "Café Nearby", "Two-Wheeler EV Bays"]),
            "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80"
        ),
        (
            "HITEC City Cyber Towers Park & Charge",
            "Cyber Towers Roundabout, Madhapur",
            "Hyderabad, Telangana",
            17.4504,
            78.3808,
            100,
            45,
            85.00,
            14.00,
            json.dumps(["Multi-Level Automated Parking", "Fast Exit Lanes", "CCTV Monitoring", "EV Fast Charging Deck", "Restrooms"]),
            "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=800&q=80"
        ),
        (
            "Koregaon Park Gateway Mobility Deck",
            "North Main Road, Koregaon Park",
            "Pune, Maharashtra",
            18.5362,
            73.8940,
            65,
            24,
            75.00,
            13.00,
            json.dumps(["Shaded Parking", "Type 2 Fast Charging", "Wheelchair Accessible", "Security Guards", "LED Floor Guidance"]),
            "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80"
        )
    ]

    for loc in locations:
        cursor.execute("""
        INSERT INTO parking_locations (name, address, city, latitude, longitude, total_spots, ev_spots, hourly_rate, ev_rate_kwh, amenities, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, loc)
        loc_id = cursor.lastrowid
        seed_spots_for_location(cursor, loc_id, loc[7], loc[5], loc[6])


def hash_password(password, salt=None):
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
    return hashed, salt

def verify_password(password, hashed, salt):
    test_hash, _ = hash_password(password, salt)
    return test_hash == hashed

def generate_token(user):
    payload = {
        "user_id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "exp": int(time.time()) + 86400 * 7 # 7 days
    }
    payload_json = json.dumps(payload, separators=(',', ':'))
    sig = hmac.new(JWT_SECRET.encode(), payload_json.encode(), hashlib.sha256).hexdigest()
    token = f"{payload_json.encode('utf-8').hex()}.{sig}"
    return token

def verify_token(token_str):
    try:
        parts = token_str.split(".")
        if len(parts) != 2:
            return None
        payload_hex, sig = parts
        payload_bytes = bytes.fromhex(payload_hex)
        expected_sig = hmac.new(JWT_SECRET.encode(), payload_bytes, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload = json.loads(payload_bytes.decode('utf-8'))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None

def haversine_distance_km(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def process_stripe_payment(amount, currency, stripe_token, description):
    """
    Charges a customer via Stripe API if STRIPE_SECRET_KEY is configured.
    Falls back to safe sandbox simulation if not configured.
    Returns (success: bool, payment_id: str, receipt_url: str, error_msg: str)
    """
    if not STRIPE_SECRET_KEY or not STRIPE_SECRET_KEY.startswith("sk_"):
        # Sandbox simulation mode
        sim_id = f"ch_sim_{secrets.token_hex(12)}"
        receipt = f"https://dashboard.stripe.com/test/payments/{sim_id}"
        return True, sim_id, receipt, None

    try:
        amount_smallest_unit = int(round(amount * 100))
        token_to_use = stripe_token if (stripe_token and stripe_token.startswith("tok_")) else "tok_visa"
        post_data = urllib.parse.urlencode({
            "amount": amount_smallest_unit,
            "currency": currency.lower(),
            "source": token_to_use,
            "description": description
        }).encode("utf-8")

        auth_header = "Basic " + base64.b64encode(f"{STRIPE_SECRET_KEY}:".encode("utf-8")).decode("utf-8")

        req = urllib.request.Request(
            "https://api.stripe.com/v1/charges",
            data=post_data,
            headers={
                "Authorization": auth_header,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            charge_id = res_body.get("id")
            receipt_url = res_body.get("receipt_url") or f"https://dashboard.stripe.com/payments/{charge_id}"
            return True, charge_id, receipt_url, None
    except urllib.error.HTTPError as http_err:
        try:
            err_data = json.loads(http_err.read().decode("utf-8"))
            msg = err_data.get("error", {}).get("message", "Stripe payment declined")
        except Exception:
            msg = f"Stripe HTTP error {http_err.code}"
        return False, None, None, msg
    except Exception as err:
        return False, None, None, f"Payment gateway connection error: {str(err)}"

def send_email_notification(recipient_email, recipient_name, subject, body_html):
    """
    Sends email via real SMTP if SMTP_HOST is configured; otherwise records as simulated.
    Returns (status: str, error_msg: str or None). Status is 'sent', 'simulated', or 'failed'.
    """
    if not SMTP_HOST:
        return "simulated", None

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"MY-SLOT <{SMTP_FROM}>"
        msg["To"] = f"{recipient_name} <{recipient_email}>" if recipient_name else recipient_email

        html_part = MIMEText(body_html, "html")
        msg.attach(html_part)

        if SMTP_USE_TLS:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                server.starttls()
                if SMTP_USER and SMTP_PASSWORD:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_FROM, [recipient_email], msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                if SMTP_USER and SMTP_PASSWORD:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_FROM, [recipient_email], msg.as_string())
        return "sent", None
    except Exception as err:
        print(f"[Email Dispatch Error] Failed to send to {recipient_email}: {err}", file=sys.stderr)
        return "failed", str(err)

class MySlotRequestHandler(BaseHTTPRequestHandler):
    def _get_cors_origin(self):
        if CORS_ORIGIN == "*":
            return "*"
        req_origin = self.headers.get("Origin")
        allowed = [o.strip() for o in CORS_ORIGIN.split(",") if o.strip()]
        if req_origin and req_origin in allowed:
            return req_origin
        return allowed[0] if allowed else "*"

    def _send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", self._get_cors_origin())
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self._get_cors_origin())
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.end_headers()

    def get_auth_user(self):
        auth_header = self.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        token = auth_header[7:].strip()
        token_user = verify_token(token)
        if not token_user:
            return None
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, full_name, phone, role, is_active FROM users WHERE id = ?",
            (token_user["user_id"],)
        )
        user = cursor.fetchone()
        conn.close()
        if not user or not user["is_active"]:
            return None
        return {
            "user_id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "phone": user["phone"],
            "role": user["role"],
        }

    @staticmethod
    def has_admin_access(user):
        return bool(user and user.get("role") in ("admin", "owner"))

    @staticmethod
    def can_manage_location(user, owner_id):
        return bool(user and (
            user.get("role") == "owner" or
            (user.get("role") == "admin" and owner_id == user.get("user_id"))
        ))

    def parse_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        try:
            return json.loads(raw)
        except Exception:
            return {}

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # Health check
        if path == "/api/health":
            self._send_json({"status": "ok", "backend": "python", "timestamp": datetime.utcnow().isoformat()})
            return

        # Current user profile
        if path == "/api/auth/me":
            user = self.get_auth_user()
            if not user:
                self._send_json({"error": "Unauthorized"}, 401)
                return
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, full_name, phone, role, created_at FROM users WHERE id = ?", (user["user_id"],))
            db_user = cursor.fetchone()
            conn.close()
            if not db_user:
                self._send_json({"error": "User not found"}, 404)
                return
            self._send_json({"user": dict(db_user)})
            return

        # Check if any admin exists (for setup guidance)
        if path == "/api/auth/admin-status":
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'owner'")
            admin_count = cursor.fetchone()["count"]
            conn.close()
            self._send_json({"hasAdmin": admin_count > 0})
            return

        # Get Parking Locations (with GPS sorting if lat/lng passed)
        if path == "/api/locations":
            user_lat = float(query.get("lat", [0])[0]) if "lat" in query else None
            user_lng = float(query.get("lng", [0])[0]) if "lng" in query else None
            only_ev = query.get("ev", ["false"])[0].lower() == "true"

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT l.*,
                (SELECT COUNT(*) FROM parking_spots s WHERE s.location_id = l.id AND s.status = 'available') as available_spots,
                (SELECT COUNT(*) FROM parking_spots s WHERE s.location_id = l.id AND s.spot_type = 'ev_charger' AND s.status = 'available') as available_ev_spots
            FROM parking_locations l
            """)
            rows = cursor.fetchall()
            conn.close()

            locations = []
            for r in rows:
                item = dict(r)
                if item.get("amenities"):
                    try:
                        item["amenities"] = json.loads(item["amenities"])
                    except:
                        item["amenities"] = []

                if user_lat is not None and user_lng is not None and user_lat != 0:
                    item["distance_km"] = haversine_distance_km(user_lat, user_lng, item["latitude"], item["longitude"])
                    item["distance_miles"] = round(item["distance_km"] * 0.621371, 2)
                else:
                    item["distance_km"] = None
                    item["distance_miles"] = None
                
                if only_ev and item["available_ev_spots"] == 0:
                    continue
                locations.append(item)

            if user_lat is not None and user_lng is not None and user_lat != 0:
                locations.sort(key=lambda x: (x["distance_km"] if x["distance_km"] is not None else 99999))

            self._send_json({"locations": locations})
            return

        # Get Spots for a specific Location
        if path.startswith("/api/locations/") and path.endswith("/spots"):
            loc_id = path.split("/")[3]
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT * FROM parking_spots WHERE location_id = ? ORDER BY floor_level ASC, spot_number ASC
            """, (loc_id,))
            spots = [dict(s) for s in cursor.fetchall()]
            conn.close()
            self._send_json({"spots": spots})
            return

        # Get User Bookings
        if path == "/api/bookings/my":
            user = self.get_auth_user()
            if not user:
                self._send_json({"error": "Unauthorized"}, 401)
                return
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT b.*, l.name as location_name, l.address as location_address, l.latitude, l.longitude,
                   s.spot_number, s.floor_level, s.spot_type, s.ev_charger_type, s.ev_power_kw
            FROM bookings b
            JOIN parking_locations l ON b.location_id = l.id
            JOIN parking_spots s ON b.spot_id = s.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
            """, (user["user_id"],))
            bookings = [dict(b) for b in cursor.fetchall()]
            conn.close()
            self._send_json({"bookings": bookings})
            return

        # Get User Email Notifications
        if path == "/api/notifications/my":
            user = self.get_auth_user()
            if not user:
                self._send_json({"error": "Unauthorized"}, 401)
                return
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT n.*, b.booking_code
            FROM email_notifications n
            JOIN bookings b ON n.booking_id = b.id
            WHERE b.user_id = ?
            ORDER BY n.sent_at DESC
            """, (user["user_id"],))
            notifications = [dict(n) for n in cursor.fetchall()]
            conn.close()
            self._send_json({"notifications": notifications})
            return

        # Owner sees all garages; an admin sees only the garage assigned by the owner.
        if path == "/api/admin/locations":
            user = self.get_auth_user()
            if not self.has_admin_access(user):
                self._send_json({"error": "Forbidden"}, 403)
                return
            conn = get_db()
            cursor = conn.cursor()
            if user["role"] == "owner":
                cursor.execute("SELECT * FROM parking_locations ORDER BY id")
            else:
                cursor.execute("SELECT * FROM parking_locations WHERE owner_id = ? ORDER BY id", (user["user_id"],))
            locations = [dict(row) for row in cursor.fetchall()]
            for location in locations:
                if location.get("amenities"):
                    try:
                        location["amenities"] = json.loads(location["amenities"])
                    except (TypeError, json.JSONDecodeError):
                        location["amenities"] = []
            conn.close()
            self._send_json({"locations": locations})
            return

        # ADMIN: Get Owned Garage for currently authenticated admin
        if path == "/api/admin/my-garage":
            user = self.get_auth_user()
            if not self.has_admin_access(user):
                self._send_json({"error": "Forbidden: Admin access required"}, 403)
                return
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM parking_locations WHERE owner_id = ?", (user["user_id"],))
            row = cursor.fetchone()
            if not row:
                conn.close()
                self._send_json({"garage": None})
                return
            garage = dict(row)
            if garage.get("amenities"):
                try:
                    garage["amenities"] = json.loads(garage["amenities"])
                except Exception:
                    garage["amenities"] = []

            cursor.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) as available,
                   SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) as occupied,
                   SUM(CASE WHEN status='reserved' THEN 1 ELSE 0 END) as reserved,
                   SUM(CASE WHEN spot_type='ev_charger' AND status='available' THEN 1 ELSE 0 END) as available_ev_spots
            FROM parking_spots WHERE location_id = ?
            """, (garage["id"],))
            spot_stats = dict(cursor.fetchone())
            garage["total_spots"] = spot_stats.get("total") or garage.get("total_spots", 0)
            garage["available_spots"] = spot_stats.get("available") or 0
            garage["occupied_spots"] = spot_stats.get("occupied") or 0
            garage["reserved_spots"] = spot_stats.get("reserved") or 0
            garage["available_ev_spots"] = spot_stats.get("available_ev_spots") or 0

            cursor.execute("""
            SELECT COUNT(*) as total_bookings,
                   COALESCE(SUM(total_amount), 0) as total_revenue,
                   SUM(CASE WHEN is_ev=1 THEN 1 ELSE 0 END) as ev_bookings
            FROM bookings WHERE location_id = ? AND payment_status = 'paid'
            """, (garage["id"],))
            b_stats = dict(cursor.fetchone())
            garage["total_bookings"] = b_stats.get("total_bookings") or 0
            garage["total_revenue"] = round(b_stats.get("total_revenue") or 0.0, 2)
            garage["ev_bookings"] = b_stats.get("ev_bookings") or 0

            conn.close()
            self._send_json({"garage": garage})
            return

        # ADMIN: Analytics & Dashboard stats (Scoped to Admin's Owned Garage)
        if path == "/api/admin/dashboard":
            user = self.get_auth_user()
            if not self.has_admin_access(user):
                self._send_json({"error": "Forbidden: Admin access required"}, 403)
                return
            conn = get_db()
            cursor = conn.cursor()
            garage_filter = "1 = 1" if user["role"] == "owner" else "l.owner_id = ?"
            params = () if user["role"] == "owner" else (user["user_id"],)
            cursor.execute("SELECT COUNT(*) as count FROM parking_locations l WHERE " + garage_filter, params)
            garage_count = cursor.fetchone()["count"]
            cursor.execute("""
            SELECT COUNT(*) as total,
                   COALESCE(SUM(CASE WHEN s.status='available' THEN 1 ELSE 0 END), 0) as available,
                   COALESCE(SUM(CASE WHEN s.status='occupied' THEN 1 ELSE 0 END), 0) as occupied,
                   COALESCE(SUM(CASE WHEN s.status='reserved' THEN 1 ELSE 0 END), 0) as reserved
            FROM parking_spots s JOIN parking_locations l ON l.id = s.location_id
            WHERE """ + garage_filter, params)
            spot_stats = dict(cursor.fetchone())
            cursor.execute("""
            SELECT COUNT(*) as total_bookings, COALESCE(SUM(b.total_amount), 0) as total_revenue,
                   COALESCE(SUM(CASE WHEN b.is_ev=1 THEN 1 ELSE 0 END), 0) as ev_bookings
            FROM bookings b JOIN parking_locations l ON l.id = b.location_id
            WHERE b.payment_status = 'paid' AND """ + garage_filter, params)
            booking_stats = dict(cursor.fetchone())
            cursor.execute("""
            SELECT COUNT(*) as total_notifications
            FROM email_notifications n JOIN bookings b ON n.booking_id = b.id
            JOIN parking_locations l ON l.id = b.location_id
            WHERE """ + garage_filter, params)
            notification_count = cursor.fetchone()["total_notifications"]
            if user["role"] == "owner":
                cursor.execute("SELECT COUNT(*) as count FROM users")
            else:
                cursor.execute("""
                SELECT COUNT(DISTINCT b.user_id) as count FROM bookings b
                JOIN parking_locations l ON l.id = b.location_id
                WHERE l.owner_id = ?
                """, (user["user_id"],))
            total_users = cursor.fetchone()["count"]

            conn.close()
            self._send_json({
                "stats": {
                    "total_users": total_users,
                    "total_spots": spot_stats["total"] or 0,
                    "available_spots": spot_stats["available"] or 0,
                    "occupied_spots": spot_stats["occupied"] or 0,
                    "reserved_spots": spot_stats["reserved"] or 0,
                    "total_bookings": booking_stats["total_bookings"] or 0,
                    "total_revenue": round(booking_stats["total_revenue"] or 0.0, 2),
                    "ev_bookings": booking_stats["ev_bookings"] or 0,
                    "total_notifications": notification_count,
                    "has_garage": garage_count > 0,
                    "garage_id": None,
                    "garage_name": None
                }
            })
            return

        # ADMIN: Get Bookings (Scoped to Admin's Owned Garage)
        if path == "/api/admin/bookings":
            user = self.get_auth_user()
            if not self.has_admin_access(user):
                self._send_json({"error": "Forbidden"}, 403)
                return
            conn = get_db()
            cursor = conn.cursor()
            scope = "1 = 1" if user["role"] == "owner" else "l.owner_id = ?"
            params = () if user["role"] == "owner" else (user["user_id"],)
            cursor.execute("""
            SELECT b.*, l.name as location_name, s.spot_number, s.floor_level, s.spot_type
            FROM bookings b
            JOIN parking_locations l ON b.location_id = l.id
            JOIN parking_spots s ON b.spot_id = s.id
            WHERE """ + scope + """
            ORDER BY b.created_at DESC
            """, params)
            bookings = [dict(b) for b in cursor.fetchall()]
            conn.close()
            self._send_json({"bookings": bookings})
            return

        # ADMIN: Get Spots (Scoped to Admin's Owned Garage)
        if path == "/api/admin/spots":
            user = self.get_auth_user()
            if not self.has_admin_access(user):
                self._send_json({"error": "Forbidden"}, 403)
                return
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT s.*, l.name as location_name
            FROM parking_spots s
            JOIN parking_locations l ON s.location_id = l.id
            WHERE """ + ("1 = 1" if user["role"] == "owner" else "l.owner_id = ?") + """
            ORDER BY s.floor_level ASC, s.spot_number ASC
            """, () if user["role"] == "owner" else (user["user_id"],))
            spots = [dict(s) for s in cursor.fetchall()]
            conn.close()
            self._send_json({"spots": spots})
            return

        # ADMIN: Get All Users
        if path == "/api/admin/users":
            user = self.get_auth_user()
            if not user or user.get("role") != "owner":
                self._send_json({"error": "Forbidden"}, 403)
                return
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT u.id, u.email, u.full_name, u.phone, u.role, u.created_at, u.is_active,
                   l.id AS garage_id, l.name AS garage_name
            FROM users u
            LEFT JOIN parking_locations l ON l.owner_id = u.id
            WHERE u.deleted_at IS NULL
            ORDER BY u.created_at DESC
            """)
            users = [dict(u) for u in cursor.fetchall()]
            for account in users:
                account["is_active"] = bool(account["is_active"])
            conn.close()
            self._send_json({"users": users})
            return

        # ADMIN: Get All Email Dispatches
        if path == "/api/admin/notifications":
            user = self.get_auth_user()
            if not self.has_admin_access(user):
                self._send_json({"error": "Forbidden"}, 403)
                return
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT n.*, b.booking_code, b.vehicle_plate
            FROM email_notifications n
            LEFT JOIN bookings b ON n.booking_id = b.id
            LEFT JOIN parking_locations l ON l.id = b.location_id
            WHERE """ + ("1 = 1" if user["role"] == "owner" else "l.owner_id = ?") + """
            ORDER BY n.sent_at DESC
            """, () if user["role"] == "owner" else (user["user_id"],))
            notifications = [dict(n) for n in cursor.fetchall()]
            conn.close()
            self._send_json({"notifications": notifications})
            return

        self._send_json({"error": "Not Found"}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.parse_body()

        # 1. User Registration
        if path == "/api/auth/register":
            email = str(body.get("email") or "").strip().lower()
            password = body.get("password", "")
            full_name = str(body.get("full_name") or "").strip()
            phone = str(body.get("phone") or "").strip()
            phone_normalized = normalize_phone(phone)
            admin_code = str(body.get("admin_code") or "").strip()

            if not email or not password or not full_name or not phone:
                self._send_json({"error": "Email, password, full name, and phone number are required"}, 400)
                return

            if not phone_normalized:
                self._send_json({"error": "Enter a valid phone number with 7 to 15 digits"}, 400)
                return

            if len(password) < 6:
                self._send_json({"error": "Password must be at least 6 characters"}, 400)
                return

            conn = get_db()
            cursor = conn.cursor()
            conn.execute("BEGIN IMMEDIATE")

            # Check if email taken
            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            if cursor.fetchone():
                conn.close()
                self._send_json({"error": "An account with this email already exists"}, 409)
                return

            cursor.execute("SELECT id FROM users WHERE phone_normalized = ?", (phone_normalized,))
            if cursor.fetchone():
                conn.close()
                self._send_json({"error": "An account with this phone number already exists"}, 409)
                return

            # Role assignment:
            requested_role = body.get("requested_role", "user")
            role = "user"
            if requested_role == "owner":
                if not ADMIN_SECRET_KEY or not hmac.compare_digest(str(admin_code or ""), ADMIN_SECRET_KEY):
                    conn.close()
                    self._send_json({"error": "Invalid owner secret key"}, 403)
                    return
                cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'owner'")
                if cursor.fetchone()["count"]:
                    conn.close()
                    self._send_json({"error": "An owner account already exists. Ask the current owner to assign your account."}, 409)
                    return
                role = "owner"

            hashed_pass, salt = hash_password(password)

            cursor.execute("""
            INSERT INTO users (email, password_hash, salt, full_name, phone, phone_normalized, role)
            VALUES (?, ?, ?, ?, ?, ?, ?);
            """, (email, hashed_pass, salt, full_name, phone, phone_normalized, role))
            conn.commit()

            user_id = cursor.lastrowid
            user_data = {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "phone": phone,
                "role": role
            }
            token = generate_token(user_data)
            conn.close()

            self._send_json({
                "message": "Registration successful",
                "user": user_data,
                "token": token
            }, 201)
            return

        # 2. User Login
        if path == "/api/auth/login":
            identifier = str(body.get("identifier") or body.get("email") or "").strip()
            password = body.get("password", "")

            if not identifier or not password:
                self._send_json({"error": "Email or phone number and password are required"}, 400)
                return

            conn = get_db()
            cursor = conn.cursor()
            if "@" in identifier:
                cursor.execute("SELECT * FROM users WHERE LOWER(email) = ?", (identifier.lower(),))
            else:
                phone_normalized = normalize_phone(identifier)
                cursor.execute(
                    "SELECT * FROM users WHERE phone_normalized = ?",
                    (phone_normalized or "",)
                )
            user = cursor.fetchone()
            conn.close()

            if not user or not verify_password(password, user["password_hash"], user["salt"]):
                self._send_json({"error": "Invalid email or password"}, 401)
                return
            if not user["is_active"] or user["deleted_at"]:
                self._send_json({"error": "This account is blocked or deleted. Contact the owner."}, 403)
                return

            user_data = {
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "phone": user["phone"],
                "role": user["role"]
            }
            token = generate_token(user_data)

            self._send_json({
                "message": "Login successful",
                "user": user_data,
                "token": token
            })
            return

        # 3. Create Booking & Process Payment (Stripe Integration)
        if path == "/api/bookings":
            user = self.get_auth_user()
            if not user:
                self._send_json({"error": "Unauthorized: Please log in to make a reservation"}, 401)
                return

            spot_id = body.get("spot_id")
            location_id = body.get("location_id")
            start_time = body.get("start_time")
            hours = float(body.get("hours", 2))
            vehicle_plate = body.get("vehicle_plate", "").strip().upper()
            vehicle_model = body.get("vehicle_model", "").strip()
            is_ev = 1 if body.get("is_ev", False) else 0
            stripe_token = body.get("stripe_token", "tok_visa")
            card_last4 = body.get("card_last4", "4242")

            if not spot_id or not location_id or not vehicle_plate:
                self._send_json({"error": "Spot, location, and vehicle license plate are required"}, 400)
                return

            conn = get_db()
            cursor = conn.cursor()

            # Verify spot availability
            cursor.execute("SELECT * FROM parking_spots WHERE id = ?", (spot_id,))
            spot = cursor.fetchone()
            if not spot:
                conn.close()
                self._send_json({"error": "Parking spot not found"}, 404)
                return

            if spot["status"] != "available":
                conn.close()
                self._send_json({"error": f"Spot {spot['spot_number']} is currently {spot['status']}. Please choose another spot."}, 409)
                return

            # Verify location
            cursor.execute("SELECT * FROM parking_locations WHERE id = ?", (location_id,))
            location = cursor.fetchone()
            if not location:
                conn.close()
                self._send_json({"error": "Location not found"}, 404)
                return

            # Compute pricing
            base_rate = spot["price_per_hour"]
            total_amount = round(base_rate * hours, 2)
            if is_ev:
                # Add EV charging energy charge flat component
                ev_charging_fee = round(location["ev_rate_kwh"] * 25.0, 2) # approx 25 kWh charge session
                total_amount += ev_charging_fee

            # Payment Processing (Real Stripe or Safe Sandbox Simulation)
            payment_description = f"MY-SLOT reservation {spot['spot_number']} at {location['name']} (Plate {vehicle_plate})"
            pay_success, stripe_payment_id, receipt_url, payment_error = process_stripe_payment(
                total_amount,
                "INR",
                stripe_token,
                payment_description
            )

            if not pay_success:
                conn.close()
                self._send_json({"error": f"Payment failed: {payment_error}"}, 402)
                return

            stripe_intent_id = f"pi_{stripe_payment_id.replace('ch_', '')}"

            # Calculate end time
            now = datetime.utcnow()
            start_dt = now
            if start_time:
                try:
                    start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                except:
                    start_dt = now
            end_dt = start_dt + timedelta(hours=hours)

            booking_code = f"VP-{secrets.token_hex(3).upper()}"
            gate_pin = f"{secrets.randbelow(9000) + 1000}"

            # Record Booking
            cursor.execute("""
            INSERT INTO bookings (
                booking_code, user_id, user_email, user_name, spot_id, location_id,
                start_time, end_time, total_hours, vehicle_plate, vehicle_model,
                is_ev, charger_type, total_amount, payment_status, stripe_payment_id,
                stripe_receipt_url, status, gate_pin
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, 'confirmed', ?);
            """, (
                booking_code, user["user_id"], user["email"], user["full_name"], spot_id, location_id,
                start_dt.isoformat(), end_dt.isoformat(), hours, vehicle_plate, vehicle_model,
                is_ev, spot["ev_charger_type"], total_amount, stripe_payment_id, receipt_url, gate_pin
            ))
            booking_id = cursor.lastrowid

            # Update spot status to 'reserved' in real time
            cursor.execute("UPDATE parking_spots SET status = 'reserved', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (spot_id,))

            # Record Payment in SQL (currency set to INR)
            payment_method_body = body.get('payment_method', 'card')
            upi_id_body = body.get('upi_id') if body.get('upi_id') else None
            if payment_method_body == 'card':
                recorded_method = f"Card (*{card_last4})"
            elif payment_method_body == 'upi_phonepe':
                recorded_method = f"UPI (PhonePe) - {upi_id_body or 'N/A'}"
            elif payment_method_body == 'upi_gpay':
                recorded_method = f"UPI (GPay) - {upi_id_body or 'N/A'}"
            else:
                recorded_method = payment_method_body or f"Card (*{card_last4})"

            cursor.execute("""
            INSERT INTO payments (booking_id, user_id, amount, currency, stripe_payment_intent_id, payment_method, status, receipt_url)
            VALUES (?, ?, ?, ?, ?, ?, 'succeeded', ?);
            """, (booking_id, user["user_id"], total_amount, 'INR', stripe_intent_id, recorded_method, receipt_url))

            # Generate and Record Email Notification
            email_subject = f"Booking Confirmed: Spot {spot['spot_number']} at {location['name']} (Pass #{booking_code})"
            email_html = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
                <div style="background: linear-gradient(135deg, #0284c7, #2563eb); padding: 32px 24px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: -0.5px;">MY-SLOT Reservation Confirmed</h1>
                    <p style="margin: 8px 0 0 0; color: #e0f2fe; font-size: 14px;">Your spot is locked and ready for entry</p>
                </div>
                
                <div style="padding: 24px;">
                    <div style="background: #1e293b; border-radius: 12px; padding: 20px; text-align: center; border: 1px dashed #38bdf8; margin-bottom: 24px;">
                        <span style="font-size: 12px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px;">Gate Entry PIN</span>
                        <div style="font-size: 36px; font-weight: 800; color: #38bdf8; letter-spacing: 4px; margin: 6px 0;">{gate_pin}</div>
                        <span style="font-size: 13px; color: #cbd5e1;">Booking Ref: <strong>{booking_code}</strong></span>
                    </div>

                    <h3 style="color: #38bdf8; font-size: 16px; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-top: 0;">Reservation Details</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                        <tr><td style="padding: 8px 0; color: #94a3b8;">Location:</td><td style="padding: 8px 0; font-weight: 600; text-align: right; color: #ffffff;">{location['name']}</td></tr>
                        <tr><td style="padding: 8px 0; color: #94a3b8;">Address:</td><td style="padding: 8px 0; text-align: right; color: #cbd5e1;">{location['address']}, {location['city']}</td></tr>
                        <tr><td style="padding: 8px 0; color: #94a3b8;">Spot Number:</td><td style="padding: 8px 0; font-weight: 700; text-align: right; color: #10b981;">{spot['spot_number']} ({spot['floor_level']})</td></tr>
                        <tr><td style="padding: 8px 0; color: #94a3b8;">Spot Type:</td><td style="padding: 8px 0; text-align: right; color: #cbd5e1;">{spot['spot_type'].capitalize()} {'- ' + spot['ev_charger_type'] if is_ev else ''}</td></tr>
                        <tr><td style="padding: 8px 0; color: #94a3b8;">Vehicle Plate:</td><td style="padding: 8px 0; font-weight: 600; text-align: right; color: #ffffff;">{vehicle_plate} ({vehicle_model})</td></tr>
                        <tr><td style="padding: 8px 0; color: #94a3b8;">Time Window:</td><td style="padding: 8px 0; text-align: right; color: #cbd5e1;">{start_dt.strftime('%b %d, %H:%M')} – {end_dt.strftime('%H:%M')} ({hours} hrs)</td></tr>
                    </table>

                    <h3 style="color: #38bdf8; font-size: 16px; border-bottom: 1px solid #334155; padding-bottom: 8px;">Payment Receipt</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
                        <tr><td style="padding: 6px 0; color: #94a3b8;">Payment Method:</td><td style="padding: 6px 0; text-align: right; color: #cbd5e1;">Stripe (Card ending {card_last4})</td></tr>
                        <tr><td style="padding: 6px 0; color: #94a3b8;">Transaction ID:</td><td style="padding: 6px 0; text-align: right; color: #94a3b8; font-family: monospace;">{stripe_payment_id}</td></tr>
                        <tr style="border-top: 1px solid #334155;"><td style="padding: 10px 0; font-weight: 700; color: #ffffff; font-size: 16px;">Total Paid:</td><td style="padding: 10px 0; font-weight: 700; text-align: right; color: #10b981; font-size: 18px;">₹{total_amount:.2f}</td></tr>
                    </table>

                    <div style="background: #1e293b; border-radius: 8px; padding: 14px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                        Tip: Scan your QR pass or type PIN <strong>{gate_pin}</strong> at the barrier keypad. Directions: <a href="https://maps.google.com/?q={location['latitude']},{location['longitude']}" style="color: #38bdf8; text-decoration: underline;">Open in GPS Maps</a>.
                    </div>
                </div>
            </div>
            """

            # Dispatch email (Real SMTP if configured or simulated fallback)
            mail_status, mail_err = send_email_notification(
                user["email"],
                user["full_name"],
                email_subject,
                email_html
            )

            cursor.execute("""
            INSERT INTO email_notifications (booking_id, recipient_email, recipient_name, subject, body_html, status)
            VALUES (?, ?, ?, ?, ?, ?);
            """, (booking_id, user["email"], user["full_name"], email_subject, email_html, mail_status))

            conn.commit()
            conn.close()

            self._send_json({
                "message": "Reservation confirmed and payment succeeded via Stripe",
                "booking": {
                    "id": booking_id,
                    "booking_code": booking_code,
                    "gate_pin": gate_pin,
                    "spot_number": spot["spot_number"],
                    "floor_level": spot["floor_level"],
                    "location_name": location["name"],
                    "location_address": location["address"],
                    "start_time": start_dt.isoformat(),
                    "end_time": end_dt.isoformat(),
                    "total_amount": total_amount,
                    "stripe_payment_id": stripe_payment_id,
                    "email_sent_to": user["email"]
                }
            }, 201)
            return

        # ADMIN: Update Parking Spot Status / Availability / Price (Secured to Admin's Garage)
        if path.startswith("/api/admin/spots/") and path.endswith("/status"):
            user = self.get_auth_user()
            if not self.has_admin_access(user):
                self._send_json({"error": "Forbidden: Admin access required"}, 403)
                return
            spot_id = path.split("/")[4]
            new_status = body.get("status")
            price_per_hour = body.get("price_per_hour")
            ev_power_kw = body.get("ev_power_kw")

            conn = get_db()
            cursor = conn.cursor()

            # Security check: Ensure spot belongs to this admin's owned garage
            cursor.execute("""
            SELECT s.id, s.location_id, l.owner_id
            FROM parking_spots s
            JOIN parking_locations l ON s.location_id = l.id
            WHERE s.id = ?
            """, (spot_id,))
            spot_rec = cursor.fetchone()
            if not spot_rec:
                conn.close()
                self._send_json({"error": "Spot not found"}, 404)
                return

            if not self.can_manage_location(user, spot_rec["owner_id"]):
                conn.close()
                self._send_json({"error": "Security Forbidden: You can only modify spots in your own managed garage."}, 403)
                return

            query_parts = []
            params = []
            if new_status:
                query_parts.append("status = ?")
                params.append(new_status)
            if price_per_hour is not None:
                query_parts.append("price_per_hour = ?")
                params.append(float(price_per_hour))
            if ev_power_kw is not None:
                query_parts.append("ev_power_kw = ?")
                params.append(float(ev_power_kw))

            if not query_parts:
                conn.close()
                self._send_json({"error": "No updates specified"}, 400)
                return

            params.append(spot_id)
            cursor.execute(f"UPDATE parking_spots SET {', '.join(query_parts)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", params)
            conn.commit()
            conn.close()

            self._send_json({"message": "Spot updated successfully"})
            return

        # ADMIN: Update Booking Status (e.g. Check-in, Check-out, Cancel) (Secured to Admin's Garage)
        if path.startswith("/api/admin/bookings/") and path.endswith("/status"):
            user = self.get_auth_user()
            if not self.has_admin_access(user):
                self._send_json({"error": "Forbidden"}, 403)
                return
            booking_id = path.split("/")[4]
            new_status = body.get("status") # 'active' (checked in), 'completed', 'cancelled'

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT b.spot_id, b.location_id, l.owner_id
            FROM bookings b
            JOIN parking_locations l ON b.location_id = l.id
            WHERE b.id = ?
            """, (booking_id,))
            booking = cursor.fetchone()
            if not booking:
                conn.close()
                self._send_json({"error": "Booking not found"}, 404)
                return

            if not self.can_manage_location(user, booking["owner_id"]):
                conn.close()
                self._send_json({"error": "Security Forbidden: Booking is for another administrator's garage."}, 403)
                return

            cursor.execute("UPDATE bookings SET status = ? WHERE id = ?", (new_status, booking_id))

            # Synchronize spot status
            if new_status == "active":
                cursor.execute("UPDATE parking_spots SET status = 'occupied' WHERE id = ?", (booking["spot_id"],))
            elif new_status in ("completed", "cancelled"):
                cursor.execute("UPDATE parking_spots SET status = 'available' WHERE id = ?", (booking["spot_id"],))

            conn.commit()
            conn.close()
            self._send_json({"message": f"Booking status updated to {new_status}"})
            return

        # ADMIN: Add New Parking Spot (Attached to Admin's Owned Garage)
        if path == "/api/admin/spots":
            user = self.get_auth_user()
            if not self.has_admin_access(user):
                self._send_json({"error": "Forbidden"}, 403)
                return

            conn = get_db()
            cursor = conn.cursor()
            if user["role"] == "owner":
                location_id = body.get("location_id")
                if not location_id:
                    conn.close()
                    self._send_json({"error": "A garage is required for the new spot"}, 400)
                    return
                cursor.execute("SELECT id FROM parking_locations WHERE id = ?", (location_id,))
                target_location = cursor.fetchone()
            else:
                cursor.execute("SELECT id FROM parking_locations WHERE owner_id = ?", (user["user_id"],))
                target_location = cursor.fetchone()
                location_id = target_location["id"] if target_location else None
            if not target_location:
                conn.close()
                self._send_json({"error": "No assigned garage is available for this operation"}, 403)
                return

            spot_number = body.get("spot_number")
            floor_level = body.get("floor_level", "Level 1")
            spot_type = body.get("spot_type", "regular")
            ev_charger_type = body.get("ev_charger_type", "None")
            ev_power_kw = float(body.get("ev_power_kw", 0))
            price_per_hour = float(body.get("price_per_hour", 80.0))

            cursor.execute("""
            INSERT INTO parking_spots (location_id, spot_number, floor_level, spot_type, ev_charger_type, ev_power_kw, status, price_per_hour)
            VALUES (?, ?, ?, ?, ?, ?, 'available', ?);
            """, (location_id, spot_number, floor_level, spot_type, ev_charger_type, ev_power_kw, price_per_hour))
            conn.commit()
            new_id = cursor.lastrowid
            conn.close()
            self._send_json({"message": "Spot created", "id": new_id}, 201)
            return

        # Only the owner can assign or remove a garage administrator.
        if path.startswith("/api/admin/users/") and path.endswith("/role"):
            user = self.get_auth_user()
            if not user or user.get("role") != "owner":
                self._send_json({"error": "Forbidden"}, 403)
                return
            target_user_id = path.split("/")[4]
            new_role = body.get("role", "user")
            if new_role not in ("user", "admin"):
                self._send_json({"error": "Invalid role"}, 400)
                return

            conn = get_db()
            cursor = conn.cursor()
            conn.execute("BEGIN IMMEDIATE")
            if str(target_user_id) == str(user["user_id"]):
                conn.close()
                self._send_json({"error": "The owner account cannot be changed here"}, 403)
                return
            cursor.execute("SELECT id, role, is_active, deleted_at FROM users WHERE id = ?", (target_user_id,))
            target_user = cursor.fetchone()
            if not target_user:
                conn.close()
                self._send_json({"error": "User not found"}, 404)
                return
            if target_user["role"] == "owner":
                conn.close()
                self._send_json({"error": "Owner accounts cannot be changed here"}, 403)
                return
            if not target_user["is_active"] or target_user["deleted_at"]:
                conn.close()
                self._send_json({"error": "Unblock this account before assigning an admin role"}, 409)
                return

            if new_role == "admin":
                garage_id = body.get("garage_id")
                if not garage_id:
                    conn.close()
                    self._send_json({"error": "Select a garage for this administrator"}, 400)
                    return
                cursor.execute("SELECT id, owner_id FROM parking_locations WHERE id = ?", (garage_id,))
                garage = cursor.fetchone()
                if not garage:
                    conn.close()
                    self._send_json({"error": "Garage not found"}, 404)
                    return
                if garage["owner_id"] is not None and str(garage["owner_id"]) != str(target_user_id):
                    conn.close()
                    self._send_json({"error": "This garage is already assigned to another administrator"}, 409)
                    return
                cursor.execute("UPDATE parking_locations SET owner_id = NULL WHERE owner_id = ?", (target_user_id,))
                cursor.execute("UPDATE parking_locations SET owner_id = ? WHERE id = ?", (target_user_id, garage_id))
            else:
                cursor.execute("UPDATE parking_locations SET owner_id = NULL WHERE owner_id = ?", (target_user_id,))
            cursor.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, target_user_id))
            conn.commit()
            conn.close()
            self._send_json({"message": f"User role updated to {new_role}"})
            return

        # Owner-only account suspension; suspending an admin also releases its garage.
        if path.startswith("/api/admin/users/") and path.endswith("/status"):
            user = self.get_auth_user()
            if not user or user.get("role") != "owner":
                self._send_json({"error": "Forbidden"}, 403)
                return
            target_user_id = path.split("/")[4]
            is_active = body.get("is_active")
            if not isinstance(is_active, bool):
                self._send_json({"error": "is_active must be true or false"}, 400)
                return
            if str(target_user_id) == str(user["user_id"]):
                self._send_json({"error": "The owner account cannot be blocked here"}, 403)
                return
            conn = get_db()
            cursor = conn.cursor()
            conn.execute("BEGIN IMMEDIATE")
            cursor.execute("SELECT role, deleted_at FROM users WHERE id = ?", (target_user_id,))
            target = cursor.fetchone()
            if not target:
                conn.close()
                self._send_json({"error": "User not found"}, 404)
                return
            if target["role"] == "owner" or target["deleted_at"]:
                conn.close()
                self._send_json({"error": "Owner or deleted accounts cannot be changed here"}, 403)
                return
            cursor.execute("UPDATE users SET is_active = ? WHERE id = ?", (int(is_active), target_user_id))
            if not is_active:
                cursor.execute("UPDATE parking_locations SET owner_id = NULL WHERE owner_id = ?", (target_user_id,))
            conn.commit()
            conn.close()
            self._send_json({"message": "Account unblocked" if is_active else "Account blocked"})
            return

        # ADMIN: Claim an Unassigned Facility as Admin's Sole Garage
        if path == "/api/admin/locations/claim":
            self._send_json({"error": "Garages can only be assigned by the owner"}, 403)
            return

        # ADMIN: Add New Parking Garage / Facility (Enforces strictly ONE garage per admin)
        if path == "/api/admin/locations":
            user = self.get_auth_user()
            if not user or user.get("role") != "owner":
                self._send_json({"error": "Only the owner can create garages"}, 403)
                return

            conn = get_db()
            cursor = conn.cursor()

            name = body.get("name", "").strip()
            address = body.get("address", "").strip()
            city = body.get("city", "").strip()
            latitude = float(body.get("latitude", 28.6315))
            longitude = float(body.get("longitude", 77.2167))
            total_spots = int(body.get("total_spots", 60))
            ev_spots = int(body.get("ev_spots", 20))
            hourly_rate = float(body.get("hourly_rate", 80.0))
            ev_rate_kwh = float(body.get("ev_rate_kwh", 14.0))
            amenities = body.get("amenities", [])
            if isinstance(amenities, list):
                amenities_json = json.dumps(amenities)
            else:
                amenities_json = json.dumps([a.strip() for a in str(amenities).split(",") if a.strip()])
            image_url = body.get("image_url", "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80")

            if not name or not address or not city:
                conn.close()
                self._send_json({"error": "Garage name, address, and city are required"}, 400)
                return

            cursor.execute("""
            INSERT INTO parking_locations (name, address, city, latitude, longitude, total_spots, ev_spots, hourly_rate, ev_rate_kwh, amenities, image_url, owner_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (name, address, city, latitude, longitude, total_spots, ev_spots, hourly_rate, ev_rate_kwh, amenities_json, image_url, None))
            loc_id = cursor.lastrowid

            seed_spots_for_location(cursor, loc_id, hourly_rate, total_spots, ev_spots)
            conn.commit()

            cursor.execute("SELECT * FROM parking_locations WHERE id = ?", (loc_id,))
            created_loc = dict(cursor.fetchone())
            try:
                created_loc["amenities"] = json.loads(created_loc["amenities"])
            except:
                created_loc["amenities"] = []
            conn.close()

            self._send_json({"message": "Garage registered and bound to your account successfully", "id": loc_id, "location": created_loc}, 201)
            return

        # ADMIN: Update Parking Garage (via POST /api/admin/locations/:id)
        if path.startswith("/api/admin/locations/") and not path.endswith("/delete"):
            user = self.get_auth_user()
            if not self.has_admin_access(user):
                self._send_json({"error": "Forbidden: Admin access required"}, 403)
                return
            loc_id = path.split("/")[4]
            self._handle_update_location(loc_id, body)
            return

        # ADMIN: Delete Parking Garage (via POST /api/admin/locations/:id/delete)
        if path.startswith("/api/admin/locations/") and path.endswith("/delete"):
            user = self.get_auth_user()
            if not user or user.get("role") != "owner":
                self._send_json({"error": "Forbidden: Admin access required"}, 403)
                return
            loc_id = path.split("/")[4]
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM parking_locations WHERE id = ?", (loc_id,))
            target = cursor.fetchone()
            if not target:
                conn.close()
                self._send_json({"error": "Garage not found"}, 404)
                return
            cursor.execute("DELETE FROM parking_spots WHERE location_id = ?", (loc_id,))
            cursor.execute("DELETE FROM bookings WHERE location_id = ?", (loc_id,))
            cursor.execute("DELETE FROM parking_locations WHERE id = ?", (loc_id,))
            conn.commit()
            conn.close()
            self._send_json({"message": "Garage deleted successfully"})
            return

        # User Cancel own booking
        if path.startswith("/api/bookings/") and path.endswith("/cancel"):
            user = self.get_auth_user()
            if not user:
                self._send_json({"error": "Unauthorized"}, 401)
                return
            booking_id = path.split("/")[3]
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM bookings WHERE id = ? AND user_id = ?", (booking_id, user["user_id"]))
            b = cursor.fetchone()
            if not b:
                conn.close()
                self._send_json({"error": "Booking not found or not owned by user"}, 404)
                return

            cursor.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", (booking_id,))
            cursor.execute("UPDATE parking_spots SET status = 'available' WHERE id = ?", (b["spot_id"],))
            conn.commit()
            conn.close()
            self._send_json({"message": "Reservation cancelled successfully"})
            return

        self._send_json({"error": "Not Found"}, 404)

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.parse_body()

        if path.startswith("/api/admin/locations/"):
            user = self.get_auth_user()
            if not self.has_admin_access(user):
                self._send_json({"error": "Forbidden: Admin access required"}, 403)
                return
            loc_id = path.split("/")[4]
            self._handle_update_location(loc_id, body)
            return

        self._send_json({"error": "Not Found"}, 404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/admin/users/"):
            user = self.get_auth_user()
            if not user or user.get("role") != "owner":
                self._send_json({"error": "Forbidden"}, 403)
                return
            target_user_id = path.split("/")[4]
            if not target_user_id.isdigit():
                self._send_json({"error": "Invalid user ID"}, 400)
                return
            if str(target_user_id) == str(user["user_id"]):
                self._send_json({"error": "The owner account cannot be deleted here"}, 403)
                return

            conn = get_db()
            cursor = conn.cursor()
            conn.execute("BEGIN IMMEDIATE")
            cursor.execute("SELECT role, deleted_at FROM users WHERE id = ?", (target_user_id,))
            target = cursor.fetchone()
            if not target:
                conn.close()
                self._send_json({"error": "User not found"}, 404)
                return
            if target["role"] == "owner":
                conn.close()
                self._send_json({"error": "Owner accounts cannot be deleted here"}, 403)
                return
            if target["deleted_at"]:
                conn.close()
                self._send_json({"error": "This account has already been deleted"}, 409)
                return

            anonymized_email = f"deleted-user-{target_user_id}@deleted.invalid"
            cursor.execute("UPDATE parking_locations SET owner_id = NULL WHERE owner_id = ?", (target_user_id,))
            cursor.execute("""
            UPDATE bookings
            SET user_email = ?, user_name = 'Deleted User', vehicle_plate = 'REDACTED',
                vehicle_model = 'REDACTED', gate_pin = 'REDACTED'
            WHERE user_id = ?
            """, (anonymized_email, target_user_id))
            cursor.execute("""
            UPDATE email_notifications
            SET recipient_email = ?, recipient_name = 'Deleted User',
                subject = 'Booking notification (customer details removed)',
                body_html = 'Customer details removed by the owner.'
            WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = ?)
            """, (anonymized_email, target_user_id))
            cursor.execute("""
            UPDATE users
            SET email = ?, password_hash = ?, salt = ?, full_name = 'Deleted User',
                phone = NULL, phone_normalized = NULL, role = 'user', is_active = 0,
                deleted_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """, (anonymized_email, secrets.token_hex(32), secrets.token_hex(16), target_user_id))
            conn.commit()
            conn.close()
            self._send_json({"message": "Account deleted and customer details anonymized; booking/payment history was retained"})
            return

        if path.startswith("/api/admin/locations/"):
            user = self.get_auth_user()
            if not user or user.get("role") != "owner":
                self._send_json({"error": "Forbidden: Admin access required"}, 403)
                return
            loc_id = path.split("/")[4]
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM parking_locations WHERE id = ?", (loc_id,))
            target = cursor.fetchone()
            if not target:
                conn.close()
                self._send_json({"error": "Garage not found"}, 404)
                return
            cursor.execute("DELETE FROM parking_spots WHERE location_id = ?", (loc_id,))
            cursor.execute("DELETE FROM bookings WHERE location_id = ?", (loc_id,))
            cursor.execute("DELETE FROM parking_locations WHERE id = ?", (loc_id,))
            conn.commit()
            conn.close()
            self._send_json({"message": "Garage deleted successfully"})
            return

        self._send_json({"error": "Not Found"}, 404)

    def _handle_update_location(self, loc_id, body):
        user = self.get_auth_user()
        if not self.has_admin_access(user):
            self._send_json({"error": "Forbidden: Admin access required"}, 403)
            return

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM parking_locations WHERE id = ?", (loc_id,))
        loc = cursor.fetchone()
        if not loc:
            conn.close()
            self._send_json({"error": "Garage location not found"}, 404)
            return

        if not self.can_manage_location(user, loc["owner_id"]):
            conn.close()
            self._send_json({"error": "Security Forbidden: You can only update your own managed garage."}, 403)
            return

        name = body.get("name", loc["name"])
        address = body.get("address", loc["address"])
        city = body.get("city", loc["city"])
        latitude = float(body.get("latitude", loc["latitude"]))
        longitude = float(body.get("longitude", loc["longitude"]))
        total_spots = int(body.get("total_spots", loc["total_spots"]))
        ev_spots = int(body.get("ev_spots", loc["ev_spots"]))
        hourly_rate = float(body.get("hourly_rate", loc["hourly_rate"]))
        ev_rate_kwh = float(body.get("ev_rate_kwh", loc["ev_rate_kwh"]))
        amenities = body.get("amenities")
        if amenities is not None:
            if isinstance(amenities, list):
                amenities_json = json.dumps(amenities)
            else:
                amenities_json = json.dumps([a.strip() for a in str(amenities).split(",") if a.strip()])
        else:
            amenities_json = loc["amenities"]
        image_url = body.get("image_url", loc["image_url"])

        cursor.execute("""
        UPDATE parking_locations SET
            name = ?, address = ?, city = ?, latitude = ?, longitude = ?,
            total_spots = ?, ev_spots = ?, hourly_rate = ?, ev_rate_kwh = ?,
            amenities = ?, image_url = ?
        WHERE id = ?;
        """, (name, address, city, latitude, longitude, total_spots, ev_spots, hourly_rate, ev_rate_kwh, amenities_json, image_url, loc_id))

        if hourly_rate != loc["hourly_rate"]:
            cursor.execute("""
            UPDATE parking_spots SET price_per_hour = ? WHERE location_id = ? AND spot_type = 'regular';
            """, (hourly_rate, loc_id))
            cursor.execute("""
            UPDATE parking_spots SET price_per_hour = ? WHERE location_id = ? AND spot_type = 'ev_charger';
            """, (hourly_rate + 20.0, loc_id))

        conn.commit()

        cursor.execute("SELECT * FROM parking_locations WHERE id = ?", (loc_id,))
        updated = dict(cursor.fetchone())
        if updated.get("amenities"):
            try:
                updated["amenities"] = json.loads(updated["amenities"])
            except:
                updated["amenities"] = []
        conn.close()

        self._send_json({"message": "Garage updated successfully", "location": updated})

def run_server():
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), MySlotRequestHandler)
    server.daemon_threads = True
    print(f"[MY-SLOT Python Backend] Multi-threaded server listening on port {PORT} with SQLite database at {DB_PATH}", flush=True)

    if STRIPE_SECRET_KEY and STRIPE_SECRET_KEY.startswith("sk_"):
        print("[MY-SLOT Python Backend] Payment: Real Stripe API is ACTIVE", flush=True)
    else:
        print("[MY-SLOT Python Backend] Payment: Sandbox simulation mode is ACTIVE (Set STRIPE_SECRET_KEY for live Stripe)", flush=True)

    if SMTP_HOST:
        print(f"[MY-SLOT Python Backend] Emails: Real SMTP delivery ACTIVE via {SMTP_HOST}:{SMTP_PORT}", flush=True)
    else:
        print("[MY-SLOT Python Backend] Emails: Local simulation mode is ACTIVE (Set SMTP_HOST for live emails)", flush=True)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == "__main__":
    run_server()
