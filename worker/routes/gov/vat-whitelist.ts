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
        const result = await lookupVATPayersWhitelist(nip, env);
        return Response.json({ success: true, result });
    } catch (error: any) {
        return Response.json({ success: false, error: String(error) }, { status: 502 });
    }
}

/**
 * Search by Tax Identification Number in the VAT payers whitelist.
 */
export async function lookupVATPayersWhitelist(nip: string, env: Env): Promise<KsefContractor> {
    const date = new Date().toISOString().substring(0, 10);
    const lbLookup = await fetch(`${env.VAT_LB_URL}/${nip}?date=${date}`, {
        headers: { Accept: "application/json" }
    });
    if (!lbLookup.ok)
        throw new Error(`VAT whitelist lookup failed: ${lbLookup.status}`);
    const vatPayer = await lbLookup.json() as { result?: { subject?: { nip?: string }} };
    if (!vatPayer?.result?.subject?.nip)
        throw new Error(`No VAT payers whitelist entry found for NIP ${nip}`);
    const vatWhitelistLookupAvroSchema = await env.assets.fetch(new URL(env.VAT_LB_LOOKUP_SCHEMA)).then(res => res.json());
    return mapVATWhitelist(vatPayer, vatWhitelistLookupAvroSchema);
}

function mapVATWhitelist(result: any, schema: any): KsefContractor {
    const dto = dtoFromAliases(result, schema);
    const subject = dto.result?.subject;
    return {
        source: "VAT_LB",
        name: subject?.name,
        nip: subject?.nip,
        regon: subject?.regon ?? undefined,
        countryCode: "PL",
        addressLine: subject?.workingAddress ?? subject?.residenceAddress ?? undefined,
        active: subject?.status === "ACTIVE"
    };
}