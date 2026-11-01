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
   - Then: **`07 Session Checkpoint & Resume`** (newest-first; read before resuming, write before stopping) and **`05 Changelog (Newest to Oldest)`**.
   - Open work: **`04 Index Roadmap Stack`** § B. Data edits: **`12 Data Change Log`**. UAT: **`15 UAT`**.

> **On-disk mirror has duplicates from that re-import.** Use the space-named files
> (`04 Index Roadmap Stack.md`); the underscore ones are 2026-09 snapshots and are
> banner-marked SUPERSEDED. The one exception is **`05_Changelog.md`**, which *is*
> the live full prose — `05 Changelog (Newest to Oldest).md` is only an export of
> the Knotpad index note.

3. **Scratch files:** `E:\Unitar document\Course\Year 3 Sem 1\Minor Project\FYP\Gemini\claude-scratch\` (NEVER write to `C:\`).
4. **Always log after finishing:**
   - Increment to `DEV-(NN+1)` (check the top of `05_Changelog.md` for the current number) and check off tasks in `04 Index Roadmap Stack.md`.
   - Keep on-disk `../Knotpad_Notes/` and Knotpad MCP notes in 100% sync.
   - Run `npx next build` to guarantee 0 errors.
   - Commit & push: `git add . && git commit -m "feat/fix: DEV-NN ..." && git push origin main`.

