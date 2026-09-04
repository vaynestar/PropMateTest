# PropMate — Claude Code Instructions

@AGENTS.md

## Quick Commands
- **Build / Type Gate:** `npx next build` (Turbopack, mandatory before commit)
- **Dev Server:** `npm run dev`
- **Prisma Generate:** `npx prisma generate`
- **Do NOT run:** `next lint` (fails due to spaces in folder name) or `npx vercel --prod` (disconnects Vercel project)

## Agent Memory Protocol
1. **Always read memory before starting:**
   - Active roadmap: `../Knotpad_Notes/PropMate Reference/04_Index_Roadmap_Stack.md` § B (or Knotpad Note `b56ef036-1cf0-47a1-a161-48f8774cf4c2`)
   - Latest changes: `../Knotpad_Notes/PropMate Reference/05_Changelog.md` (or Knotpad Note `2c67b0bc-0898-4f66-b5ec-9a11e4b2909c`)
2. **Knotpad Desktop MCP Mapping (Folder: `76eaecee-a79e-412d-81bd-5ed77e20153d`):**
   - `04 Index Roadmap Stack`: `b56ef036-1cf0-47a1-a161-48f8774cf4c2`
   - `05 Changelog (Newest to Oldest)`: `2c67b0bc-0898-4f66-b5ec-9a11e4b2909c`
   - `02 API Route Files`: `890b8b8e-c840-44e5-9327-c00dad1a4e2f`
   - `01 Feature List`: `77cef05f-4108-4ce6-bb24-dc96e17f00fc`
   - `03 Components Reference`: `efa526a9-ad6c-49eb-804b-bfe85ee43b6b`
   - `Master Note`: `d28fffa4-7383-4c80-a24d-3c7ad36b053f`
   - `00 Architecture & Agent Handoff`: `94d5748c-1178-4743-96bf-17c1d8383f60` **← read first: schema, auth layers, module pattern, conventions, known drift**
   - `🗃️ Knotpad Cleanup Archive — 2026-09-04`: `bda49e9e-4731-438b-b3bd-e89f52f8d547` (recovery record for removed/merged content)
   - `07 Session Checkpoint & Resume`: `f329157a-9bc8-48a0-adca-a7e123a75568` **← newest-first checkpoint log; read before resuming, write before stopping**
3. **Scratch files:** `E:\Unitar document\Course\Year 3 Sem 1\Minor Project\FYP\Gemini\claude-scratch\` (NEVER write to `C:\`).
4. **Always log after finishing:**
   - Increment to `DEV-(NN+1)` (next is `DEV-123`) in `05_Changelog.md` and check off tasks in `04_Index_Roadmap_Stack.md`.
   - Keep on-disk `../Knotpad_Notes/` and Knotpad MCP notes in 100% sync.
   - Run `npx next build` to guarantee 0 errors.
   - Commit & push: `git add . && git commit -m "feat/fix: DEV-NN ..." && git push origin main`.

