export function newPasswordVerifier(formData: FormData): boolean {
    if (formData.get("password") === formData.get("password-verify")) {
        return true;
    } else {
        return false;
    }
}