import {Env} from "../../worker";
import pRetry, {AbortError} from "p-retry";
import {
    KsefAuthenticationStatus,
    KsefContextIdentifier,
    KsefInvoiceMetadata,
    KsefQueryStatus,
    KsefSubject
} from "../../types/ksef";

export class KsefClient {
    token?: string;

    constructor(private env: Env, private subject: KsefSubject) {}

    async authenticate(): Promise<void> {
        this.token = await this.getKsefToken(this.env, this.subject);
    }

    private async getKsefToken(env: Env, subject: KsefSubject): Promise<string> {
        const ksefChallenge = await this.getKsefChallenge(env);
        const ksefCertificate = await this.getKsefEncryptionCertificate(env);
        const encryptedToken = await this.encryptKsefToken(env.KSEF_TOKEN, ksefChallenge.timestamp, ksefCertificate);
        const auth = await this.startKsefAuthentication(env, subject, ksefChallenge.challengeCode, encryptedToken);
        await this.waitForKsefAuthentication(env, auth.referenceNumber, auth.authenticationToken);
        return await this.redeemKsefToken(env, auth.authenticationToken);
    }

    private async getKsefChallenge(env: Env): Promise<{ challengeCode: string, timestamp: number }> {
        const response = await fetch(`${env.KSEF_URL}/auth/challenge`, { method: "POST"});
        if (!response.ok)
            throw new Error(`KSeF challenge failed: ${response.status}`);
        return await response.json() as { challengeCode: string, timestamp: number };
    }

    private async getKsefEncryptionCertificate(env: Env): Promise<string> {
        const response = await fetch(`${env.KSEF_URL}/security/public-key-certificates`);
        if (!response.ok)
            throw new Error(`KSeF public key failed: ${response.status}`);
        const data = await response.json() as { certificates: { certificate: string, usage: string[] }[] };
        const certificate = data.certificates.find(c =>
            c.usage.includes("KsefTokenEncryption")
        );
        if (!certificate)
            throw new Error("No KSeF token encryption certificate found");
        return certificate.certificate;
    }

    private async encryptKsefToken(token: string, timestamp: number, certificate: string): Promise<string> {
        const tokenPayload = new TextEncoder().encode(`${token}|${timestamp}`);
        const certificateDer = Uint8Array.from(
            atob(
                certificate
                    .replace(/-----BEGIN CERTIFICATE-----/, "")
                    .replace(/-----END CERTIFICATE-----/, "")
                    .replace(/\s/g, "")
            ), c => c.charCodeAt(0)
        );
        const publicKey = await crypto.subtle.importKey("spki", certificateDer, {
            name: "RSA-OAEP",
            hash: "SHA-256"
        }, false, ["encrypt"]);
        const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, tokenPayload);
        return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    }

    private async startKsefAuthentication(
        env: Env,
        subject: KsefSubject,
        challengeCode: string,
        encryptedToken: string
    ): Promise<{ referenceNumber: string, authenticationToken: string }> {
        const response = await fetch(`${env.KSEF_URL}/auth/ksef-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                challengeCode,
                contextIdentifier: this.ksefContextIdentifier(subject),
                encryptedToken
            })
        });
        if (!response.ok)
            throw new Error(`KSeF authentication failed: ${response.status}`);
        return await response.json() as { referenceNumber: string, authenticationToken: string };
    }

    private async waitForKsefAuthentication(env: Env, referenceNumber: string, authenticationToken: string): Promise<void> {
        await pRetry(
            async () => {
                const response = await fetch(`${env.KSEF_URL}/auth/${referenceNumber}`, {
                    headers: { Authorization: `Bearer ${authenticationToken}` }});
                if (!response.ok)
                    throw new Error(`KSeF authentication status failed: ${response.status}`);
                const status = await response.json() as KsefAuthenticationStatus;
                switch (status.status) {
                    case "Completed":
                        return;
                    case "Failed":
                        throw new AbortError(status.message ?? "KSeF authentication failed");
                    default:
                        throw new Error(`KSeF authentication not completed: ${status.status}`);
                }
            }, { retries: 3, minTimeout: env.KSEF_MIN_TIMEOUT, maxTimeout: env.KSEF_MAX_TIMEOUT, factor: 1 }
        );
    }

    private async redeemKsefToken(env: Env, authenticationToken: string): Promise<string> {
        const response = await fetch(`${env.KSEF_URL}/auth/token/redeem`, {
            method: "POST",
            headers: { Authorization: `Bearer ${authenticationToken}` }
        });
        if (!response.ok)
            throw new Error(`KSeF token redeem failed: ${response.status}`);
        const tokens = await response.json() as { accessToken: { token: string }};
        return tokens.accessToken.token;
    }

    private ksefContextIdentifier(subject: KsefSubject): KsefContextIdentifier {
        if (subject.nip)
            return { type: "Nip", identifier: subject.nip };
        if (subject.pesel)
            return { type: "Pesel", identifier: subject.pesel };
        if (subject.regon)
            return { type: "Regon", identifier: subject.regon };
        throw new Error("Unsupported tax identifier");
    }

    private authHeaders() {
        if (!this.token)
            throw new Error("KSeF client is not authenticated");
        return { "Authorization": `Bearer ${this.token}`, "Content-Type": "application/json" };
    }

    async createInvoiceQuery(from: Date, to: Date): Promise<{ queryReferenceNumber: string }> {
        const response = await fetch(`${this.env.KSEF_URL}/invoices/query`, {
            method: "POST",
            headers: this.authHeaders(),
            body: JSON.stringify({
                subjectType: "subject1",
                dateRange: {
                    dateType: "issue",
                    from: from.toISOString(),
                    to: to.toISOString()
                }
            })
        });
        if (!response.ok)
            throw new Error(`Query creation failed ${response.status}`);
        return await response.json() as { queryReferenceNumber: string };
    }

    async getQueryStatus(referenceNumber: string): Promise<KsefQueryStatus> {
        const response = await fetch(`${this.env.KSEF_URL}/invoices/query/${referenceNumber}`, {
            headers: this.authHeaders()
        });
        if (!response.ok)
            throw new Error(`Query status failed ${response.status}`);
        return await response.json();
    }

    async getInvoices(referenceNumber: string): Promise<KsefInvoiceMetadata[]> {
        const response = await fetch(`${this.env.KSEF_URL}/invoices/query/${referenceNumber}/result`, {
            headers: this.authHeaders()
        });
        if (!response.ok)
            throw new Error(`Invoice retrieval failed ${response.status}`);
        return await response.json();
    }

    async downloadInvoice(ksefNumber: string): Promise<string> {
        if (!this.token)
            throw new Error("KSeF client is not authenticated");

        const response = await fetch(`${this.env.KSEF_URL}/invoices/${ksefNumber}`, {
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: "application/xml"
            }
        });
        if (!response.ok)
            throw new Error(`Invoice download failed ${response.status}`);
        return await response.text();
    }
}