export function mapAliases(value: any, schema: any): any {
    // Avro union: ["null", {...}]
    if (Array.isArray(schema)) {
        const realSchema = schema.find(s => typeof s === "object");
        return mapAliases(value, realSchema);
    }
    // Record
    if (schema.type === "record") {
        const result: any = {};
        for (const field of schema.fields) {
            const inputName = field.name;
            const outputName = field.aliases?.[0] ?? inputName;
            if (value[inputName] !== undefined) {
                result[outputName] = mapAliases(
                    value[inputName],
                    field.type
                );
            }
        }
        return result;
    }
    // Array
    if (schema.type === "array") return value.map((item: any) => mapAliases(item, schema.items));
    // Primitive
    return value;
}