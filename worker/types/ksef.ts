/**
 * One of the parts of this invoice was not found in the application white attempting work with this invoice.
 */
export class InvoicePartNotFound extends Error {
    constructor(message: string, public status: number, public details?: unknown) {
        super(message);
        this.name = "PartNotFound";
    }
}

export type KsefContextIdentifier = { type: "Nip" | "Pesel" | "Regon", identifier: string };

export type KsefAuthenticationStatus = { status: "Pending" | "InProgress" | "Completed" | "Failed", message?: string };

export type KsefQueryStatus = { status: "queued" | "processing" | "completed" | "failed", message?: string };

export type KsefSubject = { nip?: string, pesel?: string, regon?: string };

export type KsefInvoiceMetadata = {
    ksefNumber: string
    invoiceNumber?: string
    sellerNip?: string
    issueDate?: string
    grossAmount?: number
};