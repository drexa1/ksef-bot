import {Env} from "../../worker";

export async function get(req: Request, env: Env): Promise<Response> {
    return Response.json(null);
}

export async function post(req: Request, env: Env): Promise<Response> {
    // TODO: offer endpoint for JSON and from XML
    return Response.json(null);
}