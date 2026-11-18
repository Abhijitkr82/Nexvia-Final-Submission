import { redirect } from "next/navigation";
import getCurrentUser from "@/lib/auth/getCurrentUser";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function AppLayout({ children }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-lg font-bold text-indigo-600">
              Nexvia Workspace
            </p>
            <p className="text-xs text-slate-500">
              Collaborative workspace
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-600 sm:block">
              {user.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}