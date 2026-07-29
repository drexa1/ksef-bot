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
    -- Address
    country_code TEXT DEFAULT 'PL',
    address TEXT NOT NULL,
    -- Counterparty metadata
    local_government_unit INTEGER NOT NULL,
    vat_group INTEGER NOT NULL,
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