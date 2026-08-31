import {AppUser} from "../../worker/types/db";

export async function generateInvoiceXml(userProfile: AppUser, form: HTMLFormElement): Promise<string> {

    const response = await fetch("schemas/invoice-template.xml");
    const templateXml = await response.text();
    const xmlDocument = new DOMParser().parseFromString(templateXml, "application/xml");
    const root = xmlDocument.documentElement;

    const fa = root.querySelector("Fa")!;
    const seller = root.querySelector("Podmiot1")!;
    const buyer = root.querySelector("Podmiot2")!;
    const annotations = fa.querySelector("Adnotacje")!;
    const payment = fa.querySelector("Platnosc")!;

    // Header
    root.querySelector("SystemInfo")!.textContent = "KSeF Bot";
    root.querySelector("DataWytworzeniaFa")!.textContent = new Date().toISOString();

    // Seller
    const sellerAddress = `${userProfile.town}, ${userProfile.zipCode}, ${userProfile.buildingNumber}/${userProfile.apartmentNumber}`;
    seller.querySelector("NIP")!.textContent = userProfile.nip;
    seller.querySelector("Nazwa")!.textContent = `${userProfile.firstName} ${userProfile.lastName}`;
    seller.querySelector("AdresL1")!.textContent = sellerAddress;
    seller.querySelector("KodKraju")!.textContent = "PL";

    // Contractor
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

    buyer.querySelector("NIP")!.textContent = customerNip;
    buyer.querySelector("Nazwa")!.textContent = customerName;
    buyer.querySelector("AdresL1")!.textContent = customerAddress;
    buyer.querySelector("KodKraju")!.textContent = "PL";

    // Additional entity
    const additionalEntity = form.querySelector<HTMLInputElement>("input[name=\"additionalEntity\"]:checked")?.value ?? "";
    if (additionalEntity === "jst") {
        buyer.querySelector("JST")!.textContent = "1";
        buyer.querySelector("GV")!.textContent = "2";
    } else if (additionalEntity === "gv") {
        buyer.querySelector("JST")!.textContent = "2";
        buyer.querySelector("GV")!.textContent = "1";
    } else {
        buyer.querySelector("JST")!.textContent = "2";
        buyer.querySelector("GV")!.textContent = "2";
    }

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

    annotations.querySelector("P_16")!.textContent = markingMk ? "1" : "2";
    annotations.querySelector("P_18A")!.textContent = markingMpp ? "1" : "2";

    // Invoice positions
    const templateRow = fa.querySelector("FaWiersz")!;
    const rows = Array.from(form.querySelectorAll(".item-row")) as HTMLTableRowElement[];
    fa.querySelectorAll("FaWiersz").forEach(row => row.remove());
    rows.forEach((row, index) => {
        const number = index + 1;
        const invoiceRow = templateRow.cloneNode(true) as Element;

        const description = row.querySelector<HTMLInputElement>(`#itemName${number}`)?.value.trim() ?? "";
        const unit = row.querySelector<HTMLInputElement>(`#itemUnit${number}`)?.value.trim() ?? "";
        const quantity = parseFloat(row.querySelector<HTMLInputElement>(`#itemQuantity${number}`)?.value ?? "0") || 0;
        const unitPrice = parseFloat(row.querySelector<HTMLInputElement>(`#itemPrice${number}`)?.value ?? "0") || 0;
        const net = parseFloat(row.querySelector<HTMLInputElement>(`#itemNet${number}`)?.value ?? "0") || 0;
        const vat = parseFloat(row.querySelector<HTMLInputElement>(`#itemVATamount${number}`)?.value ?? "0") || 0;
        const vatRate = (row.querySelector(`#itemVAT${number}`) as unknown as HTMLSelectElement)?.value ?? "23";

        invoiceRow.querySelector("NrWierszaFa")!.textContent = String(number);
        invoiceRow.querySelector("P_7")!.textContent = description;
        invoiceRow.querySelector("P_8A")!.textContent = unit;
        invoiceRow.querySelector("P_8B")!.textContent = String(quantity);
        invoiceRow.querySelector("P_9A")!.textContent = String(unitPrice);
        invoiceRow.querySelector("P_11")!.textContent = String(net);
        invoiceRow.querySelector("P_11Vat")!.textContent = String(vat);
        invoiceRow.querySelector("P_12")!.textContent = vatRate === "ZW" ? "0" : vatRate;

        fa.insertBefore(invoiceRow, payment);
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
    } else {
        existingBankAccount?.remove();
    }

    return new XMLSerializer().serializeToString(xmlDocument);
}