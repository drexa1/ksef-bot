import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";
import {getAuthUser} from "../../auth";
import {AppUser} from "./users";

type AppInvoice = {
    id?: string
    // Parties
    seller_id: string
    buyer_id: string
    // Raw data
    country_code: string
    raw_xml: string
    json_data: string
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
    // Allow to fetch only owned invoices (except for superadmin)
    const filters = authUser.tier === 0 ? {} : { owner_id: authUser.id };
    const rows = id
        ? await getRepo(env).get("invoices", id, filters)
        : await getRepo(env).getAll("invoices", filters);
    if (rows === null)
        return Response.json({ error: "Invoice not found", id: id }, { status: 404 });
    return Response.json(rows, { status: 200 });
}

export async function post(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env) as AppUser;
    const payload = await req.json() as AppInvoice & { owner_id?: string };
    // Never allow client to control id (except for local testing), ownership, or creation/update timestamps
    const { id, owner_id, created_at, updated_at, ...payloadData } = payload;
    const record = {
        ...payloadData,
        id: env.ENVIRONMENT === "dev" ? payload.id ?? crypto.randomUUID() : crypto.randomUUID(),
        owner_id: authUser.id,
        updated_at: new Date().toISOString()
    };
    try {
        await getRepo(env).save("invoices", record);
        return Response.json({ success: true, id: record.id }, { status: 200 });
    } catch (error) {
        if (String(error).includes("UNIQUE constraint failed"))
            return Response.json({ success: false, error: "Invoice already exists", id: record.id }, { status: 409 });
        throw error;
    }
}

export async function put(_req: Request, _env: Env): Promise<Response> {
    return Response.json({ error: "Invoice update not supported" }, { status: 501 });
}

export async function del(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env) as AppUser;
    const url = new URL(req.url);
    const id = url.searchParams.get("id")!;
    // Allow to delete only owned invoices (except for superadmin)
    const filters = authUser.tier === 0 ? {} : { owner_id: authUser.id };
    const result = await getRepo(env).delete("invoices", id, filters);
    if (result.changes === 0)
        return Response.json({ success: false, id: id, error: "Invoice not found" }, { status: 404 });
    return Response.json({ success: result.success, id: id }, { status: result.success ? 200 : 400 });
}