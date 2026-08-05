import {Env} from "../../worker";
import {KsefClient} from "./ksef.client";
import {AppInvoice} from "../../types/db";
import {D1Driver, Repository} from "../../repository/d1";
import {getAuthUser} from "../../auth";

let repo: Repository;
function getRepo(env: Env): Repository {
    return repo ??= new Repository(new D1Driver(env.D1));
}

export async function getKsefInvoices(req: Request, env: Env, subjectType: "Subject1" | "Subject2"): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from")!;
    const toParam = url.searchParams.get("to")!;
    const from = new Date(fromParam);
    const to = new Date(toParam);
    if (isNaN(from.getTime()) || isNaN(to.getTime()))
        return Response.json({ success: false, error: "Invalid date parameters" }, { status: 400 });
    const client = new KsefClient(env, appUser);
    const invoices = await client.queryPurchaseInvoices(env, appUser, subjectType, from, to);
    await saveInvoices(env, invoices);
    // Return the JSON formatted
    const result = invoices.map(row => JSON.parse(row.json_data));
    return Response.json({ success: true, result }, { status: 200 });
}

async function saveInvoices(env: Env, invoices: Awaited<AppInvoice & { owner_id: string }>[]) {
    // Cache in app
    const saved = [];
    const existing = [];
    for (const invoice of invoices) {
        try {
            await getRepo(env).save<AppInvoice>("invoices", invoice);
            saved.push(invoice);
        } catch (error) {
            if (String(error).includes("UNIQUE constraint failed")) {
                console.warn("Invoice already existed in the app:", invoice.id);
                existing.push(invoice.id);
                continue;
            }
            throw error;
        }
    }
}