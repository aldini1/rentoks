-- Tabela për blokimet manuale të disponueshmërisë
-- Ekzekuto këtë në Railway PostgreSQL console (ose psql) njëherë.

CREATE TABLE IF NOT EXISTS availability_blocks (
  id          SERIAL PRIMARY KEY,
  vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  reason      VARCHAR(200),
  created_at  TIMESTAMP DEFAULT NOW(),

  -- Pengon bllokime të dyfishta për të njëjtën veturë + datë
  UNIQUE (vehicle_id, date)
);

-- Indeks për query-t sipas business_id + datës
CREATE INDEX IF NOT EXISTS idx_blocks_business_date
  ON availability_blocks (business_id, date);
