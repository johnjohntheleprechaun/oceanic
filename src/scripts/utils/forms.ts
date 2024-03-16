/**
 * Wait for a form to be submitted with contents deemed valid by the verifier function
 * @param form The form to await submission on
 * @param verifier The function that verifies form contents
 * @returns The form's data
 */
export async function formSubmit(form: HTMLFormElement, verifier?: (formData: FormData) => boolean): Promise<FormData> {
    return new Promise((resolve, reject) => {
        form.addEventListener("submit", function verifySubmit(event) {
            event.preventDefault();
            const formData = new FormData(form);
            console.log(formData);
            if (!verifier) {
                // Always resolve if no verifier was provided
                resolve(formData);
                form.removeEventListener("submit", verifySubmit);
            }
            if (verifier(formData)) {
                resolve(formData);
                console.log("verified");
                form.removeEventListener("submit", verifySubmit);
            } else {
                // indicate to the user somehow
            }
        });
    });
}