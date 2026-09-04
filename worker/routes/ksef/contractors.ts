import {Env} from "../../worker";
import {KsefContractor} from "../../types/ksef";
import {lookupCEIDG} from "../gov/ceidg";
import {lookupVATWhitelist} from "../gov/vat-whitelist";

const lookupOrder = {
    user:     ["CEIDG", "KRS", "VAT_LB"],
    customer: ["KRS", "CEIDG", "VAT_LB"]
} satisfies Record<"user" | "customer", KsefContractor["source"][]>;

export async function contractor(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const nip = url.searchParams.get("nip");
    const profile = url.searchParams.get("profile") as "user" | "customer" ;
    if (!nip || !/^\d{10}$/.test(nip))
        return Response.json({ success: false, error: "Invalid NIP" }, { status: 400 });
    try {
        for (const source of lookupOrder[profile]) {
            try {
                const result = await lookupContractorSource(source, nip, env);
                return Response.json({ success: true, result });
            } catch {
                // Off to the next lookup method
            }
        }
        return Response.json({ success: false, error: "User or contractor not found", nip: nip }, { status: 404 });
    } catch (error) {
        return Response.json({ success: false, error: String(error) }, { status: 502 });
    }
}

async function lookupContractorSource(source: KsefContractor["source"], nip: string, env: Env): Promise<KsefContractor | null> {
    switch (source) {
        case "CEIDG":
            return lookupCEIDG(nip, env);
        case "KRS":
            return lookupCEIDG(nip, env);
        case "VAT_LB":
            return lookupVATWhitelist(nip, env);
    }
}