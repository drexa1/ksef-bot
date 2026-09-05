import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";
import {AppUser, AppUserUpdate} from "../../types/db";
import {corsHeaders, getAuthUser} from "../../auth";

let repo: Repository;
function getRepo(env: Env): Repository {
    return repo ??= new Repository(new D1Driver(env.D1));
}

export async function get(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    // Allow to fetch users only to superadmin
    if (appUser.tier !== 0)
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const url = new URL(req.url);
    const filters: Record<string, any> ={};
    for (const [key, value] of url.searchParams.entries()) {
        filters[key] = value;
    }
    const rows = Object.keys(filters).length
        ? await getRepo(env).get<AppUser>("users", filters)
        : await getRepo(env).getAll<AppUser>("users");
    if (!rows)
        return Response.json({ success: false, error: "Users not found", filters: filters }, { status: 404 });
    return Response.json(rows, { status: 200 });
}

export async function post(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    // Allow to create users only to superadmin
    if (appUser.tier !== 0)
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    // Never allow client to control id, ownership, or creation/update timestamps
    const payload = await req.json() as AppUser;
    const { createdAt, updatedAt, ...payloadData } = payload;
    const record = { ...payloadData, tier: 1, updatedAt: new Date().toISOString() };
    try {
        await getRepo(env).save<AppUser>("users", record);
        return Response.json({ success: true, email: record.email }, { status: 201 });
    } catch (error) {
        if (String(error).includes("UNIQUE constraint failed"))
            return Response.json({ success: false, error: "User already exists", email: record.email }, { status: 409 });
        throw error;
    }
}

export async function put(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    // Allow to update users only to superadmin
    if (appUser.tier !== 0)
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const payload = await req.json() as AppUser;
    // Never allow client to change id, or creation/update timestamp
    const { email, apiKey, tier, createdAt, updatedAt, ...updatePayload } = payload;
    const result = await getRepo(env).update<AppUserUpdate>("users", {
        ...updatePayload,
        updatedAt: new Date().toISOString()
    }, { email: email });
    if (result.changes === 0)
        return Response.json({ success: false, error: "User not found", email: email }, { status: 404 });
    return Response.json({ success: true, changes: result.changes, email: email }, { status: result.success ? 200 : 400 });
}

export async function del(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    // Only superadmins can delete users
    if (appUser.tier !== 0)
        return new Response("Unauthorized", {status: 401, headers: corsHeaders });
    const url = new URL(req.url);
    const filters: Record<string, any> = {};
    for (const [key, value] of url.searchParams.entries()) {
        filters[key] = value;
    }
    const result = await getRepo(env).delete("users", filters);
    if (result.changes === 0)
        return Response.json({ success: false, error: "Users not found", filters }, { status: 404 });
    return Response.json({ success: result.success, changes: result.changes, ...filters }, { status: 200 });
}
