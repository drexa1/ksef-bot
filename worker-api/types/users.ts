export type AppUserUpdate = Partial<Omit<AppUser, "email">>;

export type AppUser = {
    email: string
    // Application
    apiKey?: string
    tier?: number
    // KSeF integration
    ksefApiToken?: string
    // Banking integration
    bankName?: string
    bankApiToken?: string
    // Invoicing defaults
    defaultItemName?: string,
    defaultHourlyRate?: number,
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