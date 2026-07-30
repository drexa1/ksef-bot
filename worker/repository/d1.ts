import { D1Database } from "@cloudflare/workers-types";

export interface DBDriver {
    save(sql: string, values: any[]): Promise<SaveResult>;
    get(sql: string, values: any[]): Promise<any>;
    getAll(sql: string, cols?: string[]): Promise<any[]>;
}

export type SaveResult = {
    success: boolean;
    changes: number;
    lastInsertId?: number | bigint;
};

export class D1Driver implements DBDriver {
    constructor(private db: D1Database) {}

    async get(sql: string, values: any[]) {
        return await this.db.prepare(sql).bind(...values).first();
    }

    async getAll(sql: string, cols?: string[]) {
        const { results } = await this.db.prepare(sql).all();
        return results;
    }

    async save(sql: string, values: any[]): Promise<SaveResult> {
        const result = await this.db.prepare(sql).bind(...values).run();
        return { success: result.success, changes: result.meta.changes, lastInsertId: result.meta.last_row_id };
    }
}

export class Repository {
    constructor(private driver: DBDriver) {}

    async get<T>(table: string, id: string): Promise<T> {
        return await this.driver.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    }

    async getAll<T>(table: string, cols?: string[]): Promise<T[]> {
        const select = cols?.length ? cols.map(c => `"${c}"`).join(", ") : "*";
        return await this.driver.getAll(`SELECT ${select} FROM ${table}`);
    }

    async save<T>(table: string, data: T, keys: string[]): Promise<SaveResult> {
        const { sql, values } = this.buildInsert(table, data, keys);
        return this.driver.save(sql, values);
    }

    async update<T>(table: string, data: T, id: string): Promise<SaveResult> {
        const entries = Object.entries(data as any).filter(([key]) => key !== "id");
        if (entries.length === 0) {
            return { success: false, changes: 0 };
        }
        const assignments = entries.map(([key]) => `"${key}" = ?`).join(", ");
        const values = entries.map(([_, value]) => value instanceof Date ? value.toISOString() : value);
        const sql = `UPDATE ${table} SET ${assignments} WHERE id = ?`;
        return this.driver.save(sql, [...values, id]);
    }

    async delete(table: string, id: string): Promise<SaveResult> {
        return this.driver.save(`DELETE FROM ${table} WHERE id = ?`, [id]);
    }

    private buildInsert<T>(table: string, data: T, keys: string[]) {
        const entries = Object.entries(data as any);
        const columns = entries.map(([k]) => `"${k}"`).join(", ");
        const placeholders = entries.map(() => "?").join(", ");
        const values = entries.map(([_, v]) => v instanceof Date ? v.toISOString() : v);
        const conflict = keys.map(k => `"${k}"`).join(", ");
        const updates = entries
            .filter(([k]) => !keys.includes(k))
            .map(([k]) => `"${k}" = excluded."${k}"`)
            .join(", ");
        const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) ON CONFLICT(${conflict}) DO UPDATE SET ${updates}`;
        return { sql, values };
    }
}