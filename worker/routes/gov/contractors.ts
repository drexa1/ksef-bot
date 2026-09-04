import {Env} from "../../worker";
import {KsefContractor} from "../../types/ksef";
import {lookupCEIDG} from "./ceidg";
import {lookupVATPayersWhitelist} from "./vat-whitelist";
import {lookupKRS} from "./krs";

/**
 * In which order to query the different gov.pl endpoints for contractor information
 * For the current user: assume is a JDG and if not try as KRS company
 * For a customer contractor: assume is a KRS company and if not try with JDG's
 * If nothing works, try to find the look for the details as VAT payer.
 */
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
                return Response.json(result);
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
            return lookupKRS(nip, env);
        case "VAT_LB":
            return lookupVATPayersWhitelist(nip, env);
    }
}