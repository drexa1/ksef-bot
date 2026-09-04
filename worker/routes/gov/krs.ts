import {Env} from "../../worker";

/**
 * Search by Tax Identification Number in the National Court Registry.
 */
export async function fromKRS(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const nip = url.searchParams.get("nip");
    if (!nip || !/^\d{10}$/.test(nip))
        return Response.json({ success: false, error: "Invalid NIP" }, { status: 400 });
    try {
        const timestamp = new Date().toISOString().slice(0, 19);
        const apiKey = encodeToken("0000000000", timestamp);
        const searchResponse = await fetch(`${env.KRS_SEARCH_URL}/api/wyszukiwarka/krs`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0",
                Apikey: apiKey
            },
            body: JSON.stringify({ podmiot: { nip }, rejestr: ["P", "S"], paginacja: {} })
        });
        const searchResult = await searchResponse.json() as { [key: string]: any };
        if (!searchResponse.ok)
            return Response.json({ success: false, result: searchResult }, { status: searchResponse.status });
        const krs = searchResult?.wyniki?.[0]?.krs ?? searchResult?.results?.[0]?.krs;
        if (!krs)
            return Response.json({ success: false, error: "Firm not found in KRS" }, { status: 404 });
        const detailsResponse = await fetch(`${env.KRS_API_URL}/api/krs/OdpisAktualny/${krs}`, {
            headers: { Accept: "application/json" }
        });
        const result = await detailsResponse.json();
        return Response.json({ success: detailsResponse.ok, result }, { status: detailsResponse.status });
    } catch (error: any) {
        return Response.json({ success: false, error: String(error) }, { status: 502 });
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Apikey header creation
// ---------------------------------------------------------------------------------------------------------------------

const KrsPositions = [193, 8, 327, 501, 112, 74, 409, 226, 16, 306];
const TimestampPositions = [492, 141, 364, 78, 259, 12, 430, 384, 97, 503, 67, 35, 471, 218];
const ChecksumPositions = [24, 46, 174, 345];
const ShiftMarkerPosition = 11;

function encodeToken(krs: string, timestamp: string): string {
    if (krs.length > 10)
        throw new Error("KRS must be max 10 digits.");
    krs = krs.padStart(10, "0");
    const date = new Date(timestamp);
    const formattedTimestamp = formatTimestamp(date);
    const s = Array.from({ length: 512 }, () => Math.floor(10 * Math.random()).toString());
    for (let i = 508; i < 512; i++) {
        s[i] = "0";
    }
    KrsPositions.forEach((position, index) => s[position] = krs[index]);
    TimestampPositions.forEach((position, index) => s[position] = formattedTimestamp[index]);
    const shift = Math.floor(Math.random() * 9) + 1;
    s[ShiftMarkerPosition] = shift.toString();
    for (const position of ChecksumPositions) {
        shiftRight(s, position);
        s[position] = "0";
    }
    const checksum = s.reduce((sum, digit) => sum + Number(digit), 0).toString().padStart(4, "0");
    ChecksumPositions.forEach((position, index) => s[position] = checksum[index]);
    circularRight(s, shift);
    return s.join("");
}

function shiftRight(array: string[], position: number): void {
    for (let i = array.length - 1; i > position; i--)
        array[i] = array[i - 1];
    array[position] = "0";
}

function circularRight(array: string[], amount: number): void {
    const copy = [...array];
    for (let i = 0; i < array.length; i++)
        array[(i + amount) % array.length] = copy[i];
}

function formatTimestamp(date: Date): string {
    const pad = (value: number) => value.toString().padStart(2, "0");
    return date.getFullYear().toString()
        + pad(date.getMonth() + 1)
        + pad(date.getDate())
        + pad(date.getHours())
        + pad(date.getMinutes())
        + pad(date.getSeconds());
}