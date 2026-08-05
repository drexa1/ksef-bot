/**
 * Uses the aliases of an Avro schema to provide a translated DTO.
 * ⚠️ DO NOT TOUCH
 */
export function dtoFromAliases(value: any, schema: any): any {
    if (value == null)
        return value;
    // Avro union
    if (Array.isArray(schema)) {
        const realSchema = schema.find(s => typeof s === "object" && s !== null);
        return realSchema ? dtoFromAliases(value, realSchema) : value;
    }
    // Avro primitives represented directly as strings
    if (typeof schema === "string")
        return convertPrimitive(value, schema);
    // Record
    if (schema.type === "record") {
        const result: any = {};
        for (const field of schema.fields ?? []) {
            const inputName = field.name;
            const outputName = field.aliases?.[0] ?? inputName;
            if (value[inputName] !== undefined)
                result[outputName] = dtoFromAliases(value[inputName], field.type);
        }
        return result;
    }
    // Array
    if (schema.type === "array") {
        const items = Array.isArray(value) ? value : [value];
        return items.map(item => dtoFromAliases(item, schema.items));
    }
    // Primitive
    return convertPrimitive(value, schema.type);
}

function convertPrimitive(value: any, type: string) {
    switch (type) {
        case "int":
        case "long":
        case "float":
        case "double":
            return Number(value);
        case "boolean":
            return value === true || value === "true";
        case "null":
            return null;
        default:
            return value;
    }
}