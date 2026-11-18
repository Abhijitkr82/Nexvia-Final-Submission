"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import ErrorMessage from "@/components/common/ErrorMessage";
import AuthCard from "@/components/auth/AuthCard";
import { login } from "@/services/authService";
import { validateLoginForm } from "@/lib/validators/auth";
export default function LoginForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
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

    const validationErrors = validateLoginForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    setApiError("");

    try {
      await login(form.email, form.password);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setApiError(error.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your Nexvia workspace"
      footer={
        <>
          Don't have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Create account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <ErrorMessage message={apiError} />

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
          placeholder="Enter your password"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          required
        />

        <Button type="submit" block loading={loading}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}