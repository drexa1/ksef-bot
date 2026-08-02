export type AppUserUpdate = Partial<Omit<AppUser, "email">>;
export type AppUser = {
    // User data
    email: string
    name?: string
    api_key?: string
    tier?: number
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
    country_code: string
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
    period: string
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