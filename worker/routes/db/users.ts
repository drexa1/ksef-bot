import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";

let repo: Repository | undefined;
function getRepo(env: Env): Repository {
    return repo ??= new Repository(new D1Driver(env.D1));
}

export async function get(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const rows = id ? await getRepo(env).get("users", id) : await getRepo(env).getAll("users");
    if (rows === null) return Response.json({ error: "User not found" }, { status: 404 });
    return Response.json(rows, { status: 200 });
}

export async function post(req: Request, env: Env): Promise<Response> {
    const payload = await req.json() as Record<string, unknown>;
    const record = { ...payload, id: (payload.id as string) ?? crypto.randomUUID(), updated_at: new Date().toISOString() };
    try {
        await getRepo(env).save("users", record);
        return Response.json({ success: true, entity: "users", id: record.id }, { status: 200 });
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
    return Response.json({ success: true, entity: "users", id }, { status: result.success ? 200 : 400 });
}

export async function del(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const id = url.searchParams.get("id")!;
    const result = await getRepo(env).delete("users", id);
    return Response.json({ success: result.success, entity: "users", id }, { status: result.success ? 200 : 404 });
}
