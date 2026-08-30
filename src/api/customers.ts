/// <reference types="vite/client"/>
import {AppCustomer} from "../../worker/types/db";

/// UI model
export interface CustomerUI {
    name: string;
    nip: string;
    town: string;
    postalCode: string;
    street: string;
    building: string;
    apartment: string;
    email: string;
}

export async function loadCustomers(): Promise<CustomerUI[]> {
    const url = `${import.meta.env.VITE_WORKER_URL}/app/customers`;
    const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json", "X-API-Key": import.meta.env.VITE_API_KEY }
    });
    if (!response.ok)
        throw new Error(`Failed to fetch existing contractors: ${response.status}`);
    const customers: AppCustomer[] = await response.json();
    customers.length
        ? console.info(`${customers.length} contractor(s) found in the DB`)
        : console.warn(`No contractors found in the DB`);
    return customers.map(customerToUI);
}

function customerToUI(customer: AppCustomer): CustomerUI {
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