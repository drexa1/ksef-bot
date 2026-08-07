import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";
import {AppCounterparty, AppCounterpartyUpdate} from "../../types/db";
import {getAuthUser} from "../../auth";
import {nanoid} from "nanoid";

let repo: Repository;
function getRepo(env: Env): Repository {
    return repo ??= new Repository(new D1Driver(env.D1));
}

export async function get(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    // Allow to fetch only owned counterparties (except for superadmin)
    const filters = appUser.tier === 0 ? {} : { owner_id: appUser.email };
    const rows = id
        ? await getRepo(env).get<AppCounterparty>("counterparties", { id, ...filters })
        : await getRepo(env).getAll<AppCounterparty>("counterparties", filters);
    if (rows === null)
        return Response.json({ success: false, error: "Counterparty not found", id: id }, { status: 404 });
    return Response.json(rows, { status: 200 });
}

export async function post(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const payload = await req.json() as AppCounterparty;
    // Never allow client to control id, ownership, or creation/update timestamps
    const { id, createdAt, updatedAt, ...payloadData } = payload;
    const record = { ...payloadData, id: nanoid(), ownerId: appUser.email, updatedAt: new Date().toISOString() };
    try {
        await getRepo(env).save<AppCounterparty>("counterparties", record);
        return Response.json({ success: true, id: record.id }, { status: 200 });
    } catch (error) {
        if (String(error).includes("UNIQUE constraint failed"))
            return Response.json({ success: false, error: "Counterparty already exists", id: record.id }, { status: 409 });
        throw error;
    }
}

export async function put(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const payload = await req.json() as AppCounterparty & { ownerId?: string };
    // Never allow client to change id, ownership, or creation/update timestamp
    const { id, ownerId, createdAt, updatedAt, ...updatePayload } = payload;
    const result = await getRepo(env).update<AppCounterpartyUpdate>("counterparties", {
        ...updatePayload,
        updatedAt: new Date().toISOString()
    }, { id, ownerId: appUser.email });
    if (result.changes === 0)
        return Response.json({ success: false, error: "Counterparty not found", id: id }, { status: 404 });
    return Response.json({ success: true, id: id }, { status: result.success ? 200 : 400 });
}

export async function del(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const url = new URL(req.url);
    const id = url.searchParams.get("id")!;
    // Allow to delete only owned counterparties (except for superadmin)
    const filters = appUser.tier === 0 ? {} : { ownerId: appUser.email };
    const result = await getRepo(env).delete("counterparties", { id, ...filters });
    if (result.changes === 0)
        return Response.json({ success: false, error: "Counterparty not found", id: id }, { status: 404 });
    return Response.json({ success: result.success, id: id }, { status: result.success ? 200 : 404 });
}