# PropMate — Claude Code Instructions

@AGENTS.md

## Quick Commands
- **Build / Type Gate:** `npx next build` (Turbopack, mandatory before commit)
- **Dev Server:** `npm run dev`
- **Prisma Generate:** `npx prisma generate`
- **Do NOT run:** `next lint` (fails due to spaces in folder name) or `npx vercel --prod` (disconnects Vercel project)

## Agent Memory Protocol
1. **Always read memory before starting:**
   - Active roadmap: `../Knotpad_Notes/PropMate Reference/04 Index Roadmap Stack.md` § B (Knotpad: `04 Index Roadmap Stack`)
   - Latest changes: `../Knotpad_Notes/PropMate Reference/05_Changelog.md` (Knotpad: `05 Changelog (Newest to Oldest)`)
2. **Knotpad Desktop MCP (folder `PropMate Development`):**
   - The workspace was **re-imported in Oct 2026 and every note id changed**, so ids are no longer listed here — they go stale. Find notes by **title** with `search_notes` / `get_workspace_overview`.
   - Read first: **`00 Architecture & Agent`** (schema, auth layers, module pattern, conventions, known drift).
   - Then: **`07 Session Checkpoint & Resume`** (read before resuming, write before stopping) and **`05 Changelog (Newest to Oldest)`**.
   - Open work: **`04 Index Roadmap Stack`** § B. Data edits: **`12 Data Change Log`**. UAT: **`15 UAT`**.
   - **Write with `append_to_note`, not `update_note` (user, 2026-11-07).** Knotpad sorts and
     filters on its own, so the old "newest first, always" rule is retired — **append, date the
     entry, and never rewrite a note just to re-order it.** `update_note` has no partial edit, so
     a rewrite costs the whole note and risks blanking it; use it only when the content is wrong.
     Changelog entries append under **§ Appended entries**.

> **On-disk mirror has duplicates from that re-import.** Use the space-named files
> (`04 Index Roadmap Stack.md`); the underscore ones are 2026-09 snapshots and are
> banner-marked SUPERSEDED. The one exception is **`05_Changelog.md`**, which *is*
> the live full prose — `05 Changelog (Newest to Oldest).md` is only an export of
> the Knotpad index note.

3. **Scratch files:** `E:\Unitar document\Course\Year 3 Sem 1\Minor Project\FYP\Gemini\claude-scratch\` (NEVER write to `C:\`).
4. **Always log after finishing:**
   - Increment to `DEV-(NN+1)` (check the top of `05_Changelog.md` for the current number) and check off tasks in `04 Index Roadmap Stack.md`.
   - **Disk first, then Knotpad:** full prose into `05_Changelog.md` (newest-first at the top —
     free, it is a plain file), then one appended line in the Knotpad note.
   - Keep on-disk `../Knotpad_Notes/` and Knotpad MCP notes in 100% sync *in content*. Order may
     differ: the disk files stay newest-first, the Knotpad notes are append-order.
   - Run `npx next build` to guarantee 0 errors.
   - Commit & push: `git add . && git commit -m "feat/fix: DEV-NN ..." && git push origin main`.
5. **Two chats share this project — tell the other one (user, 2026-11-09).**
   The **report chat** owns the Major Project report and notes **14, 16–22**; this chat owns the
   code, `05_Changelog.md` and `12 Data Change Log`. **Never edit the other's notes.**
   The channel between them is **`23 Dev → Report Handover`** (Knotpad + disk) — *append* a dated
   entry, never rewrite an earlier one. Write there only when the work has a report consequence:
   - a change that **invalidates screenshots** or recorded UAT evidence;
   - a **requirement that does not match the build**, in either direction;
   - something **built that is deliberately staying out of the report**, and why;
   - a **data change** that alters what a participant or moderator will see;
   - an error found **in the report's own instruments** (UAT checklist, task scripts, criteria).

   Routine DEV-NN work with no report consequence does *not* belong there — that is what the
   changelog is for.

