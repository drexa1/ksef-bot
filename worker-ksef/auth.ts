import {Env} from "./ksef.worker";

export type AuthUser = { name?: string; email?: string };

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

export async function isOwner(req: Request, env: Env, resource: any) {
    const authResponse = await whoami(req, env);
    const currentUser = (await authResponse.json()) as AuthUser;
    console.info("[Auth] user", currentUser, "requesting access to:", resource.metadata);
    if (deserializeOwner(resource.metadata?.owner) !== deserializeOwner(currentUser))
        throw new Response("Unauthorized", { status: 401 });
    console.info("[Auth] access granted");
}

export async function whoami(req: Request, _env: Env): Promise<Response> {
    // Who has passed Zero Trust for this worker
    const jwt = req.headers.get("Cf-Access-Jwt-Assertion");
    if (!jwt) throw new Response("Unknown user", { status: 401 });
    const user = decodeJWT(jwt);
    console.info("[Whoami] requester:", user);
    return Response.json(user);
}

export function decodeJWT(jwt: string): AuthUser {
    const payloadBase64 = jwt.split(".")[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    return { name: payload.name, email: payload.email };
}

function deserializeOwner(owner: any) {
    return JSON.stringify(owner, Object.keys(owner).sort());
}