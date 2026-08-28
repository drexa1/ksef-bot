// ---------------------------------------------------------------------------------------------------------------------
// KSeF FA(3) invoice XML
// ---------------------------------------------------------------------------------------------------------------------
const KSEF_NAMESPACE = "http://crd.gov.pl/wzor/2025/06/25/13775/";

export function generateInvoiceXml(form: HTMLFormElement): string {
    //
    const issueDate = getInputValue(form, "issueDate");
    const issuePlace = getInputValue(form, "issuePlace");
    const invoiceNumber = getInputValue(form, "invoiceNumber");
    const deliveryDate = getInputValue(form, "deliveryDate");

    //
    const contractorName = getInputValue(form, "contractorName");
    const contractorNip = getInputValue(form, "contractorNipInput");
    const contractorTown = getInputValue(form, "contractorTown");
    const contractorPostalCode = getInputValue(form, "contractorPostalCode");
    const contractorStreet = getInputValue(form, "contractorStreet");
    const contractorBuilding = getInputValue(form, "contractorBuilding");
    const contractorApartment = getInputValue(form, "contractorApartment");

    const address = [
        contractorTown,
        contractorPostalCode,
        [
            contractorStreet,
            contractorBuilding ? `${contractorBuilding}${contractorApartment ? `/${contractorApartment}` : ""}` : ""
        ].filter(Boolean).join(" ")
    ].filter(Boolean).join(", ");

    //
    const paymentType = getSelectValue(form, "paymentType");
    const paymentDeadline = getInputValue(form, "paymentDeadline");
    const bankAccount = getInputValue(form, "bankAccount");
    const additionalEntity = getCheckedValue(form, "additionalEntity");
    const jst = additionalEntity === "jst";
    const gv = additionalEntity === "gv";

    //
    const lines = Array.from(form.querySelectorAll(".item-row")) as HTMLTableRowElement[];
    const invoiceLines = lines.map((row, index) => {
        const number = index + 1;
        const description = (row.querySelector(`#itemName${number}`) as HTMLInputElement | null)?.value.trim() ?? "";
        const unit = (row.querySelector(`#itemUnit${number}`) as HTMLInputElement | null)?.value.trim() ?? "";
        const quantity = parseFloat((row.querySelector(`#itemQuantity${number}`) as HTMLInputElement | null)?.value ?? "0") || 0;
        const unitPrice = parseFloat((row.querySelector(`#itemPrice${number}`) as HTMLInputElement | null)?.value ?? "0") || 0;
        const net = parseFloat((row.querySelector(`#itemNet${number}`) as HTMLInputElement | null)?.value ?? "0") || 0;
        const vat = parseFloat((row.querySelector(`#itemVATamount${number}`) as HTMLInputElement | null)?.value ?? "0") || 0;
        const vatRate = (row.querySelector(`#itemVAT${number}`) as HTMLSelectElement | null)?.value ?? "23";
        return `<FaWiersz>
            <NrWierszaFa>${number}</NrWierszaFa>
            <P_7>${escapeXml(description)}</P_7>
            <P_8A>${escapeXml(unit)}</P_8A>
            <P_8B>${quantity}</P_8B>
            <P_9A>${unitPrice}</P_9A>
            <P_11>${net}</P_11>
            <P_11Vat>${vat}</P_11Vat>
            <P_12>${vatRate === "ZW" ? 0 : vatRate}</P_12>
        </FaWiersz>`;
    }).join("\n");

    //
    const totalNet = parseFloat((form.querySelector("#totalNet") as HTMLElement | null)?.textContent ?? "0") || 0;
    const totalVat = parseFloat((form.querySelector("#totalVAT") as HTMLElement | null)?.textContent ?? "0") || 0;
    const totalGross = parseFloat((form.querySelector("#totalGross") as HTMLElement | null)?.textContent ?? "0") || 0;

    //
    const mk = isChecked(form, "markingMk");
    const mpp = isChecked(form, "markingMpp");

    //
    const jstXml = jst ? `<JST>1</JST>` : "";
    const gvXml = gv ? `<GV>1</GV>` : "";

    //
    const bankAccountXml = bankAccount ? `
        <RachunekBankowy>
          <NrRB>${escapeXml(bankAccount)}</NrRB>
        </RachunekBankowy>
    ` : "";

    return `<?xml version="1.0" encoding="utf-8"?>
        <Faktura xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="${KSEF_NAMESPACE}">
          <Naglowek>
            <KodFormularza kodSystemowy="FA (3)" wersjaSchemy="1-0E">FA</KodFormularza>
            <WariantFormularza>3</WariantFormularza>
            <DataWytworzeniaFa>${escapeXml(new Date().toISOString())}</DataWytworzeniaFa>
            <SystemInfo>KSeF-Bot</SystemInfo>
          </Naglowek>
          <Podmiot1>
            <DaneIdentyfikacyjne>
              <NIP>6751577878</NIP>
              <Nazwa>Diego Ruiz Barbero</Nazwa>
            </DaneIdentyfikacyjne>
            <Adres>
              <KodKraju>PL</KodKraju>
              <AdresL1>Kraków, 30-638, 15/32</AdresL1>
            </Adres>
            <DaneKontaktowe />
          </Podmiot1>
          <Podmiot2>
            <DaneIdentyfikacyjne>
              <NIP>${escapeXml(contractorNip)}</NIP>
              <Nazwa>${escapeXml(contractorName)}</Nazwa>
            </DaneIdentyfikacyjne>
            <Adres>
              <KodKraju>PL</KodKraju>
              <AdresL1>${escapeXml(address)}</AdresL1>
            </Adres>${jstXml}${gvXml}
          </Podmiot2>
          <Fa>
            <KodWaluty>PLN</KodWaluty>
            <P_1>${escapeXml(issueDate)}</P_1>
            <P_1M>${escapeXml(issuePlace)}</P_1M>
            <P_2>${escapeXml(invoiceNumber)}</P_2>
            <P_6>${escapeXml(deliveryDate)}</P_6>
            <P_13_1>${totalNet}</P_13_1>
            <P_14_1>${totalVat}</P_14_1>
            <P_15>${totalGross}</P_15>
            <Adnotacje>
              <P_16>${mk ? 1 : 2}</P_16>
              <P_17>2</P_17>
              <P_18>2</P_18>
              <P_18A>${mpp ? 1 : 2}</P_18A>
              <Zwolnienie>
                <P_19N>1</P_19N>
              </Zwolnienie>
              <NoweSrodkiTransportu>
                <P_22N>1</P_22N>
              </NoweSrodkiTransportu>
              <P_23>2</P_23>
              <PMarzy>
                <P_PMarzyN>1</P_PMarzyN>
              </PMarzy>
            </Adnotacje>
            <RodzajFaktury>VAT</RodzajFaktury>${invoiceLines}
            <Platnosc>
              <TerminPlatnosci>
                <Termin>${escapeXml(paymentDeadline)}</Termin>
              </TerminPlatnosci>
              <FormaPlatnosci>${escapeXml(paymentType)}</FormaPlatnosci>${bankAccountXml}
            </Platnosc>
          </Fa>
        </Faktura>`;
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function getInputValue(form: HTMLFormElement, id: string): string {
    const element = form.querySelector(`#${id}`) as HTMLInputElement;
    return element.value.trim();
}

function getSelectValue(form: HTMLFormElement, id: string): string {
    const element = form.querySelector(`#${id}`) as unknown as HTMLSelectElement;
    return element.value;
}

function getCheckedValue(form: HTMLFormElement, name: string): string {
    const element = form.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement;
    return element?.value ?? "";
}

function isChecked(form: HTMLFormElement, id: string): boolean {
    const element = form.querySelector(`#${id}`) as HTMLInputElement;
    return element?.checked ?? false;
}