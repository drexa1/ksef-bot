export type KsefContextIdentifier = { type: "Nip" | "Pesel" | "Regon", identifier: string };

export type KsefAuthenticationStatus = { status: "Pending" | "InProgress" | "Completed" | "Failed", message?: string };

export type KsefQueryStatus = { status: "queued" | "processing" | "completed" | "failed", message?: string };

export type KsefIdentifiable = { nip?: string, pesel?: string, regon?: string };

export type KsefInvoiceMetadata = {
    ksefNumber: string
    invoiceNumber?: string
    sellerNip?: string
    issueDate?: string
    grossAmount?: number
};