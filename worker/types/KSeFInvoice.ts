export interface KSeFInvoice {
    header: {
        formCode: string;
        systemCode: string;
        schemaVersion: string;
        variant: number;
        createdAt: string;
        systemInfo: string;
    };
    seller: {
        taxId: string;
        name: string;
        address: string;
    };
    buyer: {
        taxId: string;
        name: string;
    };
    invoice: {
        number: string;
        currency: string;
        issueDate: string;
        totalNet: number;
        totalVat: number;
        totalGross: number;
        lines: {
            description: string;
            quantity: number;
            unitPrice: number;
        }[];
    };
}