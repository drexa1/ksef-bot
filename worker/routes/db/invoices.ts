import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";
import {XMLParser} from "fast-xml-parser";
import {AppCounterparty, AppInvoice, AppUser} from "../../types/db";
import {KsefIdentifiable} from "../../types/ksef";
import {getAuthUser} from "../../auth";
import {dtoFromAliases} from "../../avro/invoice";
import {nanoid} from "nanoid";

let repo: Repository;
function getRepo(env: Env): Repository {
    return repo ??= new Repository(new D1Driver(env.D1));
}

export async function get(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    // Allow to fetch only owned invoices (except for superadmin)
    const filters = appUser.tier === 0 ? {} : { owner_id: appUser.email };
    const rows = id
        ? await getRepo(env).get<AppInvoice>("invoices", { id, ...filters })
        : await getRepo(env).getAll<AppInvoice>("invoices", filters);
    if (!rows)
        return Response.json({  success: false, error: "Invoice not found", id: id }, { status: 404 });
    const result = Array.isArray(rows) ? rows.map(row => JSON.parse(row.json_data)) : JSON.parse(rows.json_data);
    return Response.json(result, { status: 200 });
}

export async function post(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const form = await req.formData();
    const file = form.get("file");
    const notes = form.get("notes")?.toString();
    if (!(file instanceof File)) return Response.json({ error: "Missing XML file" }, { status: 400 });
    const record = await invoiceFromXml(env, req, appUser, file, notes);
    try {
        await getRepo(env).save<AppInvoice>("invoices", record);
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
    const appUser = await getAuthUser(req, env);
    const url = new URL(req.url);
    const id = url.searchParams.get("id")!;
    // Allow to delete only owned invoices (except for superadmin)
    const filters = appUser.tier === 0 ? {} : { owner_id: appUser.email };
    const result = await getRepo(env).delete("invoices", { id, ...filters });
    if (result.changes === 0)
        return Response.json({ success: false, error: "Invoice not found", id: id }, { status: 404 });
    return Response.json({ success: result.success, id: id }, { status: result.success ? 200 : 400 });
}

// ---------------------------------------------------------------------------------------------------------------------
// Invoice record creation
// ---------------------------------------------------------------------------------------------------------------------
async function invoiceFromXml(env: Env, req: Request, authUser: AppUser, file: File, notes?: string): Promise<AppInvoice> {
    // Parse XML
    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, attributeNamePrefix: "", textNodeName: "value"});
    const rawXml = await file.text();
    const invoiceXml = parser.parse(rawXml).Faktura;
    const ksefInvoiceAvroSchema = await env.assets
        .fetch(new URL(env.KSEF_INVOICE_SCHEMA, req.url))
        .then((res) => res.json());
    const ksefInvoice = dtoFromAliases(invoiceXml, ksefInvoiceAvroSchema);
    // Find or create counterparties
    const sellerId = await getOrCreateCounterparty(env, {
        owner_id: authUser.email,
        name: ksefInvoice.Seller.IdentificationData.Name,
        nip: ksefInvoice.Seller.IdentificationData.NIP,
        country_code: ksefInvoice.Seller.Address.CountryCode,
        address_l1: ksefInvoice.Seller.Address.AddressLine1
    });
    const buyerId = await getOrCreateCounterparty(env, {
        owner_id: authUser.email,
        name: ksefInvoice.Buyer.IdentificationData.Name,
        nip: ksefInvoice.Buyer.IdentificationData.NIP,
        country_code: ksefInvoice.Buyer.Address.CountryCode,
        address_l1: ksefInvoice.Buyer.Address.AddressLine1
    });
    return {
        id: ksefInvoice.InvoiceBody.InvoiceNumber,
        owner_id: authUser.email,
        seller_id: sellerId,
        buyer_id: buyerId,
        ...(ksefInvoice.country_code && {country_code: ksefInvoice.country_code}),
        raw_xml: rawXml,
        json_data: JSON.stringify(ksefInvoice),
        notes: notes ?? null,
        updated_at: new Date().toISOString()
    };
}

// ---------------------------------------------------------------------------------------------------------------------
// Counterparty helpers during invoice creation
// ---------------------------------------------------------------------------------------------------------------------
async function getOrCreateCounterparty(env: Env, counterpartyParts: {
    owner_id: string
    name: string
    nip?: string
    pesel?: string
    regon?: string
    country_code?: string
    address_l1?: string
}): Promise<string> {
    const { idField, idValue } = getCounterpartyIdentifier(counterpartyParts);
    const existing = await getRepo(env).get<AppCounterparty>("counterparties", { [idField]: idValue });
    if (existing) return existing.id!;
    const counterparty: AppCounterparty = {
        id: nanoid(),
        ...({ owner_id: counterpartyParts.owner_id }),
        name: counterpartyParts.name,
        ...(counterpartyParts.nip   && { nip:   counterpartyParts.nip }),
        ...(counterpartyParts.pesel && { pesel: counterpartyParts.pesel }),
        ...(counterpartyParts.regon && { regon: counterpartyParts.regon }),
        country_code: counterpartyParts.country_code ?? "PL",
        address_l1: counterpartyParts.address_l1 ?? "",
        created_at: new Date().toISOString(),
    };
    await getRepo(env).save("counterparties", counterparty);
    return counterparty.id!;
}

function getCounterpartyIdentifier(counterpartyParts: KsefIdentifiable): { idField: "nip" | "pesel" | "regon", idValue: string } {
    if (counterpartyParts.nip)
        return { idField: "nip", idValue: counterpartyParts.nip };
    if (counterpartyParts.pesel)
        return { idField: "pesel", idValue: counterpartyParts.pesel };
    if (counterpartyParts.regon)
        return { idField: "regon", idValue: counterpartyParts.regon };
    throw new Error("Counterparty has no supported fiscal identifier");
}