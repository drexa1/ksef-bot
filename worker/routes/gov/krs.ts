import {Env} from "../../worker";
import {KsefContractor} from "../../types/ksef";
import {dtoFromAliases} from "../../dto/avro";
import {encodeToken} from "./krs-apikey";

// noinspection JSUnusedGlobalSymbols
export async function fromKRS(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const nip = url.searchParams.get("nip");
    if (!nip || !/^\d{10}$/.test(nip))
        return Response.json({ success: false, error: "Invalid NIP" }, { status: 400 });
    try {
        const result = await lookupKRS(nip, env);
        if (!result)
            return Response.json({ success: false, error: "Firm not found in KRS" }, { status: 404 });
        return Response.json({ success: true, result });
    } catch (error: any) {
        return Response.json({ success: false, error: String(error) }, { status: 502 });
    }
}

/**
 * Search by Tax Identification Number in the National Court Registry.
 */
export async function lookupKRS(nip: string, env: Env): Promise<KsefContractor> {
    const timestamp = new Date().toISOString().slice(0, 19);
    const apiKey = encodeToken("0000000000", timestamp);
    const searchResponse = await fetch(`${env.KRS_SEARCH_URL}/api/wyszukiwarka/krs`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0",
            Apikey: apiKey
        },
        body: JSON.stringify({ podmiot: { nip }, rejestr: ["P", "S"], paginacja: {} })
    });
    const searchResult = await searchResponse.json() as { [key: string]: any };
    if (!searchResponse.ok)
        throw new Error(`KRS NIP lookup failed: ${searchResponse.status}`);
    const krsNumber = searchResult?.["listaPodmiotow"]?.[0]?.["numer"];
    const detailsResponse = await fetch(`${env.KRS_API_URL}/api/krs/OdpisAktualny/${krsNumber}`, {
        headers: { Accept: "application/json" }
    });
    if (!detailsResponse.ok)
        throw new Error(`KRS details lookup failed: ${detailsResponse.status}`);
    const details = await detailsResponse.json();
    const krsSchema = await env.assets.fetch(new URL(env.KRS_LOOKUP_SCHEMA)).then(res => res.json());
    return mapKRS(details, krsSchema);
}

function mapKRS(response: any, schema: any): KsefContractor {
    const dto = dtoFromAliases(response, schema);
    const header = dto.copy?.header;
    const company = dto.copy?.data?.section1?.entityData;
    const registeredOffice = dto.copy?.data?.section1?.registeredOfficeAndAddress;
    const address = registeredOffice?.address;
    const addressLine = [
        address?.city,
        address?.postalCode,
        [address?.street, address?.buildingNumber]
            .filter(Boolean)
            .join(" ")
    ].filter(Boolean).join(", ");
    return {
        source: "KRS",
        nip: company.identifiers.nip,
        regon: company.identifiers.regon?.slice(0, 9),
        name: company.name,
        countryCode: address?.country,
        addressLine: addressLine,
        registrationDate: header?.registrationDate,
        status: header?.positionStatus === 1 ? "ACTIVE" : undefined,
        electronicDeliveryAddress: registeredOffice?.electronicDeliveryAddress
    };
}