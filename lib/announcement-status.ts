/**
 * Announcement state — single source of truth.
 *
 * Three states are stored in `Announcement.status`, and three more are read off
 * the dates. Keeping them apart is the point: whether a notice has been written
 * yet is a decision someone made, whereas whether it is on the board today is
 * just the calendar, and storing the second would let the two disagree.
 *
 *   stored      Published · Draft · Archived
 *   derived     Scheduled  (publish_date in the future)
 *               Live       (published, within its dates)
 *               Expired    (expiry_date has passed)
 *
 * `publish_date` was decorative before this. `getResidentAnnouncements()`
 * filtered on `expiry_date` alone, so a notice dated to go up in two weeks was
 * on the resident board the moment it was saved — verified by creating one and
 * watching the resident query return it. Scheduling ahead is the ordinary way
 * to write a notice before you need it, and it silently did the opposite.
 *
 * `updateAnnouncementStatus` also validated nothing and wrote whatever string
 * it was handed, exactly as the visitor and ticket actions used to.
 */

export type AnnouncementStatusKey = "Published" | "Draft" | "Archived";

/** What the reader sees, once the dates are taken into account. */
export type AnnouncementState = "Draft" | "Scheduled" | "Live" | "Expired" | "Archived";

export type AnnouncementStateMeta = {
  value: AnnouncementState;
  label: string;
  icon: string;
  chip: string;
  /** True when residents can currently see it. */
  visibleToResidents: boolean;
};

export const ANNOUNCEMENT_STATES: Record<AnnouncementState, AnnouncementStateMeta> = {
  Draft: {
    value: "Draft",
    label: "Draft",
    icon: "edit_note",
    chip: "bg-surface-container-highest text-on-surface-variant border-outline-variant/60",
    visibleToResidents: false,
  },
  Scheduled: {
    value: "Scheduled",
    label: "Scheduled",
    icon: "schedule",
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/40",
    visibleToResidents: false,
  },
  Live: {
    value: "Live",
    label: "Live",
    icon: "campaign",
    chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    visibleToResidents: true,
  },
  Expired: {
    value: "Expired",
    label: "Expired",
    icon: "history",
    chip: "bg-surface-container-highest text-on-surface-variant border-outline-variant/60",
    visibleToResidents: false,
  },
  Archived: {
    value: "Archived",
    label: "Archived",
    icon: "archive",
    chip: "bg-surface-container-highest text-on-surface-variant border-outline-variant/60",
    visibleToResidents: false,
  },
};

export const ANNOUNCEMENT_STATUS_ORDER: AnnouncementStatusKey[] = [
  "Published",
  "Draft",
  "Archived",
];

const ALIASES: Record<string, AnnouncementStatusKey> = {
  published: "Published",
  active: "Published",
  live: "Published",
  draft: "Draft",
  archived: "Archived",
  archive: "Archived",
};

export function normaliseAnnouncementStatus(
  value: string | null | undefined
): AnnouncementStatusKey | null {
  if (!value) return null;
  if (value === "Published" || value === "Draft" || value === "Archived") return value;
  return ALIASES[value.trim().toLowerCase()] ?? null;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Where a notice actually stands, combining its status with its dates. */
export function announcementState(a: {
  status?: string | null;
  publish_date?: Date | string | null;
  expiry_date?: Date | string | null;
}): AnnouncementStateMeta {
  const status = normaliseAnnouncementStatus(a.status) ?? "Published";
  if (status === "Draft") return ANNOUNCEMENT_STATES.Draft;
  if (status === "Archived") return ANNOUNCEMENT_STATES.Archived;

  const today = startOfToday();
  const publish = a.publish_date ? new Date(a.publish_date) : null;
  const expiry = a.expiry_date ? new Date(a.expiry_date) : null;

  if (expiry && !isNaN(expiry.getTime()) && expiry < today) {
    return ANNOUNCEMENT_STATES.Expired;
  }
  if (publish && !isNaN(publish.getTime()) && publish > today) {
    return ANNOUNCEMENT_STATES.Scheduled;
  }
  return ANNOUNCEMENT_STATES.Live;
}

/** Days until a live notice drops off the board, or null if it is not live. */
export function daysUntilExpiry(a: {
  status?: string | null;
  publish_date?: Date | string | null;
  expiry_date?: Date | string | null;
}): number | null {
  if (announcementState(a).value !== "Live" || !a.expiry_date) return null;
  const expiry = new Date(a.expiry_date);
  if (isNaN(expiry.getTime())) return null;
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - startOfToday().getTime()) / 86_400_000);
}
