import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { docMoney, type InvoiceDoc } from "@/lib/invoice-document";

/**
 * A real A4 PDF of an invoice (DEV-191; user: "the preview pdf can have
 * separate option, 1 preview, 1 download"). Drawn with pdf-lib - pure JS,
 * nothing to install on Vercel. Same data as the on-screen preview
 * (lib/invoice-document.ts).
 *
 * The built-in Helvetica only knows Western European characters (WinAnsi);
 * anything else (e.g. a Chinese name) is printed as "?" instead of failing.
 */

const A4 = { w: 595.28, h: 841.89 };
const M = 48; // page margin
const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.4, 0.43, 0.48);
const LINE = rgb(0.85, 0.87, 0.9);
const SHADE = rgb(0.95, 0.96, 0.97);
const ACCENT = rgb(0.26, 0.22, 0.79);

const STATUS_COLOUR: Record<string, ReturnType<typeof rgb>> = {
  PAID: rgb(0.02, 0.5, 0.3),
  OVERDUE: rgb(0.78, 0.1, 0.18),
  UNPAID: rgb(0.7, 0.35, 0.02),
  DRAFT: MUTED,
  VOIDED: MUTED,
};

// WinAnsi = Latin-1 plus these extras.
const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const safe = (s: string) =>
  Array.from(s.replace(/\t/g, " "))
    .map((c) => {
      const code = c.codePointAt(0)!;
      return (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.has(c) ? c : "?";
    })
    .join("");

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of safe(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next;
        continue;
      }
      if (line) out.push(line);
      // A single word wider than the column: cut it.
      let w = word;
      while (font.widthOfTextAtSize(w, size) > width) {
        let n = w.length - 1;
        while (n > 1 && font.widthOfTextAtSize(w.slice(0, n), size) > width) n--;
        out.push(w.slice(0, n));
        w = w.slice(n);
      }
      line = w;
    }
    out.push(line);
  }
  return out;
}

export async function renderInvoicePdf(doc: InvoiceDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${doc.invoiceNo}`);
  pdf.setAuthor(safe(doc.issuer));
  pdf.setCreator("PropMate");
  pdf.setProducer("PropMate");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - M;
  const right = A4.w - M;
  const width = right - M;

  const text = (s: string, x: number, yy: number, size: number, font = regular, color = INK) =>
    page.drawText(safe(s), { x, y: yy, size, font, color });
  const textRight = (s: string, xr: number, yy: number, size: number, font = regular, color = INK) =>
    text(s, xr - font.widthOfTextAtSize(safe(s), size), yy, size, font, color);
  const rule = (yy: number, color = LINE, thickness = 0.8) =>
    page.drawLine({ start: { x: M, y: yy }, end: { x: right, y: yy }, thickness, color });

  const FOOTER_SPACE = 40;
  /** Start a new page if `need` points won't fit above the footer. */
  const room = (need: number, onNewPage?: () => void) => {
    if (y - need >= M + FOOTER_SPACE) return;
    page = pdf.addPage([A4.w, A4.h]);
    y = A4.h - M;
    text(`Invoice ${doc.invoiceNo} (continued)`, M, y - 10, 9, regular, MUTED);
    y -= 28;
    onNewPage?.();
  };

  // --- Header -------------------------------------------------------------
  text("INVOICE", M, y - 22, 26, bold);
  text(doc.invoiceNo, M, y - 40, 11, bold, ACCENT);
  const statusColour = STATUS_COLOUR[doc.status] ?? MUTED;
  const badgeW = bold.widthOfTextAtSize(doc.status, 9) + 14;
  page.drawRectangle({ x: M, y: y - 62, width: badgeW, height: 15, color: statusColour, opacity: 0.12 });
  text(doc.status, M + 7, y - 58, 9, bold, statusColour);

  let ry = y - 12;
  for (const l of wrap(doc.issuer, bold, 12, 240)) {
    textRight(l, right, ry, 12, bold);
    ry -= 15;
  }
  for (const a of doc.addressLines) {
    for (const l of wrap(a, regular, 9, 240)) {
      textRight(l, right, ry, 9, regular, MUTED);
      ry -= 12;
    }
  }
  if (doc.settings.taxNo) {
    textRight(`SST / Tax Reg. No: ${doc.settings.taxNo}`, right, ry, 9, regular, MUTED);
    ry -= 12;
  }
  y = Math.min(y - 72, ry) - 10;
  rule(y, INK, 1.2);
  y -= 22;

  // --- Bill to / dates ----------------------------------------------------
  const label = (s: string, x: number, yy: number) => text(s.toUpperCase(), x, yy, 8, bold, MUTED);
  label("Bill to", M, y);
  let ly = y - 16;
  for (const l of wrap(doc.billTo.name, bold, 12, 250)) {
    text(l, M, ly, 12, bold);
    ly -= 15;
  }
  for (const l of [`Unit ${doc.billTo.unit}`, doc.billTo.phone, doc.billTo.email].filter(Boolean)) {
    text(l, M, ly, 10, regular, MUTED);
    ly -= 13;
  }

  const colX = M + width * 0.58;
  const facts: [string, string][] = [
    ["Date issued", doc.issuedOn],
    ["Due date", doc.dueOn],
  ];
  let fy = y;
  for (const [k, v] of facts) {
    label(k, colX, fy);
    text(v, colX, fy - 15, 11, bold);
    fy -= 36;
  }
  y = Math.min(ly, fy) - 14;

  // --- Line items ---------------------------------------------------------
  const cQty = M + width * 0.6;
  const cPrice = M + width * 0.8;
  const descW = width * 0.55 - 10;
  const header = () => {
    page.drawRectangle({ x: M, y: y - 8, width, height: 24, color: SHADE });
    text("DESCRIPTION", M + 8, y, 8, bold, MUTED);
    textRight("QTY", cQty, y, 8, bold, MUTED);
    textRight("UNIT PRICE", cPrice, y, 8, bold, MUTED);
    textRight("AMOUNT", right - 8, y, 8, bold, MUTED);
    y -= 26;
  };
  room(60);
  header();
  if (!doc.lines.length) {
    text("No items on this invoice.", M + 8, y, 10, regular, MUTED);
    y -= 22;
  }
  for (const line of doc.lines) {
    const desc = wrap(line.description, regular, 10.5, descW);
    const h = desc.length * 14 + 12;
    room(h, header);
    desc.forEach((l, i) => text(l, M + 8, y - i * 14, 10.5));
    textRight(String(line.qty), cQty, y, 10.5);
    textRight(docMoney(line.unitPrice), cPrice, y, 10.5, regular, MUTED);
    textRight(docMoney(line.total), right - 8, y, 11, bold);
    y -= h;
    rule(y + 8);
  }

  // --- Total --------------------------------------------------------------
  room(70);
  y -= 8;
  const boxW = width * 0.48;
  const boxX = right - boxW;
  page.drawRectangle({ x: boxX, y: y - 44, width: boxW, height: 52, color: SHADE, borderColor: LINE, borderWidth: 0.8 });
  const totalLabel = doc.status === "PAID" ? "Total paid" : doc.status === "VOIDED" ? "Total (voided)" : "Amount due";
  text(totalLabel.toUpperCase(), boxX + 12, y - 10, 8, bold, MUTED);
  textRight(docMoney(doc.total), right - 12, y - 32, 18, bold, doc.status === "PAID" ? INK : ACCENT);
  if (doc.status !== "PAID" && doc.status !== "VOIDED") text(`by ${doc.dueOn}`, boxX + 12, y - 30, 9, regular, MUTED);
  y -= 70;

  // --- How to pay ---------------------------------------------------------
  const section = (title: string) => {
    room(40);
    text(title, M, y, 11, bold);
    y -= 16;
  };
  if (doc.status !== "PAID" && doc.status !== "VOIDED") {
    section("How to pay");
    const payLines = doc.settings.bank
      ? [
          `Bank: ${doc.settings.bank.bankName}`,
          `Account name: ${doc.settings.bank.accountName}`,
          `Account no: ${doc.settings.bank.accountNo}`,
          `Reference: ${doc.invoiceNo}`,
        ]
      : [`Pay through the PropMate resident app, quoting ${doc.invoiceNo} as the reference.`];
    for (const p of payLines) {
      for (const l of wrap(p, regular, 10, width)) {
        room(14);
        text(l, M, y, 10);
        y -= 14;
      }
    }
    y -= 12;
  }

  // --- Terms --------------------------------------------------------------
  if (doc.settings.terms.length) {
    section("Terms & conditions");
    doc.settings.terms.forEach((t, i) => {
      const num = `${i + 1}.`;
      const ls = wrap(t, regular, 9, width - 16);
      ls.forEach((l, j) => {
        room(12);
        if (j === 0) text(num, M, y, 9, regular, MUTED);
        text(l, M + 16, y, 9, regular, MUTED);
        y -= 12;
      });
      y -= 3;
    });
  }

  // --- Closing note -----------------------------------------------------
  if (doc.settings.footer) {
    y -= 6;
    for (const l of wrap(doc.settings.footer, bold, 10, width)) {
      room(14);
      text(l, M, y, 10, bold);
      y -= 14;
    }
  }

  // --- Footer on every page: office contact + page number ----------------
  const pages = pdf.getPages();
  const contact = doc.settings.contact ? wrap(doc.settings.contact, regular, 8.5, width - 70).slice(0, 2) : [];
  pages.forEach((p, i) => {
    page = p;
    rule(M + 26);
    contact.forEach((l, j) => text(l, M, M + 14 - j * 11, 8.5, regular, MUTED));
    textRight(`Page ${i + 1} of ${pages.length}`, right, M + 14, 8.5, regular, MUTED);
  });

  return pdf.save();
}
