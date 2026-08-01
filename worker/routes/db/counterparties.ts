import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";
import {getAuthUser} from "../../auth";
import {AppUser} from "./users";

type AppCounterparty = {
    id?: string
    // Counterparty data
    name: string
    nip?: string
    pesel?: string
    regon?: string
    internal_identifier?: string
    // Address
    country_code: string
    address_l1: string
    address_l2?: string
    // Counterparty metadata
    local_government_unit?: number
    vat_group?: number
    notes?: string
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
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    // Allow to fetch only owned counterparties (except for superadmin)
    const filters = authUser.tier === 0 ? {} : { owner_id: authUser.id };
    const rows = id
        ? await getRepo(env).get("counterparties", id, filters)
        : await getRepo(env).getAll("counterparties", filters);
    if (rows === null)
        return Response.json({ error: "Counterparty not found", id: id }, { status: 404 });
    return Response.json(rows, { status: 200 });
}

export async function post(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env) as AppUser;
    const payload = await req.json() as AppCounterparty & { owner_id?: string };
    // Never allow client to control id (except for local testing), ownership, or creation/update timestamps
    const { id, owner_id, created_at, updated_at, ...payloadData } = payload;
    const record = {
        ...payloadData,
        id: env.ENVIRONMENT === "dev" ? payload.id ?? crypto.randomUUID() : crypto.randomUUID(),
        owner_id: authUser.id,
        updated_at: new Date().toISOString()
    };
    try {
        await getRepo(env).save("counterparties", record);
        return Response.json({ success: true, id: record.id }, { status: 200 });
    } catch (error) {
        if (String(error).includes("UNIQUE constraint failed"))
            return Response.json({ success: false, error: "Counterparty already exists", id: record.id }, { status: 409 });
        throw error;
    }
}

export async function put(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env) as AppUser;
    const payload = await req.json() as AppCounterparty & { owner_id?: string };
    // Never allow client to change id, ownership, or creation timestamp
    const { id, created_at, updated_at, owner_id, ...updatePayload } = payload;
    const result = await getRepo(env).update("counterparties", {
        ...updatePayload,
        updated_at: new Date().toISOString()
    }, id!, { owner_id: authUser.id });
    if (result.changes === 0)
        return Response.json({ success: false, id: id, error: "Counterparty not found" }, { status: 404 });
    return Response.json({ success: true, id: id }, { status: result.success ? 200 : 400 });
}

export async function del(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env) as AppUser;
    const url = new URL(req.url);
    const id = url.searchParams.get("id")!;
    // Allow to delete only owned counterparties (except for superadmin)
    const filters = authUser.tier === 0 ? {} : { owner_id: authUser.id };
    const result = await getRepo(env).delete("counterparties", id, filters);
    if (result.changes === 0)
        return Response.json({ success: false, id: id, error: "Counterparty not found" }, { status: 404 });
    return Response.json({ success: result.success, id: id }, { status: result.success ? 200 : 404 });
}
