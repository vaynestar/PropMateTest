"use client";

import { useActionState } from "react";
import Image from "next/image";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <div className="bg-surface text-on-surface font-body-md h-screen w-full flex overflow-hidden">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-surface-container-lowest overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-surface via-surface to-primary-container/20 z-10 mix-blend-overlay" />
        <div className="absolute inset-0 bg-cover bg-center z-0 opacity-60 mix-blend-screen bg-[radial-gradient(circle_at_30%_30%,#2e1a5e_0%,#0c1324_60%)]" />
        <div className="relative z-20 flex flex-col items-center text-center p-12 max-w-lg">
          <Image
            src="/logo.png"
            alt="PropMate Logo"
            width={72}
            height={72}
            className="w-18 h-18 rounded-2xl object-contain shadow-[0_0_30px_rgba(160,120,255,0.4)] mb-6"
            priority
          />
          <h1 className="font-display-lg text-display-lg text-on-surface mb-6 drop-shadow-lg">
            Elevate Your Portfolio.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
            Experience quiet authority in property management. PropMate delivers deep
            spatial insights and high-contrast analytics for the modern administrator.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-full max-w-[440px] bg-surface-container/50 backdrop-blur-xl border border-outline-variant rounded-lg p-8 sm:p-10 shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative z-10 flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 mb-2 lg:hidden">
              <Image
                src="/logo.png"
                alt="PropMate Logo"
                width={36}
                height={36}
                className="w-9 h-9 rounded-lg object-contain"
                priority
              />
              <span className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface">
                PropMate
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Sign in</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Enter your credentials to access the dashboard.
            </p>
          </div>

          <form className="flex flex-col gap-5" action={formAction}>
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  mail
                </span>
                <input
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-on-surface-variant/50 outline-none"
                  id="email"
                  name="email"
                  placeholder="admin@propmate.com"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  lock
                </span>
                <input
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-on-surface-variant/50 outline-none"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {state.error && (
              <p className="font-label-sm text-label-sm text-error-container bg-error/20 border border-error/40 rounded px-3 py-2">
                {state.error}
              </p>
            )}

            <button
              className="mt-4 w-full py-3 bg-gradient-to-r from-primary-container to-inverse-primary hover:brightness-110 text-white font-label-md text-label-md rounded shadow-[0_0_15px_rgba(160,120,255,0.2)] hover:shadow-[0_0_25px_rgba(160,120,255,0.4)] transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-60"
              type="submit"
              disabled={pending}
            >
              {pending ? "Signing in..." : "Sign in"}
              {!pending && (
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-outline-variant text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Demo accounts are seeded. Use admin@propmate.com / resident@propmate.com.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
