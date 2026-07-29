import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";

function getEntityId(req: Request): string | null {
    const url = new URL(req.url);
    return url.searchParams.get("id") ?? null;
}

async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
    const body = await req.json();
    if (typeof body !== "object" || body === null || Array.isArray(body))
        throw new Response("Expected a JSON object", { status: 400 });
    return body as Record<string, unknown>;
}

export async function counterpartiesGET(req: Request, env: Env): Promise<Response> {
    const repo = new Repository(new D1Driver(env.D1));
    const id = getEntityId(req);
    const rows = id ? await repo.get("counterparties", id) : await repo.getAll("counterparties");
    if (id && rows === null)
        return Response.json({ error: "Counterparty not found" }, { status: 404 });
    return Response.json(rows, { status: 200 });
}

export async function counterpartiesPOST(req: Request, env: Env): Promise<Response> {
    const repo = new Repository(new D1Driver(env.D1));
    const payload = await readJsonBody(req);
    const record = {
        ...payload,
        id: (payload.id as string | undefined) ?? crypto.randomUUID(),
        updated_at: new Date().toISOString()
    };
    await repo.save("counterparties", record, ["id"]);
    return Response.json({ success: true, entity: "counterparties", id: record.id }, { status: 200 });
}

export async function counterpartiesPUT(req: Request, env: Env): Promise<Response> {
    const repo = new Repository(new D1Driver(env.D1));
    const payload = await readJsonBody(req);
    const id = (payload.id as string | undefined) ?? getEntityId(req);
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    const result = await repo.update("counterparties", { ...payload, updated_at: new Date().toISOString() }, id);
    return Response.json({ success: true, entity: "counterparties", id }, { status: result.success ? 200 : 400 });
}

export async function counterpartiesDELETE(req: Request, env: Env): Promise<Response> {
    const repo = new Repository(new D1Driver(env.D1));
    const id = getEntityId(req);
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    const result = await repo.delete("counterparties", id);
    return Response.json({ success: result.success, entity: "counterparties", id }, { status: result.success ? 200 : 404 });
}
