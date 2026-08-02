/**
 * Uses the aliases of an Avro schema to provide a translated DTO.
 */
export function dtoFromAliases(value: any, schema: any): any {
    // Avro union: ["null", {...}]
    if (Array.isArray(schema)) {
        const realSchema = schema.find(s => typeof s === "object");
        return dtoFromAliases(value, realSchema);
    }
    // Record
    if (schema.type === "record") {
        const result: any = {};
        for (const field of schema.fields) {
            const inputName = field.name;
            const outputName = field.aliases?.[0] ?? inputName;
            if (value[inputName] !== undefined) {
                result[outputName] = dtoFromAliases(
                    value[inputName],
                    field.type
                );
            }
        }
        return result;
    }
    // Array
    if (schema.type === "array") return value.map((item: any) => dtoFromAliases(item, schema.items));
    // Primitive
    return value;
}