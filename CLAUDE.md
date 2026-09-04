# PropMate — Claude Code Instructions

@AGENTS.md

## Quick Commands
- **Build / Type Gate:** `npx next build` (Turbopack, mandatory before commit)
- **Dev Server:** `npm run dev`
- **Prisma Generate:** `npx prisma generate`
- **Do NOT run:** `next lint` (fails due to spaces in folder name) or `npx vercel --prod` (disconnects Vercel project)

## Agent Memory Protocol
1. **Always read memory before starting:**
   - Active roadmap: `../Knotpad_Notes/PropMate Reference/04_Index_Roadmap_Stack.md` § B
   - Latest changes: `../Knotpad_Notes/PropMate Reference/05_Changelog.md`
2. **Scratch files:** `E:\Unitar document\Course\Year 3 Sem 1\Minor Project\FYP\Gemini\claude-scratch\` (NEVER write to `C:\`).
3. **Always log after finishing:**
   - Increment to `DEV-(NN+1)` in `05_Changelog.md` and check off tasks in `04_Index_Roadmap_Stack.md`.
   - Run `npx next build` to guarantee 0 errors.
   - Commit & push: `git add . && git commit -m "feat/fix: DEV-NN ..." && git push origin main`.
