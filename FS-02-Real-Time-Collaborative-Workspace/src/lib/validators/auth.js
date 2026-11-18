const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
    const value = email.trim();

    if (!value) {
        return "Email is required";
    }

    if (!EMAIL_PATTERN.test(value)) {
        return "Enter a valid email address";
    }

    return null;
}

export function validateLoginForm({ email, password }) {
    const errors = {};

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    if (!password) errors.password = "Password is required";

    return errors;
}

export function validateRegisterForm({
    name,
    email,
    password,
    confirmPassword,
}) {
    const errors = {};

    const cleanName = name.trim();

    if (cleanName.length < 2 || cleanName.length > 50) {
        errors.name = "Name must be 2-50 characters";
    }

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    if (password.length < 8 || password.length > 72) {
        errors.password = "Password must be 8-72 characters";
    }
    if (!confirmPassword) {
        errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
    }
    return errors;
}