import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";
import {corsHeaders, getAuthUser} from "../../auth";

export type AppUser = {
    id: string
    // User data
    email: string
    name?: string
    api_key?: string
    tier: number
    // DBA
    created_at: string
    updated_at?: string
};

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
    const rows = id ? await getRepo(env).get("users", id) : await getRepo(env).getAll("users");
    if (rows === null)
        return Response.json({ error: "User not found", id: id }, { status: 404 });
    return Response.json(rows, { status: 200 });
}

export async function post(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env) as AppUser;
    // Allow to create users only to superadmin
    if (authUser.tier !== 0)
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    // Never allow client to control id (except for local testing), ownership, or creation/update timestamps
    const payload = await req.json() as AppUser;
    const { id, created_at, updated_at, ...payloadData } = payload;
    const record = {
        ...payloadData,
        id: env.ENVIRONMENT === "dev" ? payload.id ?? crypto.randomUUID() : crypto.randomUUID(),
        tier: 1,
        updated_at: new Date().toISOString()
    };
    try {
        await getRepo(env).save("users", record);
        return Response.json({ success: true, id: record.id }, { status: 200 });
    } catch (error) {
        if (String(error).includes("UNIQUE constraint failed"))
            return Response.json({ success: false, error: "User already exists", id: record.id }, { status: 409 });
        throw error;
    }
}

export async function put(req: Request, env: Env): Promise<Response> {
    const payload = await req.json() as Record<string, unknown>
    const id = payload.id as string;
    const result = await getRepo(env).update("users", { ...payload, updated_at: new Date().toISOString() }, id);
    if (result.changes === 0)
        return Response.json({ success: false, id: id, error: "User not found" }, { status: 404 });
    return Response.json({ success: true, id: id }, { status: result.success ? 200 : 400 });
}

export async function del(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const id = url.searchParams.get("id")!;
    const result = await getRepo(env).delete("users", id);
    if (result.changes === 0)
        return Response.json({ success: false, id: id, error: "User not found" }, { status: 404 });
    return Response.json({ success: result.success, id: id }, { status: result.success ? 200 : 404 });
}
