CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    -- Application
    apiKey TEXT UNIQUE,
    tier INTEGER NOT NULL,
    -- Identification data
    nip TEXT NOT NULL CHECK (length(nip) = 10 AND nip NOT GLOB '*[^0-9]*'),
    regon TEXT CHECK (regon IS NULL OR (length(regon) = 9 AND regon NOT GLOB '*[^0-9]*')),
    bdo TEXT,  -- Number in the Waste Database. The information will appear on the invoices
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    dateOfBirth DATE NOT NULL CHECK (dateOfBirth GLOB '????-??-??' AND dateOfBirth >= '1900-01-01'),
    companyName TEXT,
    companyLogo BLOB,
    -- Address details
    country TEXT NOT NULL DEFAULT 'Poland',
    voivodeship TEXT NOT NULL,
    county TEXT NOT NULL,
    commune TEXT NOT NULL,
    town TEXT NOT NULL,
    zipCode TEXT NOT NULL,
    street TEXT,
    buildingNumber TEXT NOT NULL,
    apartmentNumber TEXT,
    phoneNumber TEXT,  -- The information will appear on the invoices
    displayEmailOnKsefInvoices BOOLEAN NOT NULL DEFAULT FALSE,
    -- Billing data
    settlementType TEXT NOT NULL CHECK (settlementType IN ('monthly', 'quarterly')),
    cashMethod BOOLEAN NOT NULL DEFAULT FALSE,  -- Default billing of invoices - MK
    bankAccountNumber TEXT CHECK (bankAccountNumber IS NULL OR (length(bankAccountNumber) = 26 AND bankAccountNumber NOT GLOB '*[^0-9]*')),  -- The information will appear on the invoices
    taxOffice TEXT,  -- Name and code
    -- DBA
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT
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
    ownerId TEXT NOT NULL REFERENCES users(email),
    -- Parties
    sellerId TEXT NOT NULL REFERENCES counterparties(id),
    buyerId  TEXT NOT NULL REFERENCES counterparties(id),
    -- Raw data
    rawXml  TEXT NOT NULL,
    jsonData TEXT NOT NULL CHECK (json_valid(jsonData)),
    notes TEXT,
    -- DBA
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS counterparties (
    id TEXT PRIMARY KEY,
    -- Owner
    ownerId TEXT NOT NULL REFERENCES users(email),
    -- Counterparty data
    name TEXT NOT NULL,
    nip TEXT UNIQUE,
    pesel TEXT UNIQUE,
    regon TEXT UNIQUE,
    internalIdentifier TEXT UNIQUE,
    -- Address
    countryCode TEXT DEFAULT 'PL',
    address_L1 TEXT NOT NULL,
    addressL2 TEXT,
    -- Counterparty metadata
    localGovernmentUnit INTEGER,
    vatGroup INTEGER,
    notes TEXT,
    -- DBA
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS taxes (
    "from" DATE,
    "to" DATE,
    -- Owner
    ownerId TEXT NOT NULL REFERENCES users(email),
    -- Tax record
    brutIncome REAL NOT NULL,
    -- VAT
    vatPercentage REAL DEFAULT 23,
    vatAmount REAL NOT NULL,
    netBeforeObligations REAL NOT NULL,
    -- Obligations
    taxRate REAL DEFAULT 12,
    incomeTax REAL NOT NULL,
    healthInsuranceBase REAL DEFAULT 5537.18,
    healthInsuranceRate REAL DEFAULT 9,
    healthContribution REAL NOT NULL,
    -- Expenses deductions
    expensesSummary TEXT CHECK (json_valid(expensesSummary)),
    -- Total after obligations and expenses deductions
    totalCleanRevenue REAL NOT NULL,
    notes TEXT,
    -- DBA
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT,
    PRIMARY KEY ("from", "to")
);