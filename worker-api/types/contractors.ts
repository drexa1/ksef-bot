export type AppCustomerUpdate = Partial<Omit<AppCustomer, "id">>;

export type AppCustomer = {
    id: string
    // Customer data
    name: string
    nip?: string
    pesel?: string
    regon?: string
    internalIdentifier?: string
    // Address
    countryCode: string
    addressL1: string
    addressL2?: string
    // Customer metadata
    localGovernmentUnit?: number
    vatGroup?: number
    notes?: string
    // DBA
    createdAt?: string
    updatedAt?: string
};