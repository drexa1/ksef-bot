import {Env} from "./worker";
import {swaggerHtml, getOpenApiSpec} from "./api/openapi";
import {scalarHtml} from "./api/scalar";
import {get as healthGET} from "./routes/health/health";
import {corsHeaders, whoami as whoamiGET} from "./auth";
import {get as salesGET, post as salesPOST, invoiceStatus as invoiceStatusGET, downloadReceipt as receiptGET} from "./routes/ksef/sales";
import {get as purchaseGET} from "./routes/ksef/purchases";
import {get as usersGET, post as usersPOST, put as usersPUT, del as usersDELETE} from "./routes/db/users";
import {get as customersGET, post as customersPOST, put as customersPUT, del as customersDELETE} from "./routes/db/customers";
import {get as invoicesGET, post as invoicesPOST, put as invoicesPUT, del as invoicesDELETE} from "./routes/db/invoices";
import {post as piiPOST} from "./routes/db/invoices-pii";
import {del as taxesDELETE, get as taxesGET, post as taxesPOST, put as taxesPUT} from "./routes/db/taxes";
import {AuthError} from "./types/auth";

export type Routes = Partial<Record<Method, Route>>;
export type Method = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";
export type Route = (req: Request, env: Env) => Promise<Response>;

const withErrorHandling = (routes: Routes): Routes => {
    const routesWithAuth: Routes = {};
    for (const [method, route] of Object.entries(routes)) {
        routesWithAuth[method as Method] = async (req: Request, env: Env) => {
            try {
                return await route(req, env);
            } catch (error: unknown) {
                console.error(error);
                if (error instanceof AuthError)
                    return Response.json({ error: error.message, details: error.details }, { status: error.status, headers: corsHeaders });
                return Response.json({ error: error }, { status: 500, headers: corsHeaders });
            }
        };
    }
    return routesWithAuth;
};

export const routes: Record<string, Routes> =  {
    // Don't use redirection at root, in this case we serve the static assets
    "/openapi.json":        { GET: async (_, env) => Response.json(getOpenApiSpec(env)) },
    "/swagger":             { GET: async () => new Response(swaggerHtml, { headers: { "Content-Type": "text/html" }}) },
    "/docs":                { GET: async () => new Response(scalarHtml, { headers: { "Content-Type": "text/html" }}) },
    "/health":              { GET: healthGET },
    // Requiring authentication
    "/whoami":                      withErrorHandling({ GET: whoamiGET }),
    "/ksef/sales":                  withErrorHandling({ GET: salesGET, POST: salesPOST }),
    "/ksef/sales/status":           withErrorHandling({ GET: invoiceStatusGET }),
    "/ksef/sales/receipt":          withErrorHandling({ GET: receiptGET }),
    "/ksef/purchases":              withErrorHandling({ GET: purchaseGET }),
    "/app/users":                   withErrorHandling({ GET: usersGET, POST: usersPOST, PUT: usersPUT, DELETE: usersDELETE }),
    "/app/customers":               withErrorHandling({ GET: customersGET, POST: customersPOST, PUT: customersPUT, DELETE: customersDELETE }),
    "/app/invoices":                withErrorHandling({ GET: invoicesGET, POST: invoicesPOST, PUT: invoicesPUT, DELETE: invoicesDELETE }),
    "/app/invoices/pii":            withErrorHandling({ POST: piiPOST }),
    "/app/taxes":                   withErrorHandling({ GET: taxesGET, POST: taxesPOST, PUT: taxesPUT, DELETE: taxesDELETE })
};



