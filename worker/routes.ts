import {Env} from "./worker";
import {openApiSpec, swaggerHtml} from "./api/openapi";
import {scalarHtml} from "./api/scalar";
import {get as healthGET} from "./routes/health";
import {whoami as whoamiGET} from "./auth";
import {get as salesGET, post as salesPOST} from "./routes/ksef/ksef.sales";
import {get as purchasesGET} from "./routes/ksef/ksef.purchases";
import {get as usersGET, post as usersPOST, put as usersPUT, del as usersDELETE} from "./routes/db/users";
import {get as counterpartiesGET, post as counterpartiesPOST, put as counterpartiesPUT, del as counterpartiesDELETE} from "./routes/db/counterparties";
import {get as invoicesGET, post as invoicesPOST, put as invoicesPUT, del as invoicesDELETE} from "./routes/db/invoices";
import {get as taxesGET, post as taxesPOST, put as taxesPUT, del as taxesDELETE} from "./routes/db/taxes";

export type Routes = Partial<Record<Method, Route>>;
export type Method = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";
export type Route = (req: Request, env: Env) => Promise<Response>;

export const routes: Record<string, Routes> =  {
    // Don't use redirection at root, in this case we serve the static assets
    "/openapi.json":       { GET: async () => Response.json(openApiSpec) },
    "/swagger":            { GET: async () => new Response(swaggerHtml, { headers: { "Content-Type": "text/html" }}) },
    "/docs":               { GET: async () => new Response(scalarHtml, { headers: { "Content-Type": "text/html" }}) },
    "/health":             { GET: healthGET },
    // Requiring authentication
    "/whoami":             { GET: whoamiGET },
    "/ksef/sales":         { GET: salesGET, POST: salesPOST },
    "/ksef/purchases":     { GET: purchasesGET },
    "/app/users":          { GET: usersGET, POST: usersPOST, PUT: usersPUT, DELETE: usersDELETE },
    "/app/counterparties": { GET: counterpartiesGET, POST: counterpartiesPOST, PUT: counterpartiesPUT, DELETE: counterpartiesDELETE },
    "/app/invoices":       { GET: invoicesGET, POST: invoicesPOST, PUT: invoicesPUT, DELETE: invoicesDELETE },
    "/app/taxes":          { GET: taxesGET, POST: taxesPOST, PUT: taxesPUT, DELETE: taxesDELETE }
};



