import {Env} from "./worker";
import {D1Driver, Repository} from "./repository/d1";
import {AppUser} from "./types/db";
import {AuthError, AuthUser} from "./types/auth";

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
        case "/ksef/purchases":
        case "/app/users":
        case "/app/invoices":
        case "/app/counterparties":
        case "/app/taxes":
            // Potential client worker made it through Zero Trust, anything else demand API key
            return req.headers.get("Cf-KSeF-Bot-Jwt") ? true : req.headers.get("X-API-Key") === env.API_KEY;
        // Default
        default:
            return false;
    }
}

/**
 * Can return the application user for the authenticated user, or error HTTP response
 */
export async function getAuthUser(req: Request, env: Env): Promise<AppUser> {
    // For local development without ZeroTrust, always returns the admin user
    if (env.ENVIRONMENT === "dev") {
        return await getRepo(env).get<AppUser>("users", { tier: 0 });
    }
    // TODO: Could come via Cloudflare session or could come by other means (ie: application SSO)
    const whoamiResponse = await whoami(req, env);
    const authUser = (await whoamiResponse.json()) as AuthUser;
    const appUser = await getRepo(env).get<AppUser>("users", { email: authUser.email });
    // This should not happen, we have to enrol users for those who we give access to Cloudflare
    if (!appUser) throw new AuthError("Authenticated user not found in app", 404, { authUser });
    return appUser;
}

/**
 * Get the Cloudflare zero trust user
 */
export async function whoami(req: Request, env: Env): Promise<Response> {
    if (env.ENVIRONMENT === "dev") {
        const adminUser =  await getRepo(env).getAll<AppUser>("users", { tier: 0 });
        return Response.json(adminUser[0]);
    }
    const jwt = req.headers.get("Cf-Access-Jwt-Assertion");
    if (!jwt) throw new Response("Unknown user");
    const user = decodeJWT(jwt);
    console.info("[Whoami] requester:", user);
    return Response.json(user);
}

function decodeJWT(jwt: string): AuthUser {
    const payloadBase64 = jwt.split(".")[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    return { name: payload.name, email: payload.email };
}