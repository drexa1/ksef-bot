import {Env} from "../../worker";
import {KsefContractor} from "../../types/ksef";
import {dtoFromAliases} from "../../dto/avro";

// noinspection JSUnusedGlobalSymbols
export async function fromVATWhitelist(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const nip = url.searchParams.get("nip");
    if (!nip || !/^\d{10}$/.test(nip))
        return Response.json({ success: false, error: "Invalid NIP" }, { status: 400 });
    try {
        const result = await lookupVATWhitelist(nip, env);
        return Response.json({ success: true, result });
    } catch (error: any) {
        return Response.json({ success: false, error: String(error) }, { status: 502 });
    }
}

/**
 * Search by Tax Identification Number in the VAT payers whitelist.
 */
export async function lookupVATWhitelist(nip: string, env: Env): Promise<KsefContractor> {
    const date = new Date().toISOString().substring(0, 10);
    const response = await fetch(`${env.VAT_LB_URL}/${nip}?date=${date}`, { headers: { Accept: "application/json" }});
    if (!response.ok) {
        if (response.status === 404)
            throw new Error("Contractor not found in VAT whitelist");
        throw new Error(`VAT whitelist lookup failed: ${response.status}`);
    }
    const result = await response.json();
    const schema = await env.assets.fetch(new URL(env.VAT_LB_LOOKUP_SCHEMA)).then(res => res.json());
    return mapVATWhitelist(result, schema);
}

function mapVATWhitelist(response: any, schema: any): KsefContractor {
    const dto = dtoFromAliases(response, schema);
    const subject = dto.result?.subject;
    if (!subject?.nip || !subject?.name)
        throw new Error("Contractor not found in VAT whitelist");
    return {
        source: "VAT_LB",
        nip: subject.nip,
        regon: subject.regon,
        name: subject.name,
        countryCode: "PL",
        addressLine: subject.workingAddress ?? subject.residenceAddress,
        registrationDate: subject.registrationLegalDate,
        status: subject.statusVat
    };
}