import {AppUser} from "../../worker/types/db";

export async function loadUserProfile(userId: string): Promise<AppUser> {
    const url = `${import.meta.env.VITE_WORKER_URL}/app/users?email=${userId}`;
    const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json", "X-API-Key": import.meta.env.VITE_API_KEY }
    });
    if (!response.ok)
        throw new Error(`Failed to fetch user profile: ${response.status}`);
    return await response.json();
}