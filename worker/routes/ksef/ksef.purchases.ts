import {Env} from "../../worker";
import {KsefClient} from "./ksef.client";
import {D1Driver, Repository} from "../../repository/d1";
import pRetry, {AbortError} from "p-retry";
import {getAuthUser} from "../../auth";

let repo: Repository;
function getRepo(env: Env): Repository {
    return repo ??= new Repository(new D1Driver(env.D1));
}

export async function get(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from")!;
    const toParam = url.searchParams.get("to")!;
    const from = new Date(fromParam);
    const to = new Date(toParam);
    if (isNaN(from.getTime()) || isNaN(to.getTime()))
        return Response.json({ success: false, error: "Invalid date parameters" }, { status: 400 });
    const invoices = await queryPurchaseInvoices(req, env, from, to);
    return Response.json(invoices, { status: 200 });
}

async function queryPurchaseInvoices(req: Request, env: Env, from: Date, to: Date) {
    const appUser = await getAuthUser(req, env);
    const client = new KsefClient(env, appUser);
    // Authentication
    await client.authenticate();
    // Query invoice metadata
    const metadataResult = await client.queryInvoiceMetadata(from, to);
    // Download invoice XML files
    return await Promise.all(metadataResult.invoices.map(async (metadata) => {
        const xml = await client.downloadInvoice(metadata.ksefNumber);
        return { metadata, xml };
    }));
}