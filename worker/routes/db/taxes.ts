import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";
import {AppTaxRecord, AppTaxRecordUpdate} from "../../types/db";
import {getAuthUser} from "../../auth";
import {downloadKsefInvoices} from "../ksef/ksef";

let repo: Repository;
function getRepo(env: Env): Repository {
    return repo ??= new Repository(new D1Driver(env.D1));
}

export async function get(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const from = fromParam ? new Date(fromParam) : null;
    const to = toParam ? new Date(toParam) : null;
    if ((fromParam && !toParam) || (!fromParam && toParam))
        return Response.json({ success: false, error: "From and To are required together" }, { status: 400 });
    if (from && to && (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to))
        return Response.json({ success: false, error: "Invalid date parameters" }, { status: 400 });
    // Allow to fetch only owned tax records (except for superadmin)
    const filters = appUser.tier === 0 ? {} : { owner_id: appUser.email };
    const rows = fromParam && toParam
        ? await getRepo(env).get<AppTaxRecord>("taxes", { from: fromParam, to: toParam, ...filters })
        : await getRepo(env).getAll<AppTaxRecord>("taxes", filters);
    if (rows === null)
        return Response.json({ success: false, error: "Tax record not found", from: from, to: to }, { status: 404 });
    return Response.json(rows, { status: 200 });
}

export async function post(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const payload = await req.json() as AppTaxRecord;
    const from = new Date(payload.from);
    const to = new Date(payload.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to)
        return Response.json({ success: false, error: "Invalid date parameters" }, { status: 400 });
    // Never allow client to control id, ownership, or creation/update timestamps
    const { createdAt, updatedAt, ...payloadData } = payload;
    // VAT
    const varPercentage = payload.vatPercentage ?? env.DEFAULT_VAT_PERCENTAGE;
    const vatAmount = payload.brutIncome * varPercentage / (100 + varPercentage);
    const netBeforeObligations = payload.brutIncome - vatAmount;
    // Obligations
    const taxRate = payload.taxRate ?? env.DEFAULT_TAX_RATE;
    const incomeTax = netBeforeObligations * taxRate / 100;
    const healthInsuranceBase = payload.healthInsuranceBase ?? env.DEFAULT_HEALTH_INSURANCE_BASE;
    const healthInsuranceRate = payload.healthInsuranceRate ?? env.DEFAULT_HEALTH_INSURANCE_RATE;
    const healthContribution = healthInsuranceBase * healthInsuranceRate / 100;
    // Expenses deductions
    const expensesInvoices = await downloadKsefInvoices(env, appUser, "Subject2", from, to);
    const expensesSummary = expensesInvoices.map((invoice) => ({
        InvoiceNumber: invoice.InvoiceBody?.InvoiceNumber ?? null,
        TotalGrossAmount: invoice.InvoiceBody?.TotalGrossAmount ?? 0,
        TotalVatAmount: invoice.InvoiceBody?.TotalVatAmount ?? 0,
    }));
    const expensesDeductions = expensesInvoices.reduce((sum, invoice) => sum + (invoice.InvoiceBody?.TotalVatAmount ?? 0), 0);
    // Total after obligations and expenses deductions
    const totalCleanRevenue = (netBeforeObligations - incomeTax - healthContribution) + expensesDeductions;
    const record = {
        ...payloadData,
        owner_id: appUser.email,
        vat_percentage: varPercentage,
        vat_amount: vatAmount,
        net_before_obligations: netBeforeObligations,
        tax_rate: taxRate,
        income_tax: incomeTax,
        health_insurance_base: healthInsuranceBase,
        health_insurance_rate: healthInsuranceRate,
        health_contribution: healthContribution,
        expenses_summary: expensesSummary,
        total_clean_revenue: totalCleanRevenue,
        ...(payload.notes && { notes: payload.notes }),
        updated_at: new Date().toISOString()
    };
    try {
        await getRepo(env).save<AppTaxRecord>("taxes", record);
        return Response.json({ success: true, from: record.from, to: record.to }, { status: 200 });
    } catch (error) {
        if (String(error).includes("UNIQUE constraint failed"))
            return Response.json({ success: false, error: "Tax record already exists", from: record.from, to: record.to }, { status: 409 });
        throw error;
    }
}

export async function put(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const payload = await req.json() as AppTaxRecord & { owner_id?: string };
    const from = new Date(payload.from);
    const to = new Date(payload.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to)
        return Response.json({ success: false, error: "Invalid date parameters" }, { status: 400 });
    // Never allow client to change id, ownership, or creation/update timestamp
    const { owner_id, createdAt, updatedAt, ...updatePayload } = payload;
    const result = await getRepo(env).update<AppTaxRecordUpdate>("taxes", {
        ...updatePayload,
        updatedAt: new Date().toISOString()
    }, { owner_id: appUser.email });
    if (result.changes === 0)
        return Response.json({ success: false, error: "Tax record not found", from: from, to: to }, { status: 404 });
    return Response.json({ success: true, from: from, to: to }, { status: result.success ? 200 : 400 });
}

export async function del(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from")!;
    const toParam = url.searchParams.get("to")!;
    const from = new Date(fromParam);
    const to = new Date(toParam);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to)
        return Response.json({ success: false, error: "Invalid date parameters" }, { status: 400 });
    // Allow to delete only owned tax records (except for superadmin)
    const filters = appUser.tier === 0 ? {} : { owner_id: appUser.email };
    const result = await getRepo(env).delete("taxes", { from: fromParam, to: toParam, ...filters });
    if (result.changes === 0)
        return Response.json({ success: false, error: "Tax record not found", from: from, to: to }, { status: 404 });
    return Response.json({ success: result.success, from: from, to: to }, { status: result.success ? 200 : 400 });
}