import {Env} from "../../worker";

export async function fromVATWhitelist(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const nip = url.searchParams.get("nip");
    const date = new Date().toISOString().substring(0, 10);
    if (!nip || !/^\d{10}$/.test(nip))
        return Response.json({ success: false, error: "Invalid NIP" }, { status: 400 });
    try {
        const response = await fetch(`${env.VAT_WL_URL}/${nip}?date=${date}`, { headers:
            { Accept: "application/json" }
        });
        const result = await response.json();
        return Response.json({ success: response.ok, result, ...(!response.ok && { error: "White List lookup failed." })}, { status: response.status });
    } catch (error: any) {
        return Response.json({ success: false, error: String(error) }, { status: 502 });
    }
}