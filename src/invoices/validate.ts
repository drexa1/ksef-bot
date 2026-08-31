const errorElement = document.getElementById("invoiceFormError")!;

export function validateInvoiceForm(form: HTMLFormElement): boolean {
    const invalidFields: HTMLInputElement[] = [];
    form.querySelectorAll("input, select, textarea").forEach((element) => {
        const field = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (field.disabled) return;
        if (field.required && !field.value.trim())
            invalidFields.push(field as HTMLInputElement);
    });
    if (invalidFields.length === 0) {
        updateInvalidSections(form);
        return true;
    }
    invalidFields.forEach((field) => field.classList.add("is-invalid"));
    updateInvalidSections(form);
    errorElement.textContent = `${invalidFields.length} required field${invalidFields.length === 1 ? "" : "s"}.`;
    errorElement.classList.remove("d-none");
    invalidFields[0].focus();
    return false;
}

export function clearValidationErrors(form: HTMLFormElement): void {
    form.querySelectorAll(".is-invalid").forEach((element) => element.classList.remove("is-invalid"));
    form.querySelectorAll(".invoice-card.has-invalid").forEach((section) => section.classList.remove("has-invalid"));
    errorElement.textContent = "";
    errorElement.classList.add("d-none");
}

function updateInvalidSections(form: HTMLFormElement): void {
    form.querySelectorAll(".invoice-card").forEach((section) => {
        const hasInvalid = section.querySelector(".is-invalid") !== null;
        section.classList.toggle("has-invalid", hasInvalid);
    });
}

export function updateFormError(form: HTMLFormElement): void {
    updateInvalidSections(form);
    const invalidFields = form.querySelectorAll(".is-invalid");
    if (invalidFields.length === 0) {
        errorElement.textContent = "";
        errorElement.classList.add("d-none");
    } else {
        errorElement.textContent = `${invalidFields.length} required field${invalidFields.length === 1 ? "" : "s"}.`;
        errorElement.classList.remove("d-none");
    }
}