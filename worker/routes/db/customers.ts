import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";
import {AppCustomer, AppCustomerUpdate} from "../../types/db";
import {getAuthUser} from "../../auth";
import {nanoid} from "nanoid";

let repo: Repository;
function getRepo(env: Env): Repository {
    return repo ??= new Repository(new D1Driver(env.D1));
}

export async function get(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const url = new URL(req.url);
    // Allow to fetch only owned customers (except for superadmin)
    const filters: Record<string, any> = appUser.tier === 0 ? {} : { ownerId: appUser.email };
    for (const [key, value] of url.searchParams.entries()) {
        filters[key] = value;
    }
    const rows = Object.keys(filters).length
        ? await getRepo(env).get<AppCustomer>("customers", filters)
        : await getRepo(env).getAll<AppCustomer>("customers");
    if (!rows)
        return Response.json({ success: false, error: "Customer not found", filters }, { status: 404 });
    return Response.json(rows, { status: 200 });
}

export async function post(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const payload = await req.json() as AppCustomer;
    // Never allow client to control id, ownership, or creation/update timestamps
    const { id, createdAt, updatedAt, ...payloadData } = payload;
    const record = { ...payloadData, id: nanoid(), ownerId: appUser.email, updatedAt: new Date().toISOString() };
    try {
        await getRepo(env).save<AppCustomer>("customers", record);
        return Response.json({ success: true, id: record.id }, { status: 201 });
    } catch (error) {
        if (String(error).includes("UNIQUE constraint failed"))
            return Response.json({ success: false, error: "Customers already exists", id: record.id }, { status: 409 });
        throw error;
    }
}

export async function put(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const payload = await req.json() as AppCustomer & { ownerId?: string };
    // Never allow client to change id, ownership, or creation/update timestamp
    const { id, ownerId, createdAt, updatedAt, ...updatePayload } = payload;
    const result = await getRepo(env).update<AppCustomerUpdate>("customers", {
        ...updatePayload,
        updatedAt: new Date().toISOString()
    }, { id, ownerId: appUser.email });
    if (result.changes === 0)
        return Response.json({ success: false, error: "Customer not found", id: id }, { status: 404 });
    return Response.json({ success: true, changes: result.changes, id: id }, { status: result.success ? 200 : 400 });
}

export async function del(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const url = new URL(req.url);
    // Allow to delete only owned customers (except for superadmin)
    const filters: Record<string, any> = {};
    for (const [key, value] of url.searchParams.entries()) {
        filters[key] = value;
    }
    if (appUser.tier !== 0) filters.ownerId = appUser.email;
    const result = await getRepo(env).delete("customers", filters);
    if (result.changes === 0)
        return Response.json({ success: false, error: "Customer not found", filters }, { status: 404 });
    return Response.json({ success: result.success, changes: result.changes, ...filters }, { status: 200 });
}