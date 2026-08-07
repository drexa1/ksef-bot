export type AppUserUpdate = Partial<Omit<AppUser, "email">>;
export type AppUser = {
    email: string
    // Application
    api_key?: string
    tier?: number
    // Identification data
    nip: string
    regon?: string
    bdo?: string
    first_name: string
    last_name: string
    date_of_birth: string
    company_name?: string
    company_logo?: Uint8Array
    // Address details
    country: string
    voivodeship: string
    county: string
    commune: string
    town: string
    zip_code: string
    street?: string
    building_number: string
    apartment_number?: string
    phone_number?: string
    display_email_on_ksef_invoices?: boolean
    // Billing data
    settlement_type: "monthly" | "quarterly"
    cash_method?: boolean
    bank_account_number?: string
    tax_office?: string
    // DBA
    created_at?: string
    updated_at?: string
};

export type AppInvoice = {
    id: string
    // Parties
    seller_id: string
    buyer_id: string
    // Raw data
    raw_xml: string
    json_data: string
    notes?: string
    // DBA
    created_at?: string
    updated_at?: string
};

export type AppCounterpartyUpdate = Partial<Omit<AppCounterparty, "id">>;
export type AppCounterparty = {
    id: string
    // Counterparty data
    name: string
    nip?: string
    pesel?: string
    regon?: string
    internal_identifier?: string
    // Address
    country_code: string
    address_l1: string
    address_l2?: string
    // Counterparty metadata
    local_government_unit?: number
    vat_group?: number
    notes?: string
    // DBA
    created_at?: string
    updated_at?: string
};

export type AppTaxRecordUpdate = Partial<Omit<AppTaxRecord, "id">>;
export type AppTaxRecord = {
    id: string
    // Tax record
    from: Date
    to: Date
    brut_income: number
    vat_percentage: number
    vat_amount: number
    net_before_obligations: number
    // Obligations
    tax_rate: number,
    income_tax: number
    health_insurance_base: number
    health_insurance_rate: number
    health_contribution: number
    // Total after obligations
    total_clean_revenue: number
    notes: string
    // DBA
    created_at?: string
    updated_at?: string
};