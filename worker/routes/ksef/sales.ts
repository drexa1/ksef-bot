import {Env} from "../../worker";
import {getKsefInvoices} from "./ksef";
import {getAuthUser} from "../../auth";
import {AppUser} from "../../types/db";
import {Client} from "./client";

/**
 * Invoices where the user is the issuer.
 */
export async function get(req: Request, env: Env): Promise<Response> {
    return await getKsefInvoices(req, env, "Subject1");
}

export async function post(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Missing XML file" }, { status: 400 });
    try {
        const result = await submitKsefInvoices(env, appUser, await file.text());
        return Response.json({ success: true, result }, { status: 200 });
    } catch (error) {
        if (String(error).includes("Too Many Requests"))
            return Response.json({ success: false, error: "The limit of 20 requests per hour has been exceeded." }, { status: 429 });
        throw error;
    }
}

async function submitKsefInvoices(env: Env, appUser: AppUser, xmlContent: string) {
    const client = new Client(env);
    const { referenceNumber } = await client.postInvoice(appUser, xmlContent);
    return referenceNumber;
}