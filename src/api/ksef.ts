export async function submitInvoice(xmlContent: string, notes: string): Promise<string> {
    const url = `${import.meta.env.VITE_WORKER_URL}/app/invoices`;
    const formData = new FormData();
    formData.append("file", new File([xmlContent], "invoice.xml", { type: "application/xml" }));
    formData.append("notes", JSON.stringify(notes));
    const response = await fetch(url, {
        method: "POST",
        headers: { "X-API-Key": import.meta.env.VITE_API_KEY },
        body: formData
    });
    if (!response.ok)
        throw new Error(`Failed to submit invoice: ${response.status}`);
    return await response.json();
}