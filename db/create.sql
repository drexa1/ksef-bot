CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    api_key TEXT,
    -- DBA
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
)  WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS counterparties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    -- Counterparty data
    nip TEXT,
    pesel TEXT,
    regon TEXT,
    internal_identifier TEXT,
    -- Address details
    country TEXT DEFAULT 'Poland',
    voivodeship TEXT,
    county TEXT,
    municipality TEXT,
    town TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    mail TEXT,
    street TEXT,
    building_number TEXT NOT NULL,
    number_of_premises INTEGER,
    -- Contact and billing details
    phone_number TEXT,
    email_address TEXT,
    bank_account_number TEXT,
    notes TEXT,
    -- DBA
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    -- Owner
    user_id TEXT NOT NULL REFERENCES users(id),
    -- Parties
    seller_id TEXT NOT NULL REFERENCES counterparties(id),
    buyer_id  TEXT NOT NULL REFERENCES counterparties(id),
    -- Raw data
    country_code TEXT NOT NULL,
    raw_xml  TEXT NOT NULL,
    json_data TEXT NOT NULL CHECK (json_valid(json_data)),
    -- DBA
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
) WITHOUT ROWID;