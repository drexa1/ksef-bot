import {D1Database} from "@cloudflare/workers-types";

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

    async save(sql: string, values: any[]): Promise<SaveResult> {
        const result = await this.db.prepare(sql).bind(...values).run();
        return { success: result.success, changes: result.meta.changes, lastInsertId: result.meta.last_row_id };
    }

    async get(sql: string, values: any[]) {
        return await this.db.prepare(sql).bind(...values).first();
    }

    async getAll(sql: string, cols?: string[]) {
        const { results } = await this.db.prepare(sql).all();
        return results;
    }
}

export class Repository {
    constructor(private driver: DBDriver) {}

    async save<T>(
        table: string,
        data: T,
        keys: string[]
    ): Promise<SaveResult>;

    async save<T>(
        table: string,
        data: T[],
        keys: string[]
    ): Promise<SaveResult[]>;

    /**
     * Handles singular or batch insert.
     * @param table
     * @param data
     * @param keys
     */
    async save<T>(table: string, data: T | T[], keys: string[]): Promise<SaveResult | SaveResult[]> {
        if (Array.isArray(data)) {
            const { sql, values } = this.buildBatchInsert(table, data, keys);
            return this.driver.save(sql, values);
        }
        const { sql, values } = this.buildInsert(table, data, keys);
        return this.driver.save(sql, values);
    }

    buildInsert<T>(table: string, data: T, keys: string[]) {
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

    buildBatchInsert<T>(table: string, data: T[], keys: string[]) {
        const entries = Object.entries(data[0] as any);
        const columns = entries.map(([k]) => `"${k}"`).join(", ");
        const placeholders = data.map(() => `(${entries.map(() => "?").join(", ")})`).join(", ");
        const values = data.flatMap(item =>
            Object.entries(item as any).map(([_, v]) =>
                v instanceof Date ? v.toISOString() : v
            )
        );
        const conflict = keys.map(k => `"${k}"`).join(", ");
        const updates = entries
            .filter(([k]) => !keys.includes(k))
            .map(([k]) => `"${k}" = excluded."${k}"`)
            .join(", ");
        const sql = `INSERT INTO ${table} (${columns}) VALUES ${placeholders} ON CONFLICT(${conflict}) DO UPDATE SET ${updates}`;
        return { sql, values };
    }

    async get<T>(table: string, id: string): Promise<T> {
        return await this.driver.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    }

    async getAll<T>(table: string, cols?: string[]): Promise<T[]> {
        const select = cols?.length ? cols.map(c => `"${c}"`).join(", ") : "*";
        return await this.driver.getAll(`SELECT ${select} FROM ${table}`);
    }
}