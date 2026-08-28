/// <reference types="vite/client"/>

export interface Customer {
    id?: number | string;
    name: string;
    nip?: string;
    town?: string;
    postalCode?: string;
    street?: string;
    building?: string;
    apartment?: string;
    email?: string;
}


export async function loadCustomers(): Promise<Customer[]> {
    const url = `${import.meta.env.VITE_WORKER_URL}/app/customers`;
    const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json", "X-API-Key": import.meta.env.VITE_API_KEY }
    });
    if (!response.ok)
        throw new Error(`Failed to load customers: ${response.status}`);
    return await response.json();
}