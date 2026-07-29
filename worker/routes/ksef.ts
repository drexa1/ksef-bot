import {Env} from "../worker";
import {isOwner} from "../auth";

export async function get(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("invoiceId")!;
    const searchResult: any[] = [];  // TODO
    if (!searchResult.length) return Response.json("Invoice not found", { status: 404 });
    await isOwner(req, env, searchResult[0]);
    return Response.json(searchResult);
}

export async function post(req: Request, env: Env): Promise<Response> {
    // TODO
    return Response.json(null);
}