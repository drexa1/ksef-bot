/// <reference types="vite/client"/>

/// UI model
export interface Contractor {
    name: string;
    nip: string;
    town: string;
    postalCode: string;
    street: string;
    building: string;
    apartment: string;
    email: string;
}

/// API model
interface Customer {
    id: string;
    ownerId: string;
    name: string;
    nip: string | null;
    pesel: string | null;
    regon: string | null;
    internalIdentifier: string | null;
    countryCode: string;
    addressL1: string;
    addressL2: string | null;
    localGovernmentUnit: number;
    vatGroup: number;
    notes: string;
    createdAt: string;
    updatedAt: string;
}

export async function loadCustomers(): Promise<Contractor[]> {
    const url = `${import.meta.env.VITE_WORKER_URL}/app/customers`;
    const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json", "X-API-Key": import.meta.env.VITE_API_KEY }
    });
    if (!response.ok)
        throw new Error(`Failed to fetch existing contractors: ${response.status}`);
    const customers: Customer[] = await response.json();
    console.info(`${customers.length} contractor(s) found in the DB`);
    return customers.map(customerToUI);
}

function customerToUI(customer: Customer): Contractor {
    const [town = "", postalCode = "", streetAndBuilding = ""] = customer.addressL1.split(", ");
    const match = streetAndBuilding.match(/^(.+?)\s+(\S+)$/);
    return {
        name: customer.name,
        nip: customer.nip ?? "",
        town,
        postalCode,
        street: match?.[1] ?? streetAndBuilding,
        building: match?.[2] ?? "",
        apartment: "",
        email: ""
    };
}