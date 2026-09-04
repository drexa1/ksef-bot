import {Env} from "../../worker";

/**
 * Search by Tax Identification Number in the Central Register on Business Activity.
 */
export async function fromCEIDG(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const nip = url.searchParams.get("nip");
    if (!nip || !/^\d{10}$/.test(nip))
        return Response.json({ success: false, error: "Invalid NIP" }, { status: 400 });
    try {
        const searchResponse = await fetch(`${env.CEIDG_URL}/firmy?nip=${nip}`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${env.CEIDG_API_KEY}` }
        });
        const searchResult = await searchResponse.json() as { firma?: { id: string }[] };
        if (!searchResponse.ok)
            return Response.json({ success: false, result: searchResult }, { status: searchResponse.status });
        const firm = searchResult.firma?.[0];
        if (!firm?.id)
            return Response.json({ success: false, error: "Firm not found in CEIDG" }, { status: 404 });
        const detailsResponse = await fetch(`${env.CEIDG_URL}/firma/${firm.id}`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${env.CEIDG_API_KEY}` }
        });
        const result = await detailsResponse.json();
        return Response.json({ success: detailsResponse.ok, result }, { status: detailsResponse.status });
    } catch (error: any) {
        return Response.json({ success: false, error: String(error) }, { status: 502 });
    }
}