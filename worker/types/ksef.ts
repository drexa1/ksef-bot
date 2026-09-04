export type KsefIdentifiable = {
    nip?: string
    pesel?: string
    regon?: string
};

export type KsefContractor = {
    source: "CEIDG" | "KRS" | "VAT_LB";
    nip: string;
    regon?: string;
    name: string;
    countryCode?: string;
    addressLine?: string;
    citizenship?: string[];
    registrationDate?: string;
    status?: string;
    electronicDeliveryAddress?: string;
};

export interface KsefContextIdentifier { type: "Nip" | "InternalId" | "NipVatUe" | "PeppolId", value: string }

export type KsefAuthenticationStatus = {
    status: {
        code: number
        description: string
        details?: string[]
    };
};

export type KsefInvoiceQueryResult = {
    hasMore: boolean;
    isTruncated: boolean;
    invoices: KsefInvoiceMetadata[];
};

export type KsefInvoiceMetadata = {
    ksefNumber: string
    invoiceNumber?: string
    sellerNip?: string
    issueDate?: string
    grossAmount?: number
};

export type InvoiceEncryptionData = {
    cipherKey: Uint8Array
    cipherIv: Uint8Array
    encryptedSymmetricKey: string
    initializationVector: string
};