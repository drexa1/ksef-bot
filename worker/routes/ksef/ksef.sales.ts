import {Env} from "../../worker";
import {getKsefInvoices} from "./ksef";

/**
 * Invoices where the user is the issuer.
 */
export async function get(req: Request, env: Env): Promise<Response> {
    return await getKsefInvoices(req, env, "Subject1");
}

export async function post(req: Request, env: Env): Promise<Response> {
    // TODO: offer endpoint for JSON and from XML
    return Response.json(null);
}