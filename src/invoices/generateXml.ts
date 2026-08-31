import {AppUser} from "../../worker/types/db";

export async function generateInvoiceXml(userProfile: AppUser, form: HTMLFormElement): Promise<string> {
    const response = await fetch("/schemas/invoice-template.xml");
    const templateXml = await response.text();
    const xmlDocument = new DOMParser().parseFromString(templateXml, "application/xml");
    const root = xmlDocument.documentElement;

    // Invoice sections
    const fa = root.querySelector("Fa")!;
    const contractor1 = root.querySelector("Podmiot1")!;
    const contractor2 = root.querySelector("Podmiot2")!;
    const payment = fa.querySelector("Platnosc")!;
    const annotations = fa.querySelector("Adnotacje")!;

    // Header
    root.querySelector("SystemInfo")!.textContent = "KSeF Bot";
    root.querySelector("DataWytworzeniaFa")!.textContent = new Date().toISOString();

    // Seller
    const contractor1Address = `${userProfile.town}, ${userProfile.zipCode}, ${userProfile.buildingNumber}/${userProfile.apartmentNumber}`;
    contractor1.querySelector("NIP")!.textContent = userProfile.nip;
    contractor1.querySelector("Nazwa")!.textContent = `${userProfile.firstName} ${userProfile.lastName}`;
    contractor1.querySelector("AdresL1")!.textContent = contractor1Address;
    contractor1.querySelector("KodKraju")!.textContent = "PL";

    // Buyer
    const customerName = form.querySelector<HTMLInputElement>("#contractorName")?.value.trim() ?? "";
    const customerNip = form.querySelector<HTMLInputElement>("#contractorNipInput")?.value.trim() ?? "";
    const customerTown = form.querySelector<HTMLInputElement>("#contractorTown")?.value.trim() ?? "";
    const customerPostalCode = form.querySelector<HTMLInputElement>("#contractorPostalCode")?.value.trim() ?? "";
    const customerStreet = form.querySelector<HTMLInputElement>("#contractorStreet")?.value.trim() ?? "";
    const customerBuilding = form.querySelector<HTMLInputElement>("#contractorBuilding")?.value.trim() ?? "";
    const customerApartment = form.querySelector<HTMLInputElement>("#contractorApartment")?.value.trim() ?? "";
    const customerAddress = [
        customerTown,
        customerPostalCode,
        [customerStreet, customerBuilding ? `${customerBuilding}${customerApartment ? `/${customerApartment}` : ""}` : ""].filter(Boolean).join(" ")
    ].filter(Boolean).join(", ");

    contractor2.querySelector("NIP")!.textContent = customerNip;
    contractor2.querySelector("Nazwa")!.textContent = customerName;
    contractor2.querySelector("AdresL1")!.textContent = customerAddress;
    contractor2.querySelector("KodKraju")!.textContent = "PL";

    // Additional entity
    const additionalEntity = form.querySelector<HTMLInputElement>("input[name=\"additionalEntity\"]:checked")?.value ?? "";
    const jst = contractor2.querySelector("JST");
    const gv = contractor2.querySelector("GV");
    if (jst) jst.textContent = additionalEntity === "jst" ? "1" : "2";
    if (gv) gv.textContent = additionalEntity === "gv" ? "1" : "2";

    // Invoice
    fa.querySelector("P_1")!.textContent = form.querySelector<HTMLInputElement>("#issueDate")?.value.trim() ?? "";
    fa.querySelector("P_1M")!.textContent = form.querySelector<HTMLInputElement>("#issuePlace")?.value.trim() ?? "";
    fa.querySelector("P_2")!.textContent = form.querySelector<HTMLInputElement>("#invoiceNumber")?.value.trim() ?? "";
    fa.querySelector("P_6")!.textContent = form.querySelector<HTMLInputElement>("#deliveryDate")?.value.trim() ?? "";
    fa.querySelector("P_13_1")!.textContent = String(parseFloat(form.querySelector<HTMLElement>("#totalNet")?.textContent ?? "0") || 0);
    fa.querySelector("P_14_1")!.textContent = String(parseFloat(form.querySelector<HTMLElement>("#totalVAT")?.textContent ?? "0") || 0);
    fa.querySelector("P_15")!.textContent = String(parseFloat(form.querySelector<HTMLElement>("#totalGross")?.textContent ?? "0") || 0);

    // Optional markings
    const markingMpp = form.querySelector<HTMLInputElement>("#markingMpp")?.checked ?? false;
    const markingMk = form.querySelector<HTMLInputElement>("#markingMk")?.checked ?? false;
    const p16 = annotations.querySelector("P_16");
    const p18a = annotations.querySelector("P_18A");
    if (p16) p16.textContent = markingMk ? "1" : "2";
    if (p18a) p18a.textContent = markingMpp ? "1" : "2";

    // Invoice positions
    const templateRow = fa.querySelector("FaWiersz")!;
    const rows = Array.from(form.querySelectorAll(".item-row")) as HTMLTableRowElement[];
    fa.querySelectorAll("FaWiersz").forEach(row => row.remove());
    rows.forEach((row, index) => {
        const number = index + 1;
        const invoiceItem = templateRow.cloneNode(true) as Element;

        const description = row.querySelector<HTMLInputElement>(`#itemName${number}`)?.value.trim() ?? "";
        const unit = row.querySelector<HTMLInputElement>(`#itemUnit${number}`)?.value.trim() ?? "";
        const quantity = parseFloat(row.querySelector<HTMLInputElement>(`#itemQuantity${number}`)?.value ?? "0") || 0;
        const unitPrice = parseFloat(row.querySelector<HTMLInputElement>(`#itemPrice${number}`)?.value ?? "0") || 0;
        const net = parseFloat(row.querySelector<HTMLInputElement>(`#itemNet${number}`)?.value ?? "0") || 0;
        const vat = parseFloat(row.querySelector<HTMLInputElement>(`#itemVATamount${number}`)?.value ?? "0") || 0;
        const vatRate = (row.querySelector(`#itemVAT${number}`) as unknown as HTMLSelectElement)?.value ?? "23";

        invoiceItem.querySelector("NrWierszaFa")!.textContent = String(number);
        invoiceItem.querySelector("P_7")!.textContent = description;
        invoiceItem.querySelector("P_8A")!.textContent = unit;
        invoiceItem.querySelector("P_8B")!.textContent = String(quantity);
        invoiceItem.querySelector("P_9A")!.textContent = String(unitPrice);
        invoiceItem.querySelector("P_11")!.textContent = String(net);
        invoiceItem.querySelector("P_11Vat")!.textContent = String(vat);
        invoiceItem.querySelector("P_12")!.textContent = vatRate === "ZW" ? "0" : vatRate;

        fa.insertBefore(invoiceItem, payment);
    });

    // Payment
    payment.querySelector("Termin")!.textContent = form.querySelector<HTMLInputElement>("#paymentDeadline")?.value.trim() ?? "";
    payment.querySelector("FormaPlatnosci")!.textContent = (form.querySelector("#paymentType") as unknown as HTMLSelectElement)?.value ?? "";
    const bankAccount = form.querySelector<HTMLInputElement>("#bankAccount")?.value.trim() ?? "";
    const existingBankAccount = payment.querySelector("RachunekBankowy");
    if (bankAccount) {
        if (existingBankAccount) {
            existingBankAccount.querySelector("NrRB")!.textContent = bankAccount;
        } else {
            const bankAccountElement = xmlDocument.createElementNS(root.namespaceURI, "RachunekBankowy");
            const nrRb = xmlDocument.createElementNS(root.namespaceURI, "NrRB");
            nrRb.textContent = bankAccount;
            bankAccountElement.appendChild(nrRb);
            payment.appendChild(bankAccountElement);
        }
    }

    return new XMLSerializer().serializeToString(xmlDocument);
}