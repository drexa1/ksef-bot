import {Env} from "./ksef.worker";
import {openApiSpec, swaggerHtml} from "./api/openapi";
import {scalarHtml} from "./api/scalar";
import {get as healthGET} from "./routes/health";
import {whoami as whoamiGET} from "./auth";
import {get as invoicesGET, post as invoicesPOST} from "./routes/ksef";

export type Routes = Partial<Record<Method, Route>>;
export type Method = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";
export type Route = (req: Request, env: Env) => Promise<Response>;

export const routes: Record<string, Routes> =  {
    // Don't use redirection at root, in this case we serve the static assets
    "/openapi.json": { GET: async () => Response.json(openApiSpec) },
    "/swagger":      { GET: async () => new Response(swaggerHtml, { headers: { "Content-Type": "text/html" }}) },
    "/docs":         { GET: async () => new Response(scalarHtml, { headers: { "Content-Type": "text/html" }}) },
    "/health":       { GET: healthGET },
    // Requiring authentication
    "/whoami":       { GET: whoamiGET },
    "/ksef":         { GET: invoicesGET, POST: invoicesPOST },
    "/db":            {  }
};