import {Method, routes} from "./routes";
import {corsHeaders, auth, withCors} from "./auth";

export interface Env {
    ENVIRONMENT: "dev" | "cloudflare";
    WHO_SPEAKS: KVNamespace;
    VECTORIZE: VectorizeIndex;
    API_KEY: string;
    VECTORIZE_TOP_K: number;
    VECTORIZE_SIMILARITY_THRESHOLD: number;
}

// noinspection JSUnusedGlobalSymbols
export default {
    async fetch(req: Request, env: Env): Promise<Response> {
        if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
        const url = new URL(req.url);
        if (!await auth(req, env)) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
        const routePath = routes[url.pathname];
        if (!routePath) return new Response("Not Found", { status: 404, headers: corsHeaders });
        const route = routePath[req.method as Method]!;
        const response = await route(req, env);
        return withCors(response);
    }
};