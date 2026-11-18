import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Create Account | Nexvia Workspace",
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <RegisterForm />
    </main>
  );
}