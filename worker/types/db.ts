export type AppUserUpdate = Partial<Omit<AppUser, "email">>;
export type AppUser = {
    email: string
    // Application
    apiKey?: string
    tier?: number
    // Identification data
    nip: string
    regon?: string
    bdo?: string
    firstName: string
    lastName: string
    dateOfBirth: string
    companyName?: string
    companyLogo?: Uint8Array
    // Address details
    country: string
    voivodeship: string
    county: string
    commune: string
    town: string
    zipCode: string
    street?: string
    buildingNumber: string
    apartmentNumber?: string
    phoneNumber?: string
    displayEmailOnKsefInvoices?: boolean
    // Billing data
    settlementType: "monthly" | "quarterly"
    cashMethod?: boolean
    bankAccountNumber?: string
    taxOffice?: string
    // DBA
    createdAt?: string
    updatedAt?: string
};

export type AppInvoice = {
    id: string
    // Parties
    sellerId: string
    buyerId: string
    // Raw data
    rawXml: string
    jsonData: string
    notes?: string
    // DBA
    createdAt?: string
    updatedAt?: string
};

export type AppCounterpartyUpdate = Partial<Omit<AppCounterparty, "id">>;
export type AppCounterparty = {
    id: string
    // Counterparty data
    name: string
    nip?: string
    pesel?: string
    regon?: string
    internalIdentifier?: string
    // Address
    countryCode: string
    addressL1: string
    addressL2?: string
    // Counterparty metadata
    localGovernmentUnit?: number
    vatGroup?: number
    notes?: string
    // DBA
    createdAt?: string
    updatedAt?: string
};

export type AppTaxRecordUpdate = Partial<Omit<AppTaxRecord, "from" | "to">>;
export type ExpenseSummary = { InvoiceNumber: string, TotalGrossAmount: number, TotalVatAmount: number }
export type AppTaxRecord = {
    from: Date
    to: Date
    // Tax record
    brutIncome: number
    vatPercentage: number
    vatAmount: number
    netBeforeObligations: number
    // Obligations
    taxRate: number,
    incomeTax: number
    healthInsuranceBase: number
    healthInsuranceRate: number
    healthContribution: number
    // Expenses deductions
    expensesSummary: ExpenseSummary[]
    // Total after obligations and expenses deductions
    totalCleanRevenue: number
    notes: string
    // DBA
    createdAt?: string
    updatedAt?: string
};
export type TaxRecordObligations = {
    vatPercentage: number
    vatAmount: number
    netBeforeObligations: number
    taxRate: number
    incomeTax: number
    healthInsuranceBase: number
    healthInsuranceRate: number
    healthContribution: number
    expensesDeductions: number
    expensesSummary: ExpenseSummary[]
}