import {Env} from "./worker";
import {D1Driver, Repository} from "./repository/d1";
import {AppUser} from "./types/db";
import {AuthError} from "./types/auth";

let repo: Repository;
function getRepo(env: Env): Repository {
    return repo ??= new Repository(new D1Driver(env.D1));
}

export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};

export const withCors = ( res: Response) => {
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
        headers.set(k, v);
    }
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
};

/**
 * Potential client made it through Zero Trust.
 */
export async function auth(req: Request, env: Env): Promise<boolean> {
    const url = new URL(req.url);
    switch (url.pathname) {
        // Public routes
        case "/":
        case "/openapi.json":
        case "/swagger":
        case "/docs":
        case "/health":
            return true;
        // Protected routes
        case "/whoami":
        case "/ksef/sales":
        case "/ksef/sales/sessions":
        case "/ksef/sales/status":
        case "/ksef/sales/receipt":
        case "/ksef/purchases":
        case "/app/users":
        case "/app/invoices":
        case "/app/invoices/pii":
        case "/app/customers":
        case "/app/taxes":
            return req.headers.get("X-API-Key") === env.API_KEY;
        // Default
        default:
            return false;
    }
}

/**
 * Returns the application user for the authenticated user.
 */
export async function getAuthUser(req: Request, env: Env): Promise<AppUser> {
    const whoamiResponse = await whoami(req, env);
    const userId = await whoamiResponse.json();
    const appUser = await getRepo(env).get<AppUser>("users", { email: userId });
    // This should not happen, we have to enrol users for those who we give access to Cloudflare
    if (!appUser) throw new AuthError("Authenticated user not found in app", 404, { userId });
    return appUser;
}

/**
 * Get the Cloudflare trusted client user.
 */
export async function whoami(req: Request, env: Env): Promise<Response> {
    // For local development without ZeroTrust, return the admin user just to simplify testing...
    if (env.ENVIRONMENT === "dev") {
        const adminUser =  await getRepo(env).getAll<AppUser>("users", { tier: 0 });
        return Response.json(adminUser[0].email);
    }
    // Zero trust logged user
    const jwt = req.headers.get("Cf-Access-Jwt-Assertion");
    // User identifier/email from client that made it through Zero Trust
    const userId = jwt ? decodeJWT(jwt).email : req.headers.get("X-User-Id");
    if (!userId) throw new AuthError("Unauthenticated user", 401);
    console.info("[Whoami] requester:", userId);
    return Response.json(userId);
}

function decodeJWT(jwt: string): { name: string, email: string } {
    const payloadBase64 = jwt.split(".")[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    return { name: payload.name, email: payload.email };
}