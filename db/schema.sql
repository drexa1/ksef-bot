CREATE TABLE IF NOT EXISTS users (
    -- User data
    email TEXT PRIMARY KEY,
    name TEXT,
    api_key TEXT UNIQUE,
    tier INTEGER NOT NULL,
    -- DBA
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
);
-- Create admin user
INSERT INTO users VALUES (
  'drexa1@hotmail.com',
  'Diego Ruiz',
  NULL,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    -- Owner
    owner_id TEXT NOT NULL REFERENCES users(email),
    -- Parties
    seller_id TEXT NOT NULL REFERENCES counterparties(id),
    buyer_id  TEXT NOT NULL REFERENCES counterparties(id),
    -- Raw data
    country_code TEXT DEFAULT 'PL',
    raw_xml  TEXT NOT NULL,
    json_data TEXT NOT NULL CHECK (json_valid(json_data)),
    notes TEXT,
    -- DBA
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS counterparties (
    id TEXT PRIMARY KEY,
    -- Owner
    owner_id TEXT NOT NULL REFERENCES users(email),
    -- Counterparty data
    name TEXT NOT NULL,
    nip TEXT UNIQUE,
    pesel TEXT UNIQUE,
    regon TEXT UNIQUE,
    internal_identifier TEXT UNIQUE,
    -- Address
    country_code TEXT DEFAULT 'PL',
    address_l1 TEXT NOT NULL,
    address_l2 TEXT,
    -- Counterparty metadata
    local_government_unit INTEGER,
    vat_group INTEGER,
    notes TEXT,
    -- DBA
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS taxes (
  id TEXT PRIMARY KEY,
  -- Owner
  owner_id TEXT NOT NULL REFERENCES users(email),
  -- Tax record
  period TEXT,
  brut_income REAL NOT NULL,
  vat_percentage REAL DEFAULT 23,
  vat_amount REAL NOT NULL,
  net_before_obligations REAL NOT NULL,
  -- Obligations
  tax_rate REAL DEFAULT 12,
  income_tax REAL NOT NULL,
  health_insurance_base REAL DEFAULT 5537.18,
  health_insurance_rate REAL DEFAULT 9,
  health_contribution REAL NOT NULL,
  -- Total after obligations
  total_clean_revenue REAL NOT NULL,
  notes TEXT,
    -- DBA
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);