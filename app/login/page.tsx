"use client";

import { useActionState, useState, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { loginAction } from "./actions";

function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "";

  return (
    <form className="flex flex-col gap-5" action={formAction}>
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {redirectTo && (
        <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30 text-xs text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          <span>Please sign in to access that page.</span>
        </div>
      )}

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
            className="w-full pl-10 pr-10 py-3 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-on-surface-variant/50 outline-none"
            id="password"
            name="password"
            placeholder="••••••••"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1 flex items-center justify-center rounded"
            title={showPassword ? "Hide password" : "Show password"}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </div>

      {state.error && (
        <p className="font-label-sm text-label-sm text-error-container bg-error/20 border border-error/40 rounded px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        className="pressable mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-60"
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
  );
}

export default function LoginPage() {
  return (
    <div className="bg-surface text-on-surface font-body-md min-h-[100dvh] w-full flex overflow-x-hidden">
      {/* Left Panel */}
      {/* Was two stacked blend layers over a violet radial burst, with a 40px
          glow around the logo and a drop-shadow on the wordmark. Calm surface,
          one hairline, no glow: the front door should look like the product
          behind it. */}
      <div className="hidden lg:flex lg:w-1/2 relative border-r border-outline-variant/40 bg-surface-container-lowest items-center justify-center">
        <div className="relative flex max-w-md flex-col items-start p-12">
          <Image
            src="/logo.png"
            alt=""
            width={56}
            height={56}
            className="mb-7 h-14 w-14 rounded-xl object-contain"
            priority
          />
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-white">
            PropMate
          </h1>
          <p className="mt-3 text-base leading-relaxed text-on-surface-variant">
            Your Best Mate of Solution for Property Management.
          </p>
          <dl className="mt-10 space-y-3 border-t border-outline-variant/40 pt-7 text-sm">
            {[
              ["Residents", "Invoices, bookings, visitor passes and helpdesk tickets."],
              ["Management", "Units, tenancies, billing runs and the facility schedule."],
            ].map(([who, what]) => (
              <div key={who} className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-on-surface">{who}</dt>
                <dd className="text-on-surface-variant">{what}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="relative z-10 flex w-full max-w-[400px] flex-col gap-7">
          {/* The logo and wordmark are in the left panel on a desktop; on a
              phone that panel is hidden, so they appear here instead of twice. */}
          <div className="flex items-center gap-3 lg:hidden">
            <Image
              src="/logo.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl object-contain"
              priority
            />
            <span className="text-xl font-semibold tracking-tight text-white">PropMate</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-white">Sign in</h2>

          <Suspense fallback={<div className="py-8 text-center text-sm text-on-surface-variant">Loading sign in…</div>}>
            <LoginForm />
          </Suspense>

          <p className="border-t border-outline-variant/40 pt-5 text-xs leading-relaxed text-on-surface-variant">
            <span className="font-semibold text-on-surface">Demo accounts</span>
            <br />
            admin@propmate.com · resident@propmate.com
          </p>
        </div>
      </div>
    </div>
  );
}
