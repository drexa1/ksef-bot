import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";
import {AppUser, AppUserUpdate} from "../../types/db";
import {corsHeaders, getAuthUser} from "../../auth";
import {nanoid} from "nanoid";

let repo: Repository;
function getRepo(env: Env): Repository {
    return repo ??= new Repository(new D1Driver(env.D1));
}

export async function get(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env) as AppUser;
    // Allow to fetch users only to superadmin
    if (authUser.tier !== 0)
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const rows = id
        ? await getRepo(env).get<AppUser>("users", id)
        : await getRepo(env).getAll<AppUser>("users");
    if (rows === null)
        return Response.json({ error: "User not found", id: id }, { status: 404 });
    return Response.json(rows, { status: 200 });
}

export async function post(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env) as AppUser;
    // Allow to create users only to superadmin
    if (authUser.tier !== 0)
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    // Never allow client to control id, ownership, or creation/update timestamps
    const payload = await req.json() as AppUser;
    const { created_at, updated_at, ...payloadData } = payload;
    const record = { ...payloadData, id: nanoid(), tier: 1, updated_at: new Date().toISOString() };
    try {
        await getRepo(env).save<AppUser>("users", record);
        return Response.json({ success: true, id: record.id }, { status: 200 });
    } catch (error) {
        if (String(error).includes("UNIQUE constraint failed"))
            return Response.json({ success: false, error: "User already exists", id: record.id }, { status: 409 });
        throw error;
    }
}

export async function put(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env) as AppUser;
    // Allow to update users only to superadmin
    if (authUser.tier !== 0)
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const payload = await req.json() as AppUser;
    // Never allow client to change id, or creation/update timestamp
    const { email, api_key, tier, created_at, updated_at, ...updatePayload } = payload;
    const result = await getRepo(env).update<AppUserUpdate>("users", {
        ...updatePayload,
        updated_at: new Date().toISOString()
    }, authUser.email);
    if (result.changes === 0)
        return Response.json({ success: false, id: authUser.email, error: "User not found" }, { status: 404 });
    return Response.json({ success: true, id: authUser.email }, { status: result.success ? 200 : 400 });
}

export async function del(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env) as AppUser;
    // Allow to update users only to superadmin
    if (authUser.tier !== 0)
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const url = new URL(req.url);
    const id = url.searchParams.get("id")!;
    const result = await getRepo(env).delete("users", id);
    if (result.changes === 0)
        return Response.json({ success: false, id: id, error: "User not found" }, { status: 404 });
    return Response.json({ success: result.success, id: id }, { status: result.success ? 200 : 404 });
}
