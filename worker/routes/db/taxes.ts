import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";
import {AppTaxRecord, AppTaxRecordUpdate} from "../../types/db";
import {getAuthUser} from "../../auth";
import {nanoid} from "nanoid";
import {downloadKsefInvoices} from "../ksef/ksef";

let repo: Repository;
function getRepo(env: Env): Repository {
    return repo ??= new Repository(new D1Driver(env.D1));
}

export async function get(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    // Allow to fetch only owned tax records (except for superadmin)
    const filters = appUser.tier === 0 ? {} : { owner_id: appUser.email };
    const rows = id
        ? await getRepo(env).get<AppTaxRecord>("taxes", { id, ...filters })
        : await getRepo(env).getAll<AppTaxRecord>("taxes", filters);
    if (rows === null)
        return Response.json({ success: false, error: "Tax record not found", id: id }, { status: 404 });
    return Response.json(rows, { status: 200 });
}

export async function post(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const payload = await req.json() as AppTaxRecord;
    const from = new Date(payload.from);
    const to = new Date(payload.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime()))
        return Response.json({ success: false, error: "Invalid date parameters" }, { status: 400 });
    // Never allow client to control id, ownership, or creation/update timestamps
    const { id, created_at, updated_at, ...payloadData } = payload;
    // VAT
    const varPercentage = payload.vat_percentage ?? env.DEFAULT_VAT_PERCENTAGE;
    const vatAmount = payload.brut_income * varPercentage / 100;
    const netBeforeObligations = payload.brut_income - vatAmount;
    // Obligations
    const taxRate = payload.tax_rate ?? env.DEFAULT_TAX_RATE;
    const incomeTax = payload.income_tax * taxRate / 100;
    const healthInsuranceBase = payload.health_insurance_base ?? env.DEFAULT_HEALTH_INSURANCE_BASE;
    const healthInsuranceRate = payload.health_insurance_rate ?? env.DEFAULT_HEALTH_INSURANCE_RATE;
    const healthContribution = healthInsuranceBase * healthInsuranceRate / 100;
    // Purchases/expenses deductions
    const purchaseInvoices = await downloadKsefInvoices(env, appUser, "Subject2", from, to);
    const purchasesDeductions = 0;
    // Total after obligations and expenses deductions
    const totalCleanRevenue = (netBeforeObligations - incomeTax - healthContribution) + purchasesDeductions;
    const record = {
        ...payloadData,
        id: nanoid(),
        owner_id: appUser.email,
        vat_percentage: varPercentage,
        vat_amount: vatAmount,
        net_before_obligations: netBeforeObligations,
        tax_rate: taxRate,
        income_tax: incomeTax,
        health_insurance_base: healthInsuranceBase,
        health_insurance_rate: healthInsuranceRate,
        health_contribution: healthContribution,
        total_clean_revenue: totalCleanRevenue,
        ...(payload.notes && { notes: payload.notes }),
        updated_at: new Date().toISOString()
    };
    try {
        await getRepo(env).save<AppTaxRecord>("taxes", record);
        return Response.json({ success: true, id: record.id }, { status: 200 });
    } catch (error) {
        if (String(error).includes("UNIQUE constraint failed"))
            return Response.json({ success: false, error: "Tax record already exists", id: record.id }, { status: 409 });
        throw error;
    }
}

export async function put(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const payload = await req.json() as AppTaxRecord & { owner_id?: string };
    // Never allow client to change id, ownership, or creation/update timestamp
    const { id, owner_id, created_at, updated_at, ...updatePayload } = payload;
    const result = await getRepo(env).update<AppTaxRecordUpdate>("taxes", {
        ...updatePayload,
        updated_at: new Date().toISOString()
    }, { id, owner_id: appUser.email });
    if (result.changes === 0)
        return Response.json({ success: false, error: "Tax record not found", id: id }, { status: 404 });
    return Response.json({ success: true, id: id }, { status: result.success ? 200 : 400 });
}

export async function del(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const url = new URL(req.url);
    const id = url.searchParams.get("id")!;
    // Allow to delete only owned tax records (except for superadmin)
    const filters = appUser.tier === 0 ? {} : { owner_id: appUser.email };
    const result = await getRepo(env).delete("taxes", { id, ...filters });
    if (result.changes === 0)
        return Response.json({ success: false, error: "Tax record not found", id: id }, { status: 404 });
    return Response.json({ success: result.success, id: id }, { status: result.success ? 200 : 400 });
}