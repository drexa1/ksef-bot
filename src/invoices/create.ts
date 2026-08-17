import {getCurrentLocation} from "../location";

// ---------------------------------------------------------------------------------------------------------------------
// Invoice data
// ---------------------------------------------------------------------------------------------------------------------

async function initInvoiceData() {
    const invoiceDataSection = document.getElementById("invoiceData") as HTMLDivElement;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const lastMonthDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString("sv-SE");
    // Invoice number
    const invoiceNumber = invoiceDataSection.querySelector("#invoiceNumber") as HTMLInputElement;
    invoiceNumber.value = `eFA/${year}/${month}/1`;
    // Date of issue
    const issueDate = invoiceDataSection.querySelector("#issueDate") as HTMLInputElement;
    issueDate.value = now.toISOString().slice(0, 10);
    // Posting date
    const postingDate = invoiceDataSection.querySelector("#postingDate") as HTMLInputElement;
    postingDate.value = lastMonthDay;
    // Delivery / service date
    const deliveryDate = invoiceDataSection.querySelector("#deliveryDate") as HTMLInputElement;
    deliveryDate.value = lastMonthDay;
    // Place of issue
    const issuePlace = invoiceDataSection.querySelector("#issuePlace") as HTMLInputElement;
    const currentLocation = await getCurrentLocation();
    issuePlace.value = currentLocation.city ?? "";
}

// ---------------------------------------------------------------------------------------------------------------------
// Contractor data
// ---------------------------------------------------------------------------------------------------------------------

interface Contractor {
    id: number
    name: string
    nip?: string
    town?: string
    postalCode?: string
    street?: string
    building?: string
    apartment?: string
    email?: string
}

const contractorNameInput = document.getElementById("contractorName") as HTMLInputElement;
const contractorSuggestions = document.getElementById("contractorSuggestions") as HTMLDivElement;
const identifierOptions = document.querySelectorAll<HTMLInputElement>('input[name="contractorIdentifier"]');
const contractorNip = document.querySelector(".contractor-nip") as HTMLElement;
const contractorNipInput = document.querySelector("#contractorNip") as HTMLInputElement;

async function initContractorData() {
    const contractorDataSection = document.getElementById("contractorData") as HTMLDivElement;
    // Town
    const contractorTown = contractorDataSection.querySelector("#contractorTown") as HTMLInputElement;
    const currentLocation = await getCurrentLocation();
    contractorTown.value = currentLocation.city ?? "";
    // ZIP code
    // const zipCode = contractorDataSection.querySelector("#contractorPostalCode") as HTMLInputElement;
    // zipCode.value = currentLocation.postcode ?? "";
}

contractorNameInput.addEventListener("input", () => {
    if (contractorNameInput.value.trim().length < 3) {
        contractorSuggestions.style.display = "none";
        return;
    }
    searchContractors(contractorNameInput.value);
});

function searchContractors(nameQuery: string): void {
    const contractors = [
        {
            id: 1,
            name: "ABC Sp. z o.o.",
            nip: "1234567890",
            town: "Kraków",
            postalCode: "30-001",
            street: "Floriańska",
            building: "10",
            apartment: "2",
            email: "office@abc.pl"
        }
    ];
    renderContractorNameSuggestions(contractors);
}

function renderContractorNameSuggestions(contractors: Contractor[]) {
    contractorSuggestions.innerHTML = "";
    for (const contractor of contractors) {
        const item = document.createElement("div");
        item.className = "contractor-suggestion";
        item.innerHTML = `
            <div class="contractor-suggestion-name">
                ${contractor.name}
            </div>
            <div class="contractor-suggestion-details">
                NIP: ${contractor.nip} · ${contractor.town}
            </div>
        `;
        item.addEventListener("click", () => {
            contractorNameInput.value = contractor.name;
            // (document.getElementById("contractorNip") as HTMLInputElement).value = contractor.nip;
            // (document.getElementById("contractorTown") as HTMLInputElement).value = contractor.town;
            // (document.getElementById("contractorPostalCode") as HTMLInputElement).value = contractor.postalCode;
            // (document.getElementById("contractorStreet") as HTMLInputElement).value = contractor.street;
            // (document.getElementById("contractorBuilding") as HTMLInputElement).value = contractor.building;
            // (document.getElementById("contractorApartment") as HTMLInputElement).value = contractor.apartment;
            // (document.getElementById("contractorMail") as HTMLInputElement).value = contractor.email;
            contractorSuggestions.style.display = "none";
        });
        contractorSuggestions.appendChild(item);
    }
    contractorSuggestions.style.display = "block";
}

identifierOptions.forEach((option) => {
    option.addEventListener("change", () => {
        const showNip = option.value === "nip";
        contractorNip.style.display = showNip ? "" : "none";
        contractorNipInput.required = showNip;
        if (!showNip)
            contractorNipInput.value = "";
    });
});

// ---------------------------------------------------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------------------------------------------------

function calculatePositionsRow(row: Element): void {
    const priceElement = row.querySelector(".price") as HTMLInputElement;
    const quantityElement = row.querySelector(".quantity") as HTMLInputElement;
    const vatRateElement = row.querySelector(".vat-rate") as HTMLSelectElement | null;

    const price = parseFloat(priceElement?.value) || 0;
    const quantity = parseFloat(quantityElement?.value) || 0;
    const vatRate = vatRateElement?.value ?? "";

    const net = price * quantity;
    let vat = 0;
    if (vatRate !== "zw") vat = net * (parseFloat(vatRate) || 0) / 100;
    const gross = net + vat;

    const netInput = row.querySelector(".net") as HTMLInputElement | null;
    const vatInput = row.querySelector(".vat") as HTMLInputElement | null;
    const grossInput = row.querySelector(".gross") as HTMLInputElement | null;

    if (netInput) netInput.value = net.toFixed(2);
    if (vatInput) vatInput.value = vat.toFixed(2);
    if (grossInput) grossInput.value = gross.toFixed(2);

    calculatePositionsTotals();
}

function calculatePositionsTotals(): void {
    let totalNet = 0;
    let totalVat = 0;
    let totalGross = 0;

    document.querySelectorAll(".item-row").forEach((row) => {
        const net = parseFloat((row.querySelector(".net") as HTMLInputElement)?.value) || 0;
        const vat = parseFloat((row.querySelector(".vat") as HTMLInputElement)?.value) || 0;
        const gross = parseFloat((row.querySelector(".gross") as HTMLInputElement)?.value) || 0;

        totalNet += net;
        totalVat += vat;
        totalGross += gross;
    });

    const totalNetElement = document.getElementById("totalNet");
    const totalVatElement = document.getElementById("totalVat");
    const totalGrossElement = document.getElementById("totalGross");

    if (totalNetElement) totalNetElement.textContent = totalNet.toFixed(2);
    if (totalVatElement) totalVatElement.textContent = totalVat.toFixed(2);
    if (totalGrossElement) totalGrossElement.textContent = totalGross.toFixed(2);
}

document.addEventListener("input", (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains("price") || target.classList.contains("quantity")) {
        const row = target.closest(".item-row");
        if (row)
            calculatePositionsRow(row);
    }
    if (target.id === "notes") {
        const notesCount = document.getElementById("notesCount");

        if (notesCount) {
            notesCount.textContent = (target as HTMLTextAreaElement).value.length.toString();
        }
    }
});

document.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains("vat-rate")) {
        const row = target.closest(".item-row");
        if (row) calculatePositionsRow(row);
    }
});

const addItem = document.getElementById("addItem");
addItem?.addEventListener("click", () => {
    const tbody = document.getElementById("itemsBody");
    if (!tbody) return;
    const firstRow = tbody.querySelector(".item-row");
    if (!firstRow) return;
    const newRow = firstRow.cloneNode(true) as HTMLElement;
    newRow.querySelectorAll("input").forEach((input) => {
        if (input.classList.contains("quantity"))
            (input as HTMLInputElement).value = "1";
        else
            (input as HTMLInputElement).value = "";
    });
    const vatRate = newRow.querySelector(".vat-rate") as HTMLSelectElement | null;
    if (vatRate) vatRate.value = "23";
    tbody.appendChild(newRow);
    updateItemNumber();
    calculatePositionsRow(newRow);
});

document.addEventListener("click", (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains("remove-item")) {
        const rows = document.querySelectorAll(".item-row");
        if (rows.length > 1) {
            target.closest(".item-row")?.remove();
            updateItemNumber();
            calculatePositionsTotals();
        }
    }
});

function updateItemNumber(): void {
    document.querySelectorAll(".item-row").forEach((row, index) => {
        const numberElement = row.querySelector(".item-number");
        if (numberElement) numberElement.textContent = String(index + 1);
    });
}

// ---------------------------------------------------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------------------------------------------------

function updatePaymentDeadline(): void {
    const issueDateInput = document.querySelector('input[type="date"]') as HTMLInputElement | null;
    const daysInput = document.getElementById("paymentDays") as HTMLInputElement | null;
    const deadlineInput = document.getElementById("paymentDeadline") as HTMLInputElement | null;
    if (!issueDateInput || !daysInput || !deadlineInput) return;
    if (!issueDateInput.value) return;
    const date = new Date(`${issueDateInput.value}T00:00:00`);
    const days = parseInt(daysInput.value, 10) || 0;
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    deadlineInput.value = `${year}-${month}-${day}`;
}

document.getElementById("paymentDays")?.addEventListener("input", updatePaymentDeadline);

// ---------------------------------------------------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------------------------------------------------
document.getElementById("invoiceForm")?.addEventListener("submit", (event: Event) => {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement;
        if (!form.checkValidity()) {
            event.stopPropagation();
            form.classList.add("was-validated");
            return;
        }
        alert("Invoice saved successfully.");
    });

document.getElementById("savePdf")?.addEventListener("click", () => {
    const form = document.getElementById("invoiceForm") as HTMLFormElement | null;
    if (!form) return;
    if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
    }
    alert("Invoice saved. PDF preview would open here.");
});

async function initNew() {
    await initInvoiceData();
    await initContractorData();
    document.querySelectorAll(".item-row").forEach((row) => calculatePositionsRow(row));
}

void initNew();