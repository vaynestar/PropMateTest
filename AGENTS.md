<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PropMate — Multi-Agent Engineering & Collaboration Guide

> **Welcome, AI Agent (Antigravity, Claude Code, Cursor, Windsurf, Copilot, etc.)!**
> This repository is collaboratively maintained by human developers and multiple autonomous AI agents.
> To prevent regressions, code duplication, or architectural drift, **all agents must follow this unified protocol**.

---

## 1. Project Snapshot & Tech Stack

- **Project:** PropMate — Web-Based Residential Property Management System (Malaysian Strata Housing).
- **Core Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4.
- **Data Layer:** Neon PostgreSQL (Serverless) + Prisma ORM v6.
- **Authentication:** Stateless JWT (`jose`, HS256), cookie `propmate_session`, sliding 7-day TTL.
- **Routing & Proxy:** Next.js 16 Edge proxy in `proxy.ts` (renamed from `middleware.ts`).
- **UI Design System:** "Obsidian PMS" dark theme (`globals.css`), Inter font, Material Symbols icons.
- **File & Media Storage:** Firebase Cloud Storage (Google Cloud Storage) via `/api/upload`.
- **Active Version:** Check the latest `DEV-NN` in `../Knotpad_Notes/PropMate Reference/05_Changelog.md`.

---

## 2. Where the Shared Memory Lives

All agents share project context through two synchronized memory layers:

1. **On-Disk Markdown Memory Mirror (`../Knotpad_Notes/`)**:
   - `00_DEVELOPMENT_MASTER.md`: Master architectural overview and project decisions.
   - `PropMate Reference/01_Feature_List.md`: Full catalog of 14 shipped feature modules and file mappings.
   - `PropMate Reference/02_API_Route_Files.md`: Complete map of 10 Route Handlers (`app/api/*`), Server Actions, and Page fetches.
   - `PropMate Reference/03_Components_Reference.md`: Comprehensive component library prop signatures and modal dialogs.
   - `PropMate Reference/04_Index_Roadmap_Stack.md`: **Single source of truth for the remaining roadmap (§ B)** and tech debt (§ I).
   - `PropMate Reference/05_Changelog.md`: Continuous chronological changelog from `DEV-01` to current `DEV-NN`.
   - `PropMate Reference/06_UI_Refinement_Plan.md`: Anti-AI-Slop audit findings and styling standards.
2. **Knotpad Desktop MCP (`knotpad-desktop`)**:
   - Folder: `PropMate Development` (`76eaecee-a79e-412d-81bd-5ed77e20153d`).
   - If your agent runtime supports MCP, the notes in this folder mirror the on-disk files above.

---

## 3. The 5-Step Shared Collaboration Loop

Every agent must follow this workflow on every task:

```
Step 1: Pull & Read Memory
   git pull origin main
   Read ../Knotpad_Notes/PropMate Reference/04_Index_Roadmap_Stack.md (§ B Roadmap)
   Read latest entry in ../Knotpad_Notes/PropMate Reference/05_Changelog.md
       ↓
Step 2: Implement within Architectural Rules
   Edit code following Master Rules (see Section 4 below)
       ↓
Step 3: Verification Gate (Mandatory)
   npx next build
   (Zero TypeScript errors, zero route compilation errors)
       ↓
Step 4: Update Shared Memory
   Increment version to DEV-(NN+1)
   Add entry to ../Knotpad_Notes/PropMate Reference/05_Changelog.md (and Knotpad MCP if connected)
   Check off item in ../Knotpad_Notes/PropMate Reference/04_Index_Roadmap_Stack.md § B
   Update 01_Feature_List.md / 02_API_Route_Files.md if routes/actions changed
       ↓
Step 5: Git Commit & Push
   git add <files>
   git commit -m "feat/fix: DEV-NN <description>"
   git push origin main
   (Vercel auto-deploys on push to main)
```

---

## 4. Master Engineering Rules (Non-Negotiable)

1. **Rule 1 — Build Gate:** Always run `npx next build` before committing. Never push broken TypeScript or failing route handlers. (Note: `next lint` fails on paths with spaces; use `next build` as the compiler gate).
2. **Rule 2 — File Storage Isolation:** **NEVER write files to the `C:\` drive.** All scratch scripts, temp files, test outputs, or data dumps must go to `E:\Unitar document\Course\Year 3 Sem 1\Minor Project\FYP\Gemini\` (or `FYP/Gemini/claude-scratch/`).
3. **Rule 3 — Anti-AI-Slop Form Subtitles:** Every modal input field and form control must include a clear, descriptive subtitle or helper text (e.g. *New Password — Minimum 6 characters*). Never display naked unlabeled inputs.
4. **Rule 4 — Unified UI Action Buttons:**
   - Primary action: `bg-primary hover:bg-primary/90 text-on-primary font-bold transition-all shadow-md pressable rounded-xl`
   - Secondary / Edit: `bg-surface-container-high hover:bg-surface-variant text-on-surface border border-outline-variant/60 rounded-xl pressable`
   - Destructive / Delete: `bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl pressable`
   - Quick Toggle: `bg-surface-container-high border border-outline-variant/60 rounded-lg px-2 py-1 text-on-surface`
5. **Rule 5 — Edge Proxy Exclusion Hardening:** `proxy.ts` matcher excludes `/api/*`. Every Route Handler under `app/api/` must independently verify session (`getSessionUser()`) and authorization (`requireUser(["Admin"])`).
6. **Rule 6 — Prisma Decimal Safety:** Prisma returns `Decimal` for currency and numeric quantities. Always wrap with `Number(...)` before returning or rendering in TypeScript objects.
7. **Rule 7 — Production Secrets & Vercel:** Do NOT commit `.env`. Vercel holds `DATABASE_URL` and `SESSION_SECRET`. Push to `main` for Vercel deploy; do NOT run `npx vercel --prod`.

---

## 5. Current Priority Next Moves

Refer to `../Knotpad_Notes/PropMate Reference/04_Index_Roadmap_Stack.md` § B for the active roadmap:
- [ ] **PWA install + offline** — `app/manifest.ts` exists; service worker / offline cache needed.
- [ ] **Billing Onboarding Setup Banner** — 4-step guided banner at top of `/admin/billing` (Charge Master ➔ Recurring ➔ Batch Generate ➔ Issue).
- [ ] **Guided Single Invoice Stepper Wizard** — Step-by-step modal for creating ad-hoc single invoices.
- [ ] **Draft ➔ Published / Issued Status Flow** — Transition workflow to publish invoices to Resident Portal.
- [ ] **Constrain status strings** — Introduce shared enum/const map for `Unit.status`, `Invoice.status`, `Booking.booking_status`, `Ticket.status`.

