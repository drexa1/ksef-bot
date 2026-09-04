import {Env} from "../../worker";
import {KsefContractor} from "../../types/ksef";
import {dtoFromAliases} from "../../dto/avro";

// noinspection JSUnusedGlobalSymbols
export async function fromCEIDG(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const nip = url.searchParams.get("nip");
    if (!nip || !/^\d{10}$/.test(nip))
        return Response.json({ success: false, error: "Invalid NIP" }, { status: 400 });
    try {
        const result = await lookupCEIDG(nip, env);
        if (!result)
            return Response.json({ success: false, error: "Firm not found in CEIDG" }, { status: 404 });
        return Response.json({ success: true, result });
    } catch (error: any) {
        return Response.json({ success: false, error: String(error) }, { status: 502 });
    }
}

/**
 * Search by Tax Identification Number in the Central Register on Business Activity.
 */
export async function lookupCEIDG(nip: string, env: Env): Promise<KsefContractor> {
    const ceidgLookup = await fetch(`${env.CEIDG_URL}/firmy?nip=${nip}`, { headers: {
        Accept: "application/json", Authorization: `Bearer ${env.CEIDG_API_KEY}`
    }});
    if (!ceidgLookup.ok)
        throw new Error(`CEIDG NIP lookup failed: ${ceidgLookup.status}`);
    const lookupResponse = await ceidgLookup.json() as { firma?: { id: string }[] };
    const firm = lookupResponse["firma"]?.[0]!;
    const ceidgDetails = await fetch(`${env.CEIDG_URL}/firma/${firm.id}`, { headers: {
        Accept: "application/json", Authorization: `Bearer ${env.CEIDG_API_KEY}`
    }});
    if (!ceidgDetails.ok)
        throw new Error(`CEIDG details lookup failed: ${ceidgDetails.status}`);
    const details = await ceidgDetails.json();
    const ceidgSchema = await env.assets.fetch(new URL(env.CEIDG_LOOKUP_SCHEMA)).then(res => res.json());
    return mapCEIDG(details, ceidgSchema);
}

function mapCEIDG(response: any, schema: any): KsefContractor {
    const dto = dtoFromAliases(response, schema);
    const company = dto.companies?.[0];
    const address = company.correspondenceAddress;
    const building = [address?.buildingNumber, address?.apartmentNumber ? `/${address.apartmentNumber}` : undefined].filter(Boolean).join("");
    return {
        source: "CEIDG",
        name: company.name,
        nip: company.owner.nip,
        regon: company.owner.regon,
        countryCode: address?.countryCode,
        addressLine: [address?.city, address?.postalCode, building].filter(Boolean).join(", "),
        citizenship: company.citizenships?.map((c: { countryCode: string }) => c.countryCode).filter(Boolean),
        registrationDate: company.startDate,
        status: company.status,
        electronicDeliveryAddress: company.electronicDeliveryAddress
    };
}