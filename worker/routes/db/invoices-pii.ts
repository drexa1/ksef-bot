import {Env} from "../../worker";
import {xmlParser} from "./invoices";

type XmlNode = Record<string, unknown>;

export async function post(req: Request, _env: Env): Promise<Response> {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File))  return new Response("Missing XML file", { status: 400 });
    const salt = form.get("salt")!.toString();
    const anonymizer = new KSeFXmlAnonymizer(salt);
    const xmlContent = await file.text();
    const anonymizedXml = await anonymizer.anonymize(xmlContent);
    return new Response(anonymizedXml, { status: 200, headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${file.name.replace(/\.xml$/i, ".anonymized.xml")}"`,
    }});
}

class KSeFXmlAnonymizer {
    constructor(private readonly salt = "secret-salt") {}

    async anonymize(xmlContent: string): Promise<string> {
        const document = xmlParser.parse(xmlContent) as XmlNode[];
        const anonymized = await this.anonymizeNodes(document, "$");
        return this.serialize(anonymized);
    }

    private async anonymizeNodes(nodes: XmlNode[], path: string): Promise<XmlNode[]> {
        const result: XmlNode[] = [];
        for (let i = 0; i < nodes.length; i++) {
            result.push(await this.anonymizeNode(nodes[i], `${path}[${i}]`));
        }
        return result;
    }

    private async anonymizeNode(node: XmlNode, path: string): Promise<XmlNode> {
        const result: XmlNode = {};
        for (const [key, value] of Object.entries(node)) {
            if (key === ":@") {
                result[key] = value;
                continue;
            }
            if (key === "#text") {
                result[key] = await this.anonymizeText(String(value), path);
                continue;
            }
            if (Array.isArray(value)) {
                result[key] = await this.anonymizeNodes(value as XmlNode[], `${path}.${key}`);
                continue;
            }
            result[key] = value;
        }
        return result;
    }

    private async anonymizeText(value: string, path: string): Promise<string> {
        if (value.trim() === "")
            return value;
        const hash = await this.hash(path, value);
        return `[${hash.slice(0, 16)}]`;
    }

    private async hash(path: string, value: string): Promise<string> {
        const input = new TextEncoder().encode(`${this.salt}\0${path}\0${value}`);
        const digest = await crypto.subtle.digest("SHA-256", input);
        return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    }

    private serialize(nodes: XmlNode[]): string {
        return nodes.map(node => this.serializeNode(node)).join("");
    }

    private serializeNode(node: XmlNode): string {
        return Object.entries(node).map(([name, value]) => {
            if (name === "#text")
                return this.escapeXml(String(value));
            if (!Array.isArray(value))
                return "";
            return value.map(child => this.serializeNamedNode(name, child as XmlNode)).join("");
        }).join("");
    }

    private serializeNamedNode(name: string, node: XmlNode): string {
        const attributes = this.serializeAttributes(node[":@"] as Record<string, unknown> | undefined,);
        const content = Object.entries(node)
            .filter(([key]) => key !== ":@")
            .map(([key, value]) => {
                if (key === "#text")
                    return this.escapeXml(String(value));
                if (!Array.isArray(value))
                    return "";
                return value.map(child => this.serializeNamedNode(key, child as XmlNode)).join("");
            }).join("");
        return content === "" ? `<${name}${attributes}/>` : `<${name}${attributes}>${content}</${name}>`;
    }

    private serializeAttributes(attributes?: Record<string, unknown>): string {
        if (!attributes)
            return "";
        return Object.entries(attributes).map(([name, value]) => ` ${name}="${this.escapeXml(String(value))}"`).join("");
    }

    private escapeXml(value: string): string {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    }
}