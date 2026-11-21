---
world: obsidian
mode: operate
surface: admin
status: incumbent-documented
---

# Obsidian — the PropMate design system

The look PropMate already has, written down. Nothing here is new: it is the identity in
`app/globals.css` and `components/admin/ui.tsx`, made explicit so forty screens can agree with
each other instead of each inventing its own answer.

**Mode: Operate.** The admin console is a place where a person completes a task — raise the
invoices, verify a slip, assign the lift. Scanability, consistency and density outrank
expression. The brand lives in precise details, not in gestures. *The tool should disappear
into the task.*

**The use scene.** A management office in a Malaysian condominium: one or two officers at a
desktop, a supervisor on a phone walking the building, a guard at the gate with a tablet.
Fluorescent light, interruptions, a counter with a resident waiting at it. Nothing here is
read at leisure.

---

## Colors

### Surfaces — four, in this order, and no others

| Token | Hex | Used for |
|---|---|---|
| `surface-container-lowest` | `#070e1e` | dialogs, the layer above everything |
| `surface` / `background` | `#0c1324` | the page |
| `surface-container-low` | `#141b2c` | tables, the inside of a card |
| `surface-container` | `#181f31` | cards, table headers |
| `surface-container-high` | `#232a3c` | secondary buttons, inputs, raised chips |

A fifth surface is a mistake. If something needs to separate and these four are spent, use a
border, not another grey.

### Lines

| Token | Hex | Used for |
|---|---|---|
| `outline-variant` | `#494454` | every border, at 50–60% opacity |
| `outline` | `#958ea0` | hover borders, dividers that must be seen |

### Text

| Token | Hex | Contrast on `#181f31` | Used for |
|---|---|---|---|
| `on-surface` | `#dce2fa` | 13.4 : 1 | everything you read |
| `on-surface-variant` | `#cbc3d7` | 10.6 : 1 | labels, captions, second lines |
| — | `#9aa3bd` | 6.4 : 1 | the quietest text permitted |

Nothing lighter than `#9aa3bd` on a dark surface. A 40%-opacity white label is not a colour,
it is a bug.

### Accent — one, and it is not decoration

`primary` `#d0bcff` on `on-primary` `#3c0091`.

It appears in exactly three roles:

1. the **primary action** on a screen — one per screen, top right;
2. the **current selection** — the active nav item, the chosen filter, a selected row;
3. a **state indicator** that means "this is where you are".

It never tints a card, never fills an icon chip, never sits behind a heading. A screen with
five accents has none.

### State — fixed meanings, never reused for mood

| Meaning | Text | Fill | Border |
|---|---|---|---|
| Settled, confirmed, healthy | `#6ee7b7` | `rgba(52,211,153,0.13)` | `#1f6b52` |
| Waiting on someone, due soon | `#fcd34d` | `rgba(251,191,36,0.13)` | `#7a5d12` |
| Overdue, refused, destructive | `#fda4af` | `rgba(244,63,94,0.13)` | `#7f3146` |
| Neutral, draft, not started | `#cbd5e1` | `rgba(154,163,189,0.13)` | `#4a5270` |

Amber and rose differ in **lightness** as well as hue, so the distinction survives colour
blindness and a bad monitor in a bright office.

---

## Typography

**Inter, one family, everything.** No display face. Product UI does not need a pairing, and a
display face in a table header is a costume.

Fixed rem scale — not fluid. Officers work at a consistent DPI and a heading that shrinks
inside a panel looks broken, not responsive.

| Step | Size / line-height | Weight | Used for |
|---|---|---|---|
| Page title | 28 / 32 | 800, −0.02em | the one `h1` |
| Section | 15 / 20 | 700 | card headings |
| Body | 13 / 18 | 400–500 | rows, fields, prose |
| Secondary | 12 / 16 | 400 | captions, helper text |
| Label | 11 / 14 | 700, +0.08em, uppercase | column heads and *only* column heads |

Ratio ≈ 1.2. Five steps is the whole scale.

**Numbers are `tabular-nums`, never monospace.** Monospace in this product means one thing: a
machine-generated reference you might read aloud or copy — an invoice number, a payment
reference, a ticket number. Nowhere else.

**No eyebrow labels.** A tracked-out capitalised word above a heading is banned outright; the
heading carries itself. The 11px uppercase label survives in exactly one place, a table column
head, where it is doing structural work.

---

## Space and density

8px grid. The whole spacing vocabulary:

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 48`

| Thing | Value |
|---|---|
| Table row | 36px (compact) / 44px (comfortable, the default) |
| Any control you tap | 44px minimum, every breakpoint |
| Card padding | 16px phone / 20px desktop |
| Between sections | 20px |
| Page gutter | 16px phone / 32px desktop |
| Content maximum | 1240px |

More space above a heading than below it: the heading belongs to what follows.

---

## Components

### Shape

One radius family: `8px` controls · `12px` cards · `16px` panels · `999px` pills.
A radius is a hierarchy signal. Everything at the same radius is everything at the same rank.

### Buttons

| | |
|---|---|
| **Primary** | `#d0bcff` on `#3c0091`, 700, radius 12, height 44. One per screen. |
| **Secondary** | `#232a3c`, 1px `#343b50`, text `#dce2fa`, 600. |
| **Quiet** | transparent, text `#9aa3bd`. For Cancel and nothing else. |
| **Destructive** | text `#fb7185`, no fill. Lives last, in a menu, never beside Save. |

Every button names its action — *Issue to resident*, *Withdraw and send again*. Never *Submit*,
never *OK*. The name survives the whole flow: a button that says *Publish* produces *Published*.

### Rows in a list

A row carries **one** named action — the thing you are most likely to do to this record in its
current state — plus a menu for the rest. Four unlabelled icons is the thing this redesign
exists to delete.

### Stat tiles

A number is a **link to the list it counts**, always. A tile that cannot be clicked is a
decoration of a fact.

> **Correcting the incumbent:** today's `StatCard` marks an exception with a 2px coloured rule
> down its left edge. A bar down one side of a rounded box is a tell, not a system. Tone now
> shows in the **full border** and the **value's colour** — two places, both legible, neither
> borrowed.

### Dialogs

- Header **outside** the scroll area, opaque, `shrink-0`. Never sticky inside it.
- One column of fields, even on a wide screen.
- Errors sit **at the field**, not only in a strip at the top.
- Destructive confirmations name the thing and the consequence, and the confirm button says the
  verb: *Delete unit A-12-11*, not *OK*.
- A dialog needs interruption or protected focus to deserve existing. Assigning a ticket owner
  does not.

### The six states, every component

`default · hover · focus · active · disabled · loading` — and for anything that fetches:
`loading (skeleton, not a spinner) · empty (teaches the screen) · error (names the problem
and the recovery)`.

---

## Motion

150–250 ms. Users are mid-task; nobody wants choreography between them and the invoice.

Motion reports a **state change** and nothing else: something opened, something saved,
something was refused, something is loading. No page-load sequence. No entrance animation on
each section. No hover lift on every card.

The one authored moment in the product is the booking clash — red, struck through, one shake,
then still (`animate-shake`, DEV-251). It earns it because it is a refusal the user must not
miss. A second such moment would spend the first.

Everything respects `prefers-reduced-motion`.

---

## Browser surfaces

The parts nobody draws still belong to the design: text selection, the caret, scrollbars, the
focus ring, the underline offset, and tabular numerals. Shipping them as browser defaults is
the cheapest tell that a page was assembled.

```css
::selection        { background: #d0bcff33; color: #ffffff; }
:focus-visible     { outline: 2px solid #d0bcff; outline-offset: 2px; }
::-webkit-scrollbar      { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb{ background: #343b50; border-radius: 999px; }
caret-color        : #d0bcff;
```

---

## Copy

Plain English, sentence case, active voice, the end user's words.

| Not this | This |
|---|---|
| Pending Parts | Waiting for parts |
| KIV | On hold |
| Unauthorized | You need an active lease to book a facility |
| Submit | Issue to resident |
| Failed to book facility | Someone booked 18:00–19:00 just before you |
| No data | No units yet — add your first unit |

An error names what happened and what to do next. An empty screen is an invitation, not a
report. Nothing apologises.

---

## What this system refuses

- A second accent colour.
- A fifth surface grey.
- A card inside a card.
- An icon-only button with no `aria-label`.
- A tracked-out eyebrow label above a heading.
- Monospace used to mean "technical".
- An emoji standing in for an icon.
- A tile, chart or sparkline that is not a link to the thing it summarises.
- A modal for a one-field change.
- A number rendered without `tabular-nums`.
