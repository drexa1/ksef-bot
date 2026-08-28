import {getCurrentLocation} from "../location";

// ---------------------------------------------------------------------------------------------------------------------
// Invoice data
// ---------------------------------------------------------------------------------------------------------------------

/// TODO: prefill from user settings
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
const contractorNameSuggestions = document.getElementById("contractorNameSuggestions") as HTMLDivElement;
const identifierOptions = document.querySelectorAll<HTMLInputElement>('input[name="contractorIdentifier"]');
const contractorNip = document.getElementById("contractorNip") as HTMLElement;
const contractorNipInput = document.getElementById("contractorNipInput") as HTMLInputElement;
const contractorNipSuggestions = document.getElementById("contractorNipSuggestions") as HTMLDivElement;
const contractorTown = document.getElementById("contractorTown") as HTMLInputElement;
const contractorPostalCode = document.getElementById("contractorPostalCode") as HTMLInputElement;
const contractorStreet = document.getElementById("contractorStreet") as HTMLInputElement;
const contractorBuilding = document.getElementById("contractorBuilding") as HTMLInputElement;
const contractorApartment = document.getElementById("contractorApartment") as HTMLInputElement;
const contractorMail = document.getElementById("contractorMail") as HTMLInputElement;

/// Prefilled values for the Contractor Data section
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

/// Autocomplete by contractor name ------------------------------------------------------------------------------------
let selectedContractorIndex = -1;
contractorNameInput.addEventListener("input", () => {
    selectedContractorIndex = -1;
    if (contractorNameInput.value.trim().length < 3) {
        contractorNameSuggestions.style.display = "none";
        return;
    }
    searchContractors(contractorNameInput.value);
});

contractorNameInput.addEventListener("keydown", (event) => {
    const suggestions = Array.from(contractorNameSuggestions.querySelectorAll<HTMLElement>(".contractor-suggestion"));
    if (contractorNameSuggestions.style.display === "none" || suggestions.length === 0)
        return;
    switch (event.key) {
        case "ArrowDown":
            event.preventDefault();
            selectedContractorIndex++;
            if (selectedContractorIndex >= suggestions.length)
                selectedContractorIndex = 0;
            updateSelectedSuggestion(suggestions);
            break;
        case "ArrowUp":
            event.preventDefault();
            selectedContractorIndex--;
            if (selectedContractorIndex < 0)
                selectedContractorIndex = suggestions.length - 1;
            updateSelectedSuggestion(suggestions);
            break;
        case "Enter":
            event.preventDefault();
            if (selectedContractorIndex >= 0)
                suggestions[selectedContractorIndex].click();
            break;
        case "Escape":
            event.preventDefault();
            contractorNameSuggestions.style.display = "none";
            selectedContractorIndex = -1;
            break;
    }
});

function updateSelectedSuggestion(suggestions: HTMLElement[]): void {
    suggestions.forEach((suggestion, index) => suggestion.classList.toggle("selected", index === selectedContractorIndex));
}

function searchContractors(nameQuery: string): void {
    const contractors = [
        {
            id: 1,
            name: "Pollas1 Sp. z o.o.",
            nip: "1111111111",
            town: undefined,
            postalCode: "30-001",
            street: "Floriańska1",
            building: "10",
            apartment: "1",
            email: "office1@abc.pl"
        },
        {
            id: 2,
            name: "Pollas2 Sp. z o.o.",
            nip: "2222222222",
            town: "Kraków",
            postalCode: "30-002",
            street: "Floriańska2",
            building: undefined,
            apartment: "2",
            email: "office2@abc.pl"
        }
    ];
    const results = contractors.filter((c) =>
        c.name.toLowerCase().includes(nameQuery.trim().toLowerCase())
    );
    renderContractorNameSuggestions(results);
}

function renderContractorNameSuggestions(contractors: Contractor[]) {
    contractorNameSuggestions.innerHTML = "";
    for (const contractor of contractors) {
        const item = document.createElement("div");
        item.className = "contractor-suggestion";
        item.innerHTML = `
            <div class="form-label fw-bold">
                ${contractor.name}
            </div>
            <div class="contractor-suggestion-details">
                NIP: ${contractor.nip}
            </div>
        `;
        item.addEventListener("click", () => {
            contractorNameInput.value = contractor.name;
            contractorNipInput.value = contractor.nip ?? "";
            contractorTown.value = contractor.town ?? "";
            contractorPostalCode.value = contractor.postalCode ?? "";
            contractorStreet.value = contractor.street ?? "";
            contractorBuilding.value = contractor.building ?? "";
            contractorApartment.value = contractor.apartment ?? "";
            contractorMail.value = contractor.email ?? "";
            // Hide suggestions
            contractorNameSuggestions.style.display = "none";
        });
        contractorNameSuggestions.appendChild(item);
    }
    contractorNameSuggestions.style.display = "block";
}

/// Autocomplete by contractor NIP ------------------------------------------------------------------------------------
let selectedContractorNipIndex = -1;
contractorNipInput.addEventListener("input", () => {
    selectedContractorNipIndex = -1;
    if (contractorNipInput.value.trim().length < 3) {
        contractorNipSuggestions.style.display = "none";
        return;
    }
    searchContractorsByNip(contractorNipInput.value);
});

contractorNipInput.addEventListener("keydown", (event) => {
    const suggestions = Array.from(contractorNipSuggestions.querySelectorAll<HTMLElement>(".contractor-suggestion"));
    if (contractorNipSuggestions.style.display === "none" || suggestions.length === 0)
        return;
    switch (event.key) {
        case "ArrowDown":
            event.preventDefault();
            selectedContractorNipIndex++;
            if (selectedContractorNipIndex >= suggestions.length)
                selectedContractorNipIndex = 0;
            updateSelectedNipSuggestion(suggestions);
            break;
        case "ArrowUp":
            event.preventDefault();
            selectedContractorNipIndex--;
            if (selectedContractorNipIndex < 0)
                selectedContractorNipIndex = suggestions.length - 1;
            updateSelectedNipSuggestion(suggestions);
            break;
        case "Enter":
            event.preventDefault();
            if (selectedContractorNipIndex >= 0)
                suggestions[selectedContractorNipIndex].click();
            break;
        case "Escape":
            event.preventDefault();
            contractorNipSuggestions.style.display = "none";
            selectedContractorNipIndex = -1;
            break;
    }
});

function updateSelectedNipSuggestion(suggestions: HTMLElement[]): void {
    suggestions.forEach((suggestion, index) => suggestion.classList.toggle("selected", index === selectedContractorNipIndex));
}

function searchContractorsByNip(nipQuery: string): void {
    const contractors: Contractor[] = [
        {
            name: "Pollas1 Sp. z o.o.",
            nip: "1111111111",
            town: undefined,
            postalCode: "30-001",
            street: "Floriańska1",
            building: "10",
            apartment: "1",
            email: "office1@abc.pl"
        },
        {
            name: "Pollas2 Sp. z o.o.",
            nip: "2222222222",
            town: "Kraków",
            postalCode: "30-002",
            street: "Floriańska2",
            building: undefined,
            apartment: "2",
            email: "office2@abc.pl"
        }
    ];
    const results = contractors.filter((c) => c.nip?.startsWith(nipQuery.trim()));
    renderContractorNipSuggestions(results);
}

function renderContractorNipSuggestions(contractors: Contractor[]): void {
    contractorNipSuggestions.innerHTML = "";
    for (const contractor of contractors) {
        const item = document.createElement("div");
        item.className = "contractor-suggestion";
        item.innerHTML = `
            <div class="form-label fw-bold">
                ${contractor.name}
            </div>
            <div class="contractor-suggestion-details">
                NIP: ${contractor.nip}
            </div>
        `;
        item.addEventListener("click", () => {
            contractorNameInput.value = contractor.name;
            contractorNipInput.value = contractor.nip ?? "";
            contractorTown.value = contractor.town ?? "";
            contractorPostalCode.value = contractor.postalCode ?? "";
            contractorStreet.value = contractor.street ?? "";
            contractorBuilding.value = contractor.building ?? "";
            contractorApartment.value = contractor.apartment ?? "";
            contractorMail.value = contractor.email ?? "";
            contractorNipSuggestions.style.display = "none";
            selectedContractorNipIndex = -1;
        });
        contractorNipSuggestions.appendChild(item);
    }
    contractorNipSuggestions.style.display = contractors.length > 0 ? "block" : "none";
}

/// Show/hide NIP
identifierOptions.forEach((option) => {
    option.addEventListener("change", () => {
        const showNip = option.value === "nip";
        contractorNip.style.display = showNip ? "" : "none";
        contractorNipInput.required = showNip;
        if (!showNip) contractorNipInput.value = "";
    });
});

// ---------------------------------------------------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------------------------------------------------

/// Calculate net, VAT and gross per invoice position
function calculatePositionsRow(row: Element): void {
    const rowIndex = row.querySelector<HTMLSpanElement>("#rowIndex") as HTMLSpanElement;

    const itemPrice = row.querySelector<HTMLInputElement>(`#itemPrice${rowIndex.textContent}`)!;
    const itemQuantity = row.querySelector<HTMLInputElement>(`#itemQuantity${rowIndex.textContent}`)!;
    const itemVATrate = row.querySelector(`#itemVAT${rowIndex.textContent}`) as unknown as HTMLSelectElement;

    const grossUnitPrice = parseFloat(itemPrice?.value) || 0;
    const quantity = parseFloat(itemQuantity?.value) || 0;
    const VATrate = itemVATrate?.value || "23";

    const gross = grossUnitPrice * quantity;
    let VAT = 0;
    let net = gross;
    if (VATrate !== "ZW") {
        const rate = parseFloat(VATrate) / 100;
        net = gross / (1 + rate);
        VAT = gross - net;
    }

    const netInput = row.querySelector<HTMLInputElement>(`#itemNet${rowIndex.textContent}`)!;
    const VATInput = row.querySelector<HTMLInputElement>(`#itemVATamount${rowIndex.textContent}`)!;
    const grossInput = row.querySelector<HTMLInputElement>(`#itemGross${rowIndex.textContent}`)!;

    netInput.value = net.toFixed(2);
    VATInput.value = VAT.toFixed(2);
    grossInput.value = gross.toFixed(2);

    calculatePositionsTotals();
}

/// Recalculate net, VAT and gross per on change of price, quantity or VAT
document.addEventListener("input", (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.id.startsWith("itemPrice") || target.id.startsWith("itemQuantity") || target.id.startsWith("itemVAT")) {
        const row = target.closest(".item-row")!;
        calculatePositionsRow(row);
    }
});

/// Calculate totals for net, VAT and gross
function calculatePositionsTotals(): void {
    let totalNet = 0;
    let totalVAT = 0;
    let totalGross = 0;

    document.querySelectorAll(".item-row").forEach((row) => {
        const rowIndex = row.querySelector<HTMLSpanElement>("#rowIndex") as HTMLSpanElement;
        const rowNet = row.querySelector<HTMLInputElement>(`#itemNet${rowIndex.textContent}`)!;
        const rowVAT = row.querySelector<HTMLInputElement>(`#itemVATamount${rowIndex.textContent}`)!;
        const rowGross = row.querySelector<HTMLInputElement>(`#itemGross${rowIndex.textContent}`)!;
        totalNet += parseFloat(rowNet.value);
        totalVAT += parseFloat(rowVAT.value);
        totalGross += parseFloat(rowGross.value);
    });

    const totalNetElement = document.getElementById("totalNet")!;
    const totalVATElement = document.getElementById("totalVAT")!;
    const totalGrossElement = document.getElementById("totalGross")!;

    totalNetElement.textContent = totalNet.toFixed(2);
    totalVATElement.textContent = totalVAT.toFixed(2);
    totalGrossElement.textContent = totalGross.toFixed(2);
}

/// Remove invoice position
document.addEventListener("click", (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.id.startsWith("removePosition")) {
        target.closest(".item-row")?.remove();
        updateItemNumber();
        calculatePositionsTotals();
    }
});

/// Add invoice position
document.getElementById("addItem")!.addEventListener("click", () => {
    const tbody = document.getElementById("itemsBody")!;
    const firstRow = tbody.querySelector(".item-row")!;
    const newRow = firstRow.cloneNode(true) as HTMLElement;
    newRow.querySelectorAll("input").forEach((input) => {
        if (input.classList.contains("quantity"))
            (input as HTMLInputElement).value = "1";
        else
            (input as HTMLInputElement).value = "";
    });
    const VATrate = newRow.querySelector(".VATrate") as unknown as HTMLSelectElement;
    if (VATrate) VATrate.value = "23";
    tbody.appendChild(newRow);
    updateItemNumber();
    calculatePositionsRow(newRow);
});

function updateItemNumber(): void {
    document.querySelectorAll(".item-row").forEach((row, index) => {
        const rowIndex = row.querySelector<HTMLSpanElement>("#rowIndex") as HTMLSpanElement;
        if (rowIndex) rowIndex.textContent = String(index + 1);
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
    document.querySelectorAll(".item-row").forEach(calculatePositionsRow);
}

void initNew();