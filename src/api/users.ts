import {AppUser} from "../../worker/types/db";

function preconnect() {
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = new URL(import.meta.env.VITE_WORKER_URL).origin;
    document.head.appendChild(link);
    console.info("Connected to worker");
}

export async function loadUserProfile(userId: string): Promise<AppUser> {
    preconnect();
    const url = `${import.meta.env.VITE_WORKER_URL}/app/users?email=${userId}`;
    const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json", "X-API-Key": import.meta.env.VITE_API_KEY }
    });
    if (!response.ok)
        throw new Error(`Failed to fetch user profile: ${response.status}`);
    return await response.json();
}