import {Env} from "../../worker";
import {KsefClient} from "./ksef.client";
import pRetry, {AbortError} from "p-retry";
import {getAuthUser} from "../../auth";
import {AppUser} from "../db/users";
import {D1Driver, Repository} from "../../repository/d1";
import {AppCounterparty} from "../db/counterparties";

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
        return Response.json({ error: "Invalid date parameters" }, { status: 400 });
    const invoices = await queryPurchaseInvoices(req, env, from, to);
    return Response.json(invoices);
}

async function queryPurchaseInvoices(req: Request, env: Env, from: Date, to: Date) {
    const authUser = await getAuthUser(req, env) as AppUser;
    const userCounterparty = await getRepo(env).get("counterparties", authUser.id) as AppCounterparty;
    if (!userCounterparty)
        return Response.json({ error: "KsefSubject not found", id: authUser.id }, { status: 404 });
    const client = new KsefClient(env, userCounterparty);
    // Authenticate
    await client.authenticate();
    // Start invoice search
    const query = await client.createInvoiceQuery(from, to);
    // Poll until completed
    await pRetry(
        async () => {
            const queryStatus = await client.getQueryStatus(query.queryReferenceNumber);
            switch (queryStatus.status) {
                case "completed":
                    return;
                case "queued":
                case "processing":
                    throw new Error(`KSeF query not ready: ${queryStatus.status}`);
                case "failed":
                    throw new AbortError(queryStatus.message ?? "KSeF query failed");
            }
        }, {
            retries: 3,
            minTimeout: 1000,
            maxTimeout: 5000,
            factor: 1
        }
    );
    // Get invoice metadata
    const invoicesMetadata = await client.getInvoices(query.queryReferenceNumber);
    return await Promise.all(
        invoicesMetadata.map(async (metadata) => {
            const xml = await client.downloadInvoice(metadata.ksefNumber);
            return { metadata, xml };
        })
    );
}