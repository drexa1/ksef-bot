import {Env} from "../../worker";
import {getKsefInvoices} from "./ksef";

/**
 * Invoices where the user is the invoicee.
 */
export async function get(req: Request, env: Env): Promise<Response> {
    return await getKsefInvoices(req, env, "Subject2");
}