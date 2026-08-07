import {Env} from "./worker";
import {openApiSpec, swaggerHtml} from "./api/openapi";
import {scalarHtml} from "./api/scalar";
import {get as healthGET} from "./routes/health/health";
import {corsHeaders, whoami as whoamiGET} from "./auth";
import {get as salesGET, post as salesPOST} from "./routes/ksef/ksef.sales";
import {get as expensesGET} from "./routes/ksef/ksef.expenses";
import {del as usersDELETE, get as usersGET, post as usersPOST, put as usersPUT} from "./routes/db/users";
import {
    del as counterpartiesDELETE,
    get as counterpartiesGET,
    post as counterpartiesPOST,
    put as counterpartiesPUT
} from "./routes/db/counterparties";
import {
    del as invoicesDELETE,
    get as invoicesGET,
    post as invoicesPOST,
    put as invoicesPUT
} from "./routes/db/invoices";
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
                return Response.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
            }
        };
    }
    return routesWithAuth;
};

export const routes: Record<string, Routes> =  {
    // Don't use redirection at root, in this case we serve the static assets
    "/openapi.json":       { GET: async () => Response.json(openApiSpec) },
    "/swagger":            { GET: async () => new Response(swaggerHtml, { headers: { "Content-Type": "text/html" }}) },
    "/docs":               { GET: async () => new Response(scalarHtml, { headers: { "Content-Type": "text/html" }}) },
    "/health":             { GET: healthGET },
    // Requiring authentication
    "/whoami":             withErrorHandling({ GET: whoamiGET }),
    "/ksef/sales":         withErrorHandling({ GET: salesGET, POST: salesPOST }),
    "/ksef/expenses":      withErrorHandling({ GET: expensesGET }),
    "/app/users":          withErrorHandling({ GET: usersGET, POST: usersPOST, PUT: usersPUT, DELETE: usersDELETE }),
    "/app/counterparties": withErrorHandling({ GET: counterpartiesGET, POST: counterpartiesPOST, PUT: counterpartiesPUT, DELETE: counterpartiesDELETE }),
    "/app/invoices":       withErrorHandling({ GET: invoicesGET, POST: invoicesPOST, PUT: invoicesPUT, DELETE: invoicesDELETE }),
    "/app/taxes":          withErrorHandling({ GET: taxesGET, POST: taxesPOST, PUT: taxesPUT, DELETE: taxesDELETE })
};



