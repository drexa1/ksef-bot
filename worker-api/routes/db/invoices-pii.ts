import {Env} from "../../worker";
import {xmlParser} from "./invoices";
import XMLBuilder from "fast-xml-builder";

export async function post(req: Request, _env: Env): Promise<Response> {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File))  return new Response("Missing XML file", { status: 400 });
    const salt = form.get("salt")!.toString();
    const anonymizer = new XmlAnonymizer(salt);
    const xmlContent = await file.text();
    const anonymizedXml = await anonymizer.anonymize(xmlContent);
    return new Response(anonymizedXml, { status: 200, headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${file.name.replace(/\.xml$/i, ".anonymized.xml")}"`,
    }});
}

// ---------------------------------------------------------------------------------------------------------------------
// PII Anonymizer
// ---------------------------------------------------------------------------------------------------------------------

class XmlAnonymizer {
    constructor(private readonly salt: string, private readonly builder = new XMLBuilder({
        attributesGroupName: ":@",
        attributeNamePrefix: "",
        textNodeName: "#text",
        ignoreAttributes: false,
        suppressEmptyNode: false,
        format: true
    })) {}

    async anonymize(xmlContent: string): Promise<string> {
        const document = xmlParser.parse(xmlContent);
        const anonymized = await this.anonymizeValue(document, "$");
        return this.builder.build(anonymized);
    }

    private async anonymizeValue(value: any, path: string): Promise<any> {
        if (Array.isArray(value))
            return Promise.all(value.map((item, index) => this.anonymizeValue(item, `${path}[${index}]`)));
        if (value !== null && typeof value === "object") {
            const result: Record<string, any> = {};
            for (const [key, val] of Object.entries(value)) {
                if (key === ":@" || key === "?xml") {
                    result[key] = val;
                    continue;
                }
                const currentPath = key === "#text" ? path : `${path}.${key}`;
                result[key] = await this.anonymizeValue(val, currentPath);
            }
            return result;
        }
        return this.anonymizePrimitive(value, path);
    }

    private async anonymizePrimitive(value: any, path: string): Promise<any> {
        const strVal = String(value ?? "").trim();
        if (!strVal) return value;
        const hash = this.createHash(`${this.salt}:${path}:${strVal}`);
        // Number
        if (/^-?\d+(\.\d+)?$/.test(strVal)) {
            const num = parseFloat(strVal);
            const isInt = !strVal.includes(".");
            const decimals = isInt ? 0 : strVal.split(".")[1].length;
            // Pseudo-random deterministic jitter
            const jitterRatio = ((hash % 1000) - 500) / 10000;
            const newNum = num === 0 ? 0 : num * (1 + jitterRatio);
            return isInt ? Math.round(newNum) : Number(newNum.toFixed(decimals));
        }
        // Date
        if (/^\d{4}-\d{2}-\d{2}/.test(strVal)) {
            const dayShift = (hash % 60) - 30; // shift date +/- 30 days
            const date = new Date(strVal);
            if (!isNaN(date.getTime())) {
                date.setDate(date.getDate() + dayShift);
                return strVal.includes("T")
                    ? date.toISOString().replace(".000Z", "Z")
                    : date.toISOString().split("T")[0];
            }
        }
        // Fallback for string
        const hashHex = hash.toString(16).padStart(8, "0");
        return `ANON_${hashHex}`;
    }

    /**
     * Zero-dependency hashing function (32-bit FNV-1a algorithm)
     */
    private createHash(str: string): number {
        let hash = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return hash >>> 0;
    }
}