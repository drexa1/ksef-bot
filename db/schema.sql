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
    -- Owner
    user_id TEXT NOT NULL REFERENCES users(id),
    -- Counterparty data
    name TEXT NOT NULL,
    nip TEXT,
    pesel TEXT,
    regon TEXT,
    internal_identifier TEXT,
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
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    -- Owner
    user_id TEXT NOT NULL REFERENCES users(id),
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
) WITHOUT ROWID;