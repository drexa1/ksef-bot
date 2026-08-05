import {Env} from "../../worker";
import pRetry, {AbortError} from "p-retry";
import {
    KsefAuthenticationStatus,
    KsefContextIdentifier,
    KsefIdentifiable,
    KsefInvoiceQueryResult
} from "../../types/ksef";
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import {AppUser} from "../../types/db";
import {invoiceFromXml} from "../db/invoices";

class KsefClientBase {
    token?: string;

    constructor(protected env: Env, protected user: KsefIdentifiable) {}

    async authenticate(): Promise<void> {
        this.token = await this.getKsefToken(this.env, this.user);
        console.info("🪪 KSeF token acquired")
    }

    private async getKsefToken(env: Env, user: KsefIdentifiable): Promise<string> {
        console.info("1️⃣️ Requesting KSeF auth challenge...");
        const ksefChallenge = await this.getKsefChallenge(env);
        console.info("2️⃣️ Requesting KSeF public key certificates...");
        const ksefCertificate = await this.getKsefEncryptionCertificate(env);
        console.info("3️⃣️ Encrypting token...");
        const encryptedToken = await this.encryptKsefToken(env.KSEF_TOKEN, ksefChallenge.timestamp, ksefCertificate.certificate);
        console.info("4️⃣️ Requesting KSeF authentication...");
        const auth = await this.startKsefAuthentication(env, user, ksefChallenge.challenge, encryptedToken, ksefCertificate.publicKeyId);
        await this.waitForKsefAuthentication(env, auth.referenceNumber, auth.authenticationToken);
        console.info("5️⃣️ Redeeming KSeF token...");
        return await this.redeemKsefToken(env, auth.authenticationToken);
    }

    private async getKsefChallenge(env: Env): Promise<{ challenge: string, timestamp: number }> {
        const response = await fetch(`${env.KSEF_URL}/auth/challenge`, { method: "POST" });
        return await response.json() as { challenge: string, timestamp: number };
    }

    private async getKsefEncryptionCertificate(env: Env): Promise<{ certificate: string, publicKeyId: string }> {
        const response = await fetch(`${env.KSEF_URL}/security/public-key-certificates`);
        const data = await response.json() as { certificate: string, usage: string[], publicKeyId: string }[];
        const ksefTokenEncryption = data.find(c => c.usage.includes("KsefTokenEncryption"))!;
        return { certificate: ksefTokenEncryption.certificate, publicKeyId: ksefTokenEncryption.publicKeyId };
    }

    private async encryptKsefToken(token: string, timestamp: number, certificate: string): Promise<string> {
        const timestampMs = new Date(timestamp).getTime();
        const tokenPayload = new TextEncoder().encode(`${token}|${timestampMs}`);
        // PEM certificate -> DER bytes
        const certificateDer = Uint8Array.from(atob(certificate
            .replace(/-----BEGIN CERTIFICATE-----/, "")
            .replace(/-----END CERTIFICATE-----/, "")
            .replace(/\s/g, "")), c => c.charCodeAt(0));
        // Parse X.509 certificate
        const asn1 = asn1js.fromBER(certificateDer.buffer);
        if (asn1.offset === -1) throw new Error("Invalid certificate DER");
        const cert = new pkijs.Certificate({ schema: asn1.result });
        // Extract SubjectPublicKeyInfo
        const spki = cert.subjectPublicKeyInfo.toSchema().toBER();
        // Import RSA public key
        const publicKey = await crypto.subtle.importKey("spki", spki, { name: "RSA-OAEP", hash: "SHA-256"}, false, ["encrypt"]);
        // Encrypt token payload
        const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, tokenPayload);
        return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    }

    private async startKsefAuthentication(env: Env, user: KsefIdentifiable, challenge: string, encryptedToken: string, publicKeyId: string): Promise<{ referenceNumber: string, authenticationToken: string }> {
        const response = await fetch(`${env.KSEF_URL}/auth/ksef-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                challenge,
                contextIdentifier: this.ksefContextIdentifier(user),
                encryptedToken,
                publicKeyId
            })
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`KSeF authentication failed ${response.status}: ${body}`);
        }
        const data = await response.json() as { referenceNumber: string; authenticationToken: { token: string, validUntil: string }};
        return { referenceNumber: data.referenceNumber, authenticationToken: data.authenticationToken.token};
    }

    private ksefContextIdentifier(user: KsefIdentifiable): KsefContextIdentifier {
        if (user.nip)
            return { type: "Nip", value: user.nip };
        if (user.pesel)
            return { type: "InternalId", value: user.pesel };
        throw new Error("Unsupported tax identifier");
    }

    private async waitForKsefAuthentication(env: Env, referenceNumber: string, authenticationToken: string): Promise<void> {
        await pRetry(
            async () => {
                const response = await fetch(`${env.KSEF_URL}/auth/${referenceNumber}`, {
                    headers: { Authorization: `Bearer ${authenticationToken}` }
                });
                if (!response.ok) throw new Error(`KSeF authentication status failed: ${response.status}`);
                const ksefAuthenticationStatus = await response.json() as KsefAuthenticationStatus;
                switch (ksefAuthenticationStatus.status.code) {
                    // Authentication in progress
                    case 100: throw new Error(`KSeF authentication pending: ${ksefAuthenticationStatus.status}`);
                    // Success
                    case 200: return;
                    default:  throw new AbortError(`${ksefAuthenticationStatus.status}}`);
                }
            }, { retries: 10, minTimeout: env.KSEF_MIN_TIMEOUT, maxTimeout: env.KSEF_MAX_TIMEOUT, factor: 1 }
        );
    }

    private async redeemKsefToken(env: Env, authenticationToken: string): Promise<string> {
        const response = await fetch(`${env.KSEF_URL}/auth/token/redeem`, { method: "POST", headers: {
            Authorization: `Bearer ${authenticationToken}`
        }});
        const tokens = await response.json() as { accessToken: { token: string }};
        return tokens.accessToken.token;
    }
}

export class KsefClient extends KsefClientBase {

    async queryPurchaseInvoices(env: Env, appUser: AppUser, subjectType: "Subject1" | "Subject2", from?: Date, to?: Date) {
        const client = new KsefClient(env, appUser);
        // Authentication
        await client.authenticate();
        // Query invoice metadata
        const metadataResult = await client.queryInvoiceMetadata(subjectType, from, to);
        console.info("📋️️ Downloaded invoices metadata...");
        // Download invoice XML files
        return await Promise.all(metadataResult.invoices.map(async (invoiceMetadata) => {
            const xmlContent = await client.downloadInvoice(invoiceMetadata.ksefNumber);
            console.info(`${subjectType === "Subject1" ? "💵" : "💳" }`+ "️ Downloaded invoice:", invoiceMetadata.invoiceNumber);
            return await invoiceFromXml(env, appUser, xmlContent);
        }));
    }

    private async queryInvoiceMetadata(subjectType: "Subject1" | "Subject2", from?: Date, to?: Date): Promise<KsefInvoiceQueryResult> {
        const dateRange = from || to ? {
            dateType: "Issue" as const,
            ...(from && { from: from.toISOString() }),
            ...(to && { to: to.toISOString() })
        } : undefined;
        const response = await fetch(`${this.env.KSEF_URL}/invoices/query/metadata`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ subjectType, ...(dateRange && { dateRange })})
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`KSeF query failed ${response.status}: ${errorBody}`);
        }
        return await response.json() as KsefInvoiceQueryResult;
    }

    private async downloadInvoice(ksefNumber: string): Promise<string> {
        const response = await fetch(`${this.env.KSEF_URL}/invoices/ksef/${ksefNumber}`, { headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/xml"
        }});
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`KSeF invoice download failed ${response.status}: ${errorBody}`);
        }
        return await response.text();
    }
}