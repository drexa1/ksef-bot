import {Env} from "../../worker";
import {D1Driver, Repository} from "../../repository/d1";
import {AppTaxRecord, AppTaxRecordDb, AppTaxRecordUpdate, AppUser, TaxRecordObligations} from "../../types/db";
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
    const filters = appUser.tier === 0 ? {} : { ownerId: appUser.email };
    const rows = fromParam && toParam
        ? await getRepo(env).get<AppTaxRecordDb>("taxes", { from: fromParam, to: toParam, ...filters })
        : await getRepo(env).getAll<AppTaxRecordDb>("taxes", filters);
    if (rows === null)
        return Response.json({ success: false, error: "Tax record not found", from: from, to: to }, { status: 404 });
    const result = Array.isArray(rows)
        ? rows.map(row => ({ ...row, expensesSummary: JSON.parse(row.expensesSummary) }))
        : { ...rows, expensesSummary: JSON.parse(rows.expensesSummary) };
    return Response.json(result, { status: 200 });
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
    const obligations = await computeObligations(env, appUser, payloadData, from, to);
    const record = {
        ...payloadData,
        ownerId: appUser.email,
        vatPercentage: obligations.vatPercentage,
        vatAmount: obligations.vatAmount,
        netBeforeObligations: obligations.netBeforeObligations,
        taxRate: obligations.taxRate,
        incomeTax: obligations.incomeTax,
        healthInsuranceBase: obligations.healthInsuranceBase,
        healthInsuranceRate: obligations.healthInsuranceRate,
        healthContribution: obligations.healthContribution,
        expensesSummary: JSON.stringify(obligations.expensesSummary),
        totalCleanRevenue: (obligations.netBeforeObligations - obligations.incomeTax - obligations.healthContribution) + obligations.expensesDeductions,
        ...(payload.notes && { notes: payload.notes }),
        updatedAt: new Date().toISOString()
    };
    try {
        await getRepo(env).save<AppTaxRecordDb>("taxes", record);
        return Response.json({ success: true, from: record.from, to: record.to }, { status: 200 });
    } catch (error) {
        if (String(error).includes("UNIQUE constraint failed"))
            return Response.json({ success: false, error: "Tax record already exists", from: record.from, to: record.to }, { status: 409 });
        throw error;
    }
}

async function computeObligations(env: Env, appUser: AppUser, taxRecord: AppTaxRecord, from: Date, to: Date): Promise<TaxRecordObligations> {
    // VAT
    const vatPercentage = taxRecord.vatPercentage ?? env.DEFAULT_VAT_PERCENTAGE;
    const vatAmount = taxRecord.brutIncome * vatPercentage / (100 + vatPercentage);
    const netBeforeObligations = taxRecord.brutIncome - vatAmount;
    // Obligations
    const taxRate = taxRecord.taxRate ?? env.DEFAULT_TAX_RATE;
    const incomeTax = netBeforeObligations * taxRate / 100;
    const healthInsuranceBase = taxRecord.healthInsuranceBase ?? env.DEFAULT_HEALTH_INSURANCE_BASE;
    const healthInsuranceRate = taxRecord.healthInsuranceRate ?? env.DEFAULT_HEALTH_INSURANCE_RATE;
    const healthContribution = healthInsuranceBase * healthInsuranceRate / 100;
    // Expenses deductions
    const expensesInvoices = await downloadKsefInvoices(env, appUser, "Subject2", from, to);
    const expensesSummary = expensesInvoices.map((invoice) => ({
        InvoiceNumber: invoice.InvoiceBody?.InvoiceNumber,
        TotalGrossAmount: invoice.InvoiceBody?.TotalGrossAmount,
        TotalVatAmount: invoice.InvoiceBody?.TotalVatAmount
    }));
    const expensesDeductions = expensesInvoices.reduce((sum, invoice) => sum + (invoice.InvoiceBody?.TotalVatAmount ?? 0), 0);
    // Total after obligations and expenses deductions
    return {
        vatPercentage,
        vatAmount,
        netBeforeObligations,
        taxRate,
        incomeTax,
        healthInsuranceBase,
        healthInsuranceRate,
        healthContribution,
        expensesDeductions,
        expensesSummary,
    };
}

export async function put(req: Request, env: Env): Promise<Response> {
    const appUser = await getAuthUser(req, env);
    const payload = await req.json() as AppTaxRecord & { ownerId?: string };
    const from = new Date(payload.from);
    const to = new Date(payload.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to)
        return Response.json({ success: false, error: "Invalid date parameters" }, { status: 400 });
    // Never allow client to change id, ownership, or creation/update timestamp
    const { ownerId, createdAt, updatedAt, ...updatePayload } = payload;
    const result = await getRepo(env).update<AppTaxRecordUpdate>("taxes", {
        ...updatePayload,
        updatedAt: new Date().toISOString()
    }, { ownerId: appUser.email });
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
    const filters = appUser.tier === 0 ? {} : { ownerId: appUser.email };
    const result = await getRepo(env).delete("taxes", { from: fromParam, to: toParam, ...filters });
    if (result.changes === 0)
        return Response.json({ success: false, error: "Tax record not found", from: from, to: to }, { status: 404 });
    return Response.json({ success: result.success, from: from, to: to }, { status: result.success ? 200 : 400 });
}