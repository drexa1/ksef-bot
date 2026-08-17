function initInvoiceData() {
    const invoiceData = document.getElementById("invoiceData") as HTMLDivElement;
    const invoiceNumber = invoiceData.querySelector("#invoiceNumber") as HTMLInputElement;
    invoiceNumber.value = "pollas";
}

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

// ---------------------------------------------------------------------------------------------------------------------
// Input handlers
// ---------------------------------------------------------------------------------------------------------------------

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

document.querySelectorAll(".item-row").forEach((row) => {
    initInvoiceData();
    calculatePositionsRow(row);
});