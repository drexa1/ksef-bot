import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";
import {corsHeaders, getAuthUser} from "../../auth";
import {AppUser, AppUserUpdate} from "../../types/users";

let repo: Repository;
const getRepo = (env: Env): Repository => repo ??= new Repository(new D1Driver(env.D1));

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

/**
 * 🐣 User creation triggered by the onboarding flow.
 */
export async function post(req: Request, env: Env): Promise<Response> {
    // 👀 At this point there is no user to verify yet
    // REVIEW: is there any security check that we can do at this point, other that the auth? what can create users?
    // Never allow client to control tier, apiKey, or creation/update timestamps
    const payload = await req.json() as AppUser;
    const { tier, apiKey, createdAt, updatedAt, ...payloadData } = payload;
    const record = { ...payloadData, tier: 1, updatedAt: new Date().toISOString() };
    try {
        await getRepo(env).save<AppUser>("users", record);
        return Response.json({ success: true, id: record.id }, { status: 201 });
    } catch (error) {
        if (String(error).includes("UNIQUE constraint failed"))
            return Response.json({ success: false, error: "User already exists", id: record.id }, { status: 409 });
        throw error;
    }
}

export async function put(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    // Allow to update users only to superadmin
    if (appUser.tier !== 0)
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const payload = await req.json() as AppUser;
    // Never allow client to change id, tier, apiKey or creation/update timestamp
    const { id, tier, apiKey, createdAt, updatedAt, ...updatePayload } = payload;
    const result = await getRepo(env).update<AppUserUpdate>("users", {
        ...updatePayload, tier: 1, updatedAt: new Date().toISOString()
    }, { id: id });
    if (result.changes === 0)
        return Response.json({ success: false, error: "User not found", id: id }, { status: 404 });
    return Response.json({ success: true, changes: result.changes, id: id }, { status: result.success ? 200 : 400 });
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
