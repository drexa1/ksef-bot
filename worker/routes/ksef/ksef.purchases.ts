import {Env} from "../../worker";

export async function get(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("invoiceId")!;
    const searchResult: any[] = [];  // TODO
    if (!searchResult.length) return Response.json("Invoice not found", { status: 404 });
    return Response.json(searchResult);
}