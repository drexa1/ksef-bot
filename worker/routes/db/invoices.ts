import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";
import {getAuthUser} from "../../auth";

export type AppInvoice = {
    id?: string
    seller_id: string
    buyer_id: string
    country_code: string
    raw_xml: string
    json_data: string
    notes?: string
    created_at?: string
    updated_at?: string
};

let repo: Repository;
function getRepo(env: Env): Repository {
    return repo ??= new Repository(new D1Driver(env.D1));
}

export async function get(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    // Filter only owned records
    const rows = id
        ? await getRepo(env).get("invoices", id, { owner_id: authUser.id })
        : await getRepo(env).getAll("invoices", { owner_id: authUser.id });
    if (rows === null)
        return Response.json({ error: "Invoice not found", id: id }, { status: 404 });
    return Response.json(rows, { status: 200 });
}

export async function post(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env);
    const payload = await req.json() as AppInvoice & { owner_id?: string };
    // Never allow client to control ownership or creation/update timestamps
    const { created_at, updated_at, owner_id, ...payloadData } = payload;
    const record = {
        ...payloadData,
        id: payload.id ?? crypto.randomUUID(),
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

export async function put(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env);
    const payload = await req.json() as AppInvoice & { owner_id?: string };
    // Never allow client to change id, ownership, or creation timestamp
    const { id, created_at, updated_at, owner_id, ...updatePayload } = payload;
    const result = await getRepo(env).update("invoices", {
        ...updatePayload,
        updated_at: new Date().toISOString()
    }, id!, { owner_id: authUser.id });
    if (result.changes === 0)
        return Response.json({ success: false, id: id, error: "Invoice not found" }, { status: 404 });
    return Response.json({ success: true, id: id }, { status: result.success ? 200 : 400 });
}

export async function del(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env);
    const url = new URL(req.url);
    const id = url.searchParams.get("id")!;
    const result = await getRepo(env).delete("invoices", id, { owner_id: authUser.id });
    if (result.changes === 0)
        return Response.json({ success: false, id: id, error: "Invoice not found" }, { status: 404 });
    return Response.json({ success: result.success, id: id }, { status: result.success ? 200 : 400 });
}