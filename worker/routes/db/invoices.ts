import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";
import {XMLParser} from "fast-xml-parser";
import {AppCounterparty, AppUser} from "../../types/db";
import {KsefSubject} from "../../types/ksef";
import {getAuthUser} from "../../auth";
import ksefSchema from "../../../resources/schemas/KSeFInvoice.avsc";
import {mapAliases} from "../../avro/invoice";

let repo: Repository;
function getRepo(env: Env): Repository {
    return repo ??= new Repository(new D1Driver(env.D1));
}

export async function get(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env) as AppUser;
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    // Allow to fetch only owned invoices (except for superadmin)
    const filters = authUser.tier === 0 ? {} : { owner_id: authUser.id };
    const rows = id
        ? await getRepo(env).get("invoices", id, filters)
        : await getRepo(env).getAll("invoices", filters);
    if (rows === null)
        return Response.json({ error: "Invoice not found", id: id }, { status: 404 });
    return Response.json(rows, { status: 200 });
}

export async function post(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env) as AppUser;
    const form = await req.formData();
    const file = form.get("file");
    const notes = form.get("notes")?.toString();
    if (!(file instanceof File)) return Response.json({ error: "Missing XML file" }, { status: 400 });
    const rawXml = await file.text();
    // Parse XML
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", removeNSPrefix: true });
    const invoiceXml = parser.parse(rawXml).Faktura;
    const invoice = mapAliases(invoiceXml, ksefSchema);
    // Find or create counterparties
    const sellerId = await getOrCreateCounterparty(env, {
        name: invoice.Seller.IdentificationData.Name,
        nip: invoice.Seller.IdentificationData.NIP,
        country_code: invoice.Seller.Address.CountryCode,
        address_l1: invoice.Seller.Address.AddressLine1
    });
    const buyerId = await getOrCreateCounterparty(env, {
        name: invoice.Buyer.IdentificationData.Name,
        nip: invoice.Buyer.IdentificationData.NIP,
        country_code: invoice.Buyer.Address.CountryCode,
        address_l1: invoice.Buyer.Address.AddressLine1
    });
    // Never allow client to control id, ownership, or creation/update timestamps
    const record = {
        id: crypto.randomUUID(),
        owner_id: authUser.id,
        seller_id: sellerId,
        buyer_id: buyerId,
        country_code: invoice.country_code,
        raw_xml: rawXml,
        json_data: JSON.stringify(invoice),
        notes,
        updated_at: new Date().toISOString()
    };
    try {
        await getRepo(env).save("invoices", record);
        return Response.json({ success: true, id: record.id }, { status: 200 });
    } catch (error) {
        if (String(error).includes("UNIQUE constraint failed"))
            return Response.json({ success: false, error: "Invoice already exists", id: record.id }, { status: 409 });
        throw error;
    }
}

export async function put(_req: Request, _env: Env): Promise<Response> {
    return Response.json({ error: "Invoice update not supported" }, { status: 501 });
}

export async function del(req: Request, env: Env): Promise<Response> {
    const authUser = await getAuthUser(req, env) as AppUser;
    const url = new URL(req.url);
    const id = url.searchParams.get("id")!;
    // Allow to delete only owned invoices (except for superadmin)
    const filters = authUser.tier === 0 ? {} : { owner_id: authUser.id };
    const result = await getRepo(env).delete("invoices", id, filters);
    if (result.changes === 0)
        return Response.json({ success: false, id: id, error: "Invoice not found" }, { status: 404 });
    return Response.json({ success: result.success, id: id }, { status: result.success ? 200 : 400 });
}

// ---------------------------------------------------------------------------------------------------------------------
// Counterparty helpers during invoice creation
// ---------------------------------------------------------------------------------------------------------------------
async function getOrCreateCounterparty(env: Env, subject: {
   name: string;
   nip?: string;
   pesel?: string;
   regon?: string;
   country_code?: string;
   address_l1?: string;
}): Promise<string> {
    const id = getCounterpartyIdentifier(subject);
    const existing = await getRepo(env).getBy("counterparties", id.field, id.value) as AppCounterparty;
    if (existing) return existing.id!;
    const counterparty: AppCounterparty = {
        id: crypto.randomUUID(),
        name: subject.name,
        nip: subject.nip,
        pesel: subject.pesel,
        regon: subject.regon,
        country_code: subject.country_code ?? "PL",
        address_l1: subject.address_l1 ?? "",
        created_at: new Date().toISOString()
    };
    await getRepo(env).save("counterparties", counterparty);
    return counterparty.id!;
}

function getCounterpartyIdentifier(subject: KsefSubject): { field: "nip" | "pesel" | "regon", value: string } {
    if (subject.nip)
        return { field: "nip", value: subject.nip };
    if (subject.pesel)
        return { field: "pesel", value: subject.pesel };
    if (subject.regon)
        return { field: "regon", value: subject.regon };
    throw new Error("Counterparty has no supported fiscal identifier");
}