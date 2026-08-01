import {Env} from "./worker";
import {D1Driver, Repository} from "./repository/d1";
import {AppUser} from "./routes/db/users";

export type AuthUser = { name?: string, email?: string };

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
        case "/ksef":
        case "/db/users":
        case "/db/invoices":
        case "/db/counterparties":
            // Potential client worker made it through Zero Trust, anything else demand API key
            return req.headers.get("Cf-KSeF-Bot-Jwt") ? true : req.headers.get("X-API-Key") === env.API_KEY;
        // Default
        default:
            return false;
    }
}

export async function getAuthUser(req: Request, env: Env): Promise<AppUser> {
    const whoamiResponse = await whoami(req, env);
    const authUser = (await whoamiResponse.json()) as AuthUser;
    // TODO: Could come via Cloudflare session or could come by other means (ie: application SSO)
    const dbUser = await getRepo(env).getBy("users", "email", authUser.email) as AppUser;
    if (!dbUser) throw new Response("User not found", { status: 401 });
    return dbUser;
}

/**
 * Get the Cloudflare zero trust user
 */
export async function whoami(req: Request, _env: Env): Promise<Response> {
    const jwt = req.headers.get("Cf-Access-Jwt-Assertion");
    if (!jwt) throw new Response("Unknown user", { status: 401 });
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