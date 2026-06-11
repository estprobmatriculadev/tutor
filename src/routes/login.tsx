import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Painel Estágio Probatório" },
      { name: "description", content: "Acesse o Painel de Observação Formativa do Estágio Probatório com sua conta Google institucional." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    const session = sessionStorage.getItem("ep_user");
    if (session) {
      navigate({ to: "/" });
    }
  }, [navigate]);

  function handleGoogleLogin() {
    setLoading(true);
    setError("");

    // Build the Google OAuth URL
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      // Fallback: redirect to Google accounts with a deep-link
      const redirectUri = window.location.origin + "/auth/callback";
      const scope = encodeURIComponent("openid email profile");
      const state = encodeURIComponent(crypto.randomUUID());
      sessionStorage.setItem("oauth_state", state);

      const params = new URLSearchParams({
        client_id: clientId || "missing",
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        hd: "escola.pr.gov.br",
        prompt: "select_account",
        access_type: "offline",
      });

      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      return;
    }

    // Simulate demo login for non-OAuth environments
    setTimeout(() => {
      sessionStorage.setItem("ep_user", JSON.stringify({
        name: "Usuário Painel",
        email: "usuario@escola.pr.gov.br",
        picture: null,
      }));
      setLoading(false);
      navigate({ to: "/" });
    }, 1200);
  }

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div
        className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 animate-float"
        style={{ background: "radial-gradient(circle, #43a047 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-15 animate-float"
        style={{ background: "radial-gradient(circle, #1976d2 0%, transparent 70%)", animationDelay: "2s" }}
      />
      <div
        className="pointer-events-none absolute top-1/3 right-1/4 w-48 h-48 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #43a047 0%, transparent 70%)", animationDelay: "1s" }}
      />

      <div className="w-full max-w-md z-10">
        {/* Logo Card */}
        <div className="animate-fade-in-up mb-6 text-center">
          <img
            src="https://www.educacao.pr.gov.br/sites/default/arquivos_restritos/files/imagem/2025-07/estagio-probatorio690x311.png"
            alt="Estágio Probatório"
            className="mx-auto h-20 object-contain drop-shadow-md"
            onError={(e) => {
              // fallback if logo fails to load
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        {/* Main Login Card */}
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up-delay">
          {/* Header Strip */}
          <div className="header-gradient px-8 py-6">
            <h1 className="text-xl font-bold text-white leading-tight">
              Painel de Observação Formativa
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Secretaria de Estado da Educação · Paraná
            </p>
          </div>

          {/* Body */}
          <div className="px-8 py-8">
            <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
              Acesse com sua conta Google institucional{" "}
              <span className="font-medium text-foreground">@escola.pr.gov.br</span>{" "}
              para visualizar o painel de acompanhamento.
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              id="btn-google-login"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="btn-google w-full flex items-center justify-center gap-3 rounded-xl px-6 py-3.5 font-medium text-gray-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Entrando…</span>
                </>
              ) : (
                <>
                  {/* Google Logo SVG */}
                  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v8.51h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.16 7.09-10.36 7.09-17.14z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  </svg>
                  <span>Continuar com Google</span>
                </>
              )}
            </button>

            <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>acesso restrito</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground leading-relaxed">
              Apenas tutores e técnicos com conta{" "}
              <span className="font-medium">@escola.pr.gov.br</span> têm acesso
              a este painel.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="animate-fade-in-up-delay2 mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} · SEED-PR · Programa Estágio Probatório
        </p>
      </div>
    </div>
  );
}
