CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    -- Application
    api_key TEXT UNIQUE,
    tier INTEGER NOT NULL,
    -- Identification data
    nip TEXT NOT NULL CHECK (length(nip) = 10 AND nip NOT GLOB '*[^0-9]*'),
    regon TEXT CHECK (regon IS NULL OR (length(regon) = 9 AND regon NOT GLOB '*[^0-9]*')),
    bdo TEXT,  -- Number in the Waste Database. The information will appear on the invoices
    fist_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    company_name TEXT,
    company_logo BLOB,
    -- Address details
    country TEXT NOT NULL DEFAULT 'Poland',
    voivodeship TEXT NOT NULL,
    county TEXT NOT NULL,
    commune TEXT NOT NULL,
    town TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    street TEXT,
    building_number TEXT NOT NULL,
    apartment_number TEXT,
    phone_number TEXT,  -- The information will appear on the invoices
    display_email_on_ksef_invoices BOOLEAN NOT NULL DEFAULT FALSE,
    -- Billing data
    settlement_type TEXT NOT NULL CHECK (settlement_type IN ('monthly', 'quarterly')),
    cash_method BOOLEAN NOT NULL DEFAULT FALSE,  -- Default billing of invoices - MK
    bank_account_number TEXT CHECK (bank_account_number IS NULL OR (length(bank_account_number) = 26 AND bank_account_number NOT GLOB '*[^0-9]*')),  -- The information will appear on the invoices
    tax_office TEXT,  -- Name and code
    -- DBA
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
);
-- Create admin user
INSERT INTO users VALUES (
    'drexa1@hotmail.com',
    -- Application
    NULL,
    0,
     -- Identification data
    '6751577878',
    NULL,
    NULL,
    'Diego',
    'Ruiz Barbero',
    DATE('1983-07-16'),
    'Diego Ruiz Barbero Software Engineering & Data Science',
    NULL,
    'Poland',
    'małopolskie',
    'Kraków',
    'Kraków',
    'Kraków',
    '30-638',
    NULL,
    '15',
    '32',
    NULL,
    FALSE,
     -- Billing data
    'monthly',
    FALSE,
    NULL,
    'URZĄD SKARBOWY KRAKÓW-PODGÓRZE (1210)',
     -- DBA
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