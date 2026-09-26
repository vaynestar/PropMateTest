/**
 * One money format for the resident portal.
 *
 * Four pages each declared their own `rm()` helper, and the review found
 * amounts printed to whole ringgit in some places and to sen in others (R17).
 * Sen always, one helper, so a figure reads the same wherever it appears.
 *
 * The admin portal uses `Money` in components/admin/ui.tsx, and the invoice
 * document has its own `docMoney` because the PDF takes the currency from
 * Settings.
 */
export function rm(value: number, currency = "RM"): string {
  return `${currency} ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
