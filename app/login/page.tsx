import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  if (await getSession()) redirect("/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <form
        action="/api/auth/login"
        method="post"
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-foreground">Administration</h1>
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Email ou mot de passe incorrect.
          </p>
        )}
        <input type="hidden" name="next" value={next ?? "/dashboard"} />
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            className="h-10 w-full rounded-md border border-input bg-background px-3"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Mot de passe</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-10 w-full rounded-md border border-input bg-background px-3"
          />
        </label>
        <button
          type="submit"
          className="h-10 w-full rounded-md bg-primary font-medium text-primary-foreground hover:bg-primary/90"
        >
          Se connecter
        </button>
      </form>
    </main>
  );
}
