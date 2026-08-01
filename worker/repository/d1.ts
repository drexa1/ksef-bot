import { D1Database } from "@cloudflare/workers-types";

type DBResult = { success: boolean, changes: number, lastInsertId?: number | bigint };

export interface DBDriver {
    get(sql: string, values: any[]): Promise<any>;
    getAll(sql: string, values?: any[]): Promise<any[]>;
    save(sql: string, values: any[]): Promise<DBResult>;
    update(sql: string, values: any[]): Promise<DBResult>;
    delete(sql: string, values: any[]): Promise<DBResult>;
}

export class D1Driver implements DBDriver {
    constructor(private db: D1Database) {}

    async get(sql: string, values: any[]) {
        return await this.db.prepare(sql).bind(...values).first();
    }

    async getAll(sql: string, values: any[] = []) {
        const stmt = this.db.prepare(sql);
        const { results } = values ? await stmt.bind(...values).all() : await stmt.all();
        return results;
    }

    async save(sql: string, values: any[]): Promise<DBResult> {
        const result = await this.db.prepare(sql).bind(...values).run();
        return { success: result.success, changes: result.meta.changes, lastInsertId: result.meta.last_row_id };
    }

    async update(sql: string, values: any[]): Promise<DBResult> {
        const result = await this.db.prepare(sql).bind(...values).run();
        return { success: result.success, changes: result.meta.changes, lastInsertId: result.meta.last_row_id };
    }

    async delete(sql: string, values: any[]): Promise<DBResult> {
        const result = await this.db.prepare(sql).bind(...values).run();
        return { success: result.success, changes: result.meta.changes, lastInsertId: result.meta.last_row_id };
    }
}

export class Repository {
    constructor(private driver: DBDriver) {}

    async get<T>(table: string, id: string, filters?: Record<string, any>): Promise<T | null> {
        const conditions = [`id = ?`];
        const values: any[] = [id];
        for (const [field, value] of Object.entries(filters ?? {})) {
            conditions.push(`"${field}" = ?`);
            values.push(value);
        }
        const sql = `SELECT * FROM ${table} WHERE ${conditions.join(" AND ")} LIMIT 1`;
        return await this.driver.get(sql, values) as T | null;
    }

    async getAll<T>(table: string, filters?: Record<string, any>, cols?: string[]): Promise<T[]> {
        const select = cols?.length ? cols.map(c => `"${c}"`).join(", ") : "*";
        const conditions: string[] = [];
        const values: any[] = [];
        for (const [field, value] of Object.entries(filters ?? {})) {
            conditions.push(`"${field}" = ?`);
            values.push(value);
        }
        const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
        const sql = `SELECT ${select} FROM ${table} ${where}`;
        return await this.driver.getAll(sql, values) as T[];
    }

    async getBy<T>(table: string, field: string, value: any): Promise <T> {
        const sql = `SELECT * FROM ${table} WHERE ${field} = ? LIMIT 1`;
        return await this.driver.get(sql, [value]);
    }

    async save<T>(table: string, data: T): Promise<DBResult> {
        const { sql, values } = this.buildInsert(table, data);
        return this.driver.save(sql, values);
    }

    private buildInsert<T>(table: string, data: T) {
        const entries = Object.entries(data as any);
        const columns = entries.map(([k]) => `"${k}"`).join(", ");
        const placeholders = entries.map(() => "?").join(", ");
        const values = entries.map(([_, v]) => v instanceof Date ? v.toISOString() : v);
        const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
        return { sql, values };
    }

    async update<T>(table: string, data: T, id: string, filters?: Record<string, any>): Promise<DBResult> {
        const entries = Object.entries(data as any).filter(([key]) => key !== "id");
        if (entries.length === 0) return { success: false, changes: 0 };
        const assignments = entries.map(([key]) => `"${key}" = ?`).join(", ");
        const values = entries.map(([_, value]) => value instanceof Date ? value.toISOString() : value);
        const conditions = ["id = ?"];
        const filterValues: any[] = [];
        for (const [field, value] of Object.entries(filters ?? {})) {
            conditions.push(`"${field}" = ?`);
            filterValues.push(value);
        }
        const sql = `UPDATE ${table} SET ${assignments} WHERE ${conditions.join(" AND ")}`;
        return this.driver.update(sql, [...values, id, ...filterValues]);
    }

    async delete(table: string, id: string, filters?: Record<string, any>): Promise<DBResult> {
        const conditions = ["id = ?"];
        const values: any[] = [id];
        for (const [field, value] of Object.entries(filters ?? {})) {
            conditions.push(`"${field}" = ?`);
            values.push(value);
        }
        const sql = `DELETE FROM ${table} WHERE ${conditions.join(" AND ")}`;
        return this.driver.delete(sql, values);
    }
}