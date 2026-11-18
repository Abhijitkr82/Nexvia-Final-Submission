"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import ErrorMessage from "@/components/common/ErrorMessage";
import AuthCard from "@/components/auth/AuthCard";
import { register } from "@/services/authService";
import { validateRegisterForm } from "@/lib/validators/auth";
export default function RegisterForm() {
    const router = useRouter();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState("");
    const [loading, setLoading] = useState(false);

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
        setErrors((previous) => ({ ...previous, [name]: "" }));
        setApiError("");
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const validationErrors = validateRegisterForm(form);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) return;

        setLoading(true);
        setApiError("");

        try {
            await register(
                form.name,
                form.email,
                form.password
            );

            router.replace("/dashboard");
            router.refresh();
        } catch (error) {
            setApiError(error.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthCard
            title="Create your account"
            subtitle="Start collaborating with your team"
            footer={
                <>
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        className="font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                        Sign in
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <ErrorMessage message={apiError} />

                <Input
                    id="name"
                    name="name"
                    label="Full name"
                    placeholder="Your name"
                    autoComplete="name"
                    value={form.name}
                    onChange={handleChange}
                    error={errors.name}
                    required
                />

                <Input
                    id="email"
                    name="email"
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    error={errors.email}
                    required
                />

                <Input
                    id="password"
                    name="password"
                    label="Password"
                    type="password"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    error={errors.password}
                    required
                />

                <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    label="Confirm password"
                    type="password"
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    required
                />

                <Button type="submit" block loading={loading}>
                    Create account
                </Button>
            </form>
        </AuthCard>
    );
}