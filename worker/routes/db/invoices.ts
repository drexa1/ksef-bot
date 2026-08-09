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
    // Allow to fetch only owned invoices (except for superadmin)
    const filters: Record<string, any> = appUser.tier === 0 ? {} : { ownerId: appUser.email };
    for (const [key, value] of url.searchParams.entries()) {
        filters[key] = value;
    }
    const rows = Object.keys(filters).length
        ? await getRepo(env).get<AppInvoice>("invoices", filters)
        : await getRepo(env).getAll<AppInvoice>("invoices");
    if (!rows)
        return Response.json({ success: false, error: "Invoices not found", filters }, { status: 404 });
    const result = Array.isArray(rows) ? rows.map(row => JSON.parse(row.jsonData)) : JSON.parse(rows.jsonData);
    return Response.json(result, { status: 200 });
}

export async function post(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const form = await req.formData();
    const file = form.get("file");
    const notes = form.get("notes")?.toString();
    if (!(file instanceof File)) return Response.json({ error: "Missing XML file" }, { status: 400 });
    const record = await invoiceFromXml(env, await file.text(), appUser, notes);
    try {
        await getRepo(env).save<AppInvoice>("invoices", record);
        return Response.json({ success: true, id: record.id }, { status: 201 });
    } catch (error) {
        if (String(error).includes("UNIQUE constraint failed"))
            return Response.json({ success: false, error: "Invoice already exists", id: record.id }, { status: 409 });
        throw error;
    }
}

export async function put(_req: Request, _env: Env): Promise<Response> {
    return Response.json({ error: "Updating invoices is forbidden" }, { status: 405 });
}

export async function del(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const url = new URL(req.url);
    // Allow to delete only owned invoices (except for superadmin)
    const filters: Record<string, any> = {};
    for (const [key, value] of url.searchParams.entries()) {
        filters[key] = value;
    }
    if (appUser.tier !== 0) filters.ownerId = appUser.email;
    const result = await getRepo(env).delete("invoices", filters);
    if (result.changes === 0)
        return Response.json({ success: false, error: "Invoices not found", filters }, { status: 404 });
    return Response.json({ success: result.success, changes: result.changes, ...filters }, { status: 200 });
}

// ---------------------------------------------------------------------------------------------------------------------
// Invoice record creation
// ---------------------------------------------------------------------------------------------------------------------

const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, textNodeName: "value", attributeNamePrefix: "" });
export async function invoiceFromXml(env: Env, xmlContent: string, authUser: AppUser, notes?: string): Promise<AppInvoice & { ownerId: string }> {
    // Parse XML
    const invoiceXml = parser.parse(xmlContent).Faktura;
    const ksefInvoiceAvroSchema = await env.assets.fetch(new URL(env.KSEF_INVOICE_SCHEMA)).then((res) => res.json());
    const ksefInvoice = dtoFromAliases(invoiceXml, ksefInvoiceAvroSchema);
    // Find or create counterparties
    const sellerId = await getOrCreateCounterparty(env, {
        ownerId: authUser.email,
        name: ksefInvoice.Seller.IdentificationData.Name,
        nip: ksefInvoice.Seller.IdentificationData.NIP,
        countryCode: ksefInvoice.Seller.Address.CountryCode,
        addressL1: ksefInvoice.Seller.Address.AddressLine1
    });
    const buyerId = await getOrCreateCounterparty(env, {
        ownerId: authUser.email,
        name: ksefInvoice.Buyer.IdentificationData.Name,
        nip: ksefInvoice.Buyer.IdentificationData.NIP,
        countryCode: ksefInvoice.Buyer.Address.CountryCode,
        addressL1: ksefInvoice.Buyer.Address.AddressLine1
    });
    return {
        id: ksefInvoice.InvoiceBody.InvoiceNumber,
        ownerId: authUser.email,
        sellerId: sellerId,
        buyerId: buyerId,
        rawXml: xmlContent,
        jsonData: JSON.stringify(ksefInvoice),
        ...(notes && { notes }),
        updatedAt: new Date().toISOString()
    };
}

async function getOrCreateCounterparty(env: Env, counterpartyParts: {
    ownerId: string
    name: string
    nip?: string
    pesel?: string
    regon?: string
    countryCode?: string
    addressL1?: string
}): Promise<string> {
    const { idField, idValue } = getCounterpartyIdentifier(counterpartyParts);
    const existing = await getRepo(env).get<AppCounterparty>("counterparties", { [idField]: idValue });
    if (existing) return existing.id!;
    const counterparty: AppCounterparty = {
        id: nanoid(),
        ...({ ownerId: counterpartyParts.ownerId }),
        name: counterpartyParts.name,
        ...(counterpartyParts.nip   && { nip:   counterpartyParts.nip }),
        ...(counterpartyParts.pesel && { pesel: counterpartyParts.pesel }),
        ...(counterpartyParts.regon && { regon: counterpartyParts.regon }),
        countryCode: counterpartyParts.countryCode ?? "PL",
        addressL1: counterpartyParts.addressL1 ?? "",
        createdAt: new Date().toISOString(),
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