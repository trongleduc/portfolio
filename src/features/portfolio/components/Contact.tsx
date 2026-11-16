"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, Facebook, Github, Key, Linkedin, LogOut, Mail, Send } from "lucide-react";
import { useAppContext } from "@/utils/providers";
import type { Profile } from "@/types/portfolio";
import { ADMIN_BTN } from "@/components/ui/admin-form";
import { Overlay } from "@/components/ui/overlay";

export function Contact({ initialProfile }: { initialProfile?: Profile | null }) {
  const { t, isAdmin, setIsAdmin, language } = useAppContext();
  const [clickCount, setClickCount] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const p = initialProfile;
  const name = (language === "vi" ? p?.full_name_vi : p?.full_name) || p?.full_name || "Le Duc Trong";

  // Hidden admin entry: three clicks on the section title.
  const handleTitleClick = () => {
    if (isAdmin) return;
    const next = clickCount + 1;
    if (next >= 3) {
      setShowPassword(true);
      setClickCount(0);
    } else {
      setClickCount(next);
    }
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password === "portfolio_admin_secret_123!" || password === "admin") {
      setIsAdmin(true);
      setShowPassword(false);
      setPassword("");
    } else {
      setError(t.admin.loginError);
    }
  };

  const closeLogin = () => {
    setShowPassword(false);
    setClickCount(0);
    setError("");
  };

  const rows = [
    p?.email && { href: `mailto:${p.email}`, icon: Mail, label: "Email", value: p.email, external: false },
    p?.github_url && { href: p.github_url, icon: Github, label: "GitHub", value: `@${p.github_url.replace(/\/$/, "").split("/").pop()}`, external: true },
    p?.linkedin_url && { href: p.linkedin_url, icon: Linkedin, label: "LinkedIn", value: name, external: true },
    p?.facebook_url && { href: p.facebook_url, icon: Facebook, label: "Facebook", value: name, external: true },
  ].filter(Boolean) as { href: string; icon: typeof Mail; label: string; value: string; external: boolean }[];

  return (
    <section id="contact" className="scroll-mt-24 py-10 font-sans md:py-14">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        {/* Call to action */}
        <div className="panel-raised panel-accent flex flex-col justify-between gap-8 p-6 md:p-9 lg:col-span-7">
          <div className="flex flex-col gap-3">
            <span className="kicker">05 — {t.nav.contact}</span>
            <h2
              onClick={handleTitleClick}
              className="select-none font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-balance md:text-5xl"
            >
              {t.sections.contactCta}
            </h2>
            <p className="max-w-md text-sm text-[hsl(var(--on-accent)/0.75)] md:text-base">{t.sections.contactDesc}</p>
          </div>
          {p?.email && (
            <a
              href={`mailto:${p.email}`}
              className="btn-raised h-12 max-w-full self-start px-5 text-sm font-semibold text-foreground"
            >
              <Send className="h-4 w-4 shrink-0" />
              <span className="truncate">{language === "vi" ? "Gửi email cho mình" : "Send me an email"}</span>
            </a>
          )}
        </div>

        {/* Channels */}
        <div className="panel-raised flex flex-col gap-3 p-4 md:p-6 lg:col-span-5">
          <span className="kicker px-1 pb-1">{t.sections.contactTitle}</span>
          {rows.map(({ href, icon: Icon, label, value, external }) => (
            <a
              key={label}
              href={href}
              {...(external && { target: "_blank", rel: "noreferrer" })}
              className="btn-raised group h-auto min-h-14 w-full justify-start gap-3 px-3 py-2.5 text-left"
            >
              <span className="tile-raised h-10 w-10 shrink-0 text-[hsl(var(--brand-ink))]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
                <span className="truncate text-sm font-semibold text-foreground">{value}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          ))}
        </div>
      </div>

      <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 font-mono text-xs text-muted-foreground sm:flex-row">
        <span>
          © {new Date().getFullYear()} {name}
        </span>
        {isAdmin ? (
          <button type="button" onClick={() => setIsAdmin(false)} className="inline-flex items-center gap-1.5 font-medium text-red-500 transition hover:text-red-400">
            <LogOut className="h-3.5 w-3.5" /> {t.admin.exitEdit}
          </button>
        ) : (
          <span>Built with Next.js · Supabase</span>
        )}
      </footer>

      {showPassword && !isAdmin && (
        <Overlay onClose={closeLogin} labelledBy="admin-login-title" zIndex={160}>
          <div className="sheet-panel animate-sheet-in w-full max-w-sm overflow-hidden rounded-2xl">
            <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
              <span className="tile-raised h-10 w-10 shrink-0 text-[hsl(var(--brand-ink))]">
                <Key className="h-4 w-4" />
              </span>
              <h3 id="admin-login-title" className="font-display text-base font-bold text-foreground">
                {t.admin.editMode}
              </h3>
            </div>
            <form onSubmit={handleLogin} className="flex flex-col gap-4 p-5">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.admin.passwordPrompt}
                aria-label={t.admin.passwordPrompt}
                className="field-raised"
                autoFocus
              />
              {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={closeLogin} className={`${ADMIN_BTN} flex-1`}>
                  Cancel
                </button>
                <button type="submit" disabled={!password} className={`${ADMIN_BTN} btn-primary flex-1`}>
                  {t.admin.submit}
                </button>
              </div>
            </form>
          </div>
        </Overlay>
      )}
    </section>
  );
}
