-- ============================================
-- RENTOKS DATABASE SCHEMA
-- Run this in Railway PostgreSQL console
-- ============================================

-- Users (klientët)
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  phone       VARCHAR(30),
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20) DEFAULT 'client',  -- 'client' | 'admin'
  is_verified BOOLEAN DEFAULT false,
  avatar_url  VARCHAR(500),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- Businesses (agjencitë)
CREATE TABLE IF NOT EXISTS businesses (
  id            SERIAL PRIMARY KEY,
  owner_name    VARCHAR(200) NOT NULL,
  business_name VARCHAR(200) NOT NULL,
  nuis          VARCHAR(50) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(30),
  password      VARCHAR(255) NOT NULL,
  city          VARCHAR(100),
  address       VARCHAR(300),
  fleet_size    INTEGER DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected' | 'suspended'
  is_verified   BOOLEAN DEFAULT false,
  logo_url      VARCHAR(500),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Vehicles (veturët)
CREATE TABLE IF NOT EXISTS vehicles (
  id            SERIAL PRIMARY KEY,
  business_id   INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  brand         VARCHAR(100) NOT NULL,
  model         VARCHAR(100) NOT NULL,
  year          INTEGER,
  fuel          VARCHAR(50),
  transmission  VARCHAR(50),
  seats         INTEGER DEFAULT 5,
  category      VARCHAR(50),  -- 'Ekonomike' | 'SUV' | 'Premium' | 'Van'
  price_per_day DECIMAL(10,2) NOT NULL,
  location      VARCHAR(200),
  city          VARCHAR(100),
  license_plate VARCHAR(30),
  features      TEXT,  -- JSON array si string
  description   TEXT,
  status        VARCHAR(20) DEFAULT 'active',  -- 'active' | 'inactive' | 'maintenance'
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Bookings (rezervimet)
CREATE TABLE IF NOT EXISTS bookings (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id),
  vehicle_id   INTEGER REFERENCES vehicles(id),
  business_id  INTEGER REFERENCES businesses(id),
  from_date    DATE NOT NULL,
  to_date      DATE NOT NULL,
  days         INTEGER NOT NULL,
  price_per_day DECIMAL(10,2) NOT NULL,
  total        DECIMAL(10,2) NOT NULL,
  commission   DECIMAL(10,2) NOT NULL,  -- 10%
  net_amount   DECIMAL(10,2) NOT NULL,  -- 90%
  payment_type VARCHAR(20) DEFAULT 'cash',  -- 'cash' | 'card'
  status       VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- Reviews (vlerësimet)
CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER REFERENCES bookings(id),
  user_id     INTEGER REFERENCES users(id),
  business_id INTEGER REFERENCES businesses(id),
  vehicle_id  INTEGER REFERENCES vehicles(id),
  rating      INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Indexes për performance
CREATE INDEX IF NOT EXISTS idx_bookings_user     ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_business ON bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status   ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_business ON vehicles(business_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_city     ON vehicles(city);
CREATE INDEX IF NOT EXISTS idx_vehicles_status   ON vehicles(status);
