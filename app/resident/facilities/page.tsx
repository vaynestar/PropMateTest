import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { listFacilities } from "@/lib/facility-management";
import {
  cancelBooking,
  createBooking,
  listUserBookings,
} from "@/lib/booking-management";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
}

const STATUS_STYLES: Record<string, string> = {
  Reserved: "bg-indigo-500/15 text-indigo-300",
  Confirmed: "bg-emerald-500/15 text-emerald-300",
  Cancelled: "bg-surface-container-highest text-on-surface-variant",
  Completed: "bg-surface-container-highest text-on-surface-variant",
};

async function bookFacility(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  const result = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/bookings`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facility_id: String(formData.get("facility_id")),
        booking_date: String(formData.get("booking_date")),
        start_time: String(formData.get("start_time")),
        end_time: String(formData.get("end_time")),
        purpose: String(formData.get("purpose") ?? ""),
      }),
    }
  );
  if (!result.ok) {
    const data = await result.json().catch(() => ({}));
    throw new Error(data.error ?? "Booking failed");
  }
  revalidatePath("/resident/facilities");
}

async function cancelBookingAction(formData: FormData) {
  "use server";
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/bookings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ booking_id: String(formData.get("booking_id")) }),
  });
  revalidatePath("/resident/facilities");
}

export default async function ResidentFacilitiesPage() {
  const user = await getSessionUser();
  const [facilities, myBookings] = await Promise.all([
    listFacilities(),
    listUserBookings(user!.userId),
  ]);

  const bookable = facilities.filter((f) => f.is_bookable);

  return (
    <div className="flex flex-col gap-stack-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          Facilities Booking
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Book shared facilities. Overlapping slots are prevented automatically.
        </p>
      </div>

      {bookable.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="font-body-md text-body-md text-on-surface-variant">
            No bookable facilities are available yet. Check back later.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-lg">
        {bookable.map((f) => (
          <div key={f.facility_id} className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">
                meeting_room
              </span>
              <div>
                <p className="font-title-md text-title-md text-on-surface">
                  {f.facility_name}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {f.facility_type} · {f.property.property_name} · Capacity{" "}
                  {f.max_capacity}
                </p>
              </div>
            </div>

            <form action={bookFacility} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="facility_id" value={f.facility_id} />
              <input
                type="date"
                name="booking_date"
                required
                className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <input
                  type="time"
                  name="start_time"
                  required
                  aria-label="Start time"
                  className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary w-full"
                />
                <input
                  type="time"
                  name="end_time"
                  required
                  aria-label="End time"
                  className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary w-full"
                />
              </div>
              <input
                type="text"
                name="purpose"
                placeholder="Purpose (optional)"
                className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary sm:col-span-2"
              />
              <button
                type="submit"
                className="btn-primary px-4 py-2 font-label-md text-label-md transition-all sm:col-span-2"
              >
                Book This Slot
              </button>
            </form>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-xl p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-title-lg text-title-lg text-on-surface">
            My Bookings
          </h2>
        </div>
        <div className="divide-y divide-outline-variant/30">
          {myBookings.length === 0 && (
            <p className="font-body-md text-body-md text-on-surface-variant px-6 py-8">
              You have no bookings yet.
            </p>
          )}
          {myBookings.map((b) => (
            <div
              key={b.booking_id}
              className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between px-6 py-4"
            >
              <div>
                <p className="font-title-md text-title-md text-on-surface">
                  {b.facility.facility_name}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                  {formatDate(b.booking_date)} · {formatTime(b.start_time)}–
                  {formatTime(b.end_time)}
                  {b.purpose ? ` · ${b.purpose}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`font-label-sm text-label-sm px-2 py-0.5 rounded-full ${
                    STATUS_STYLES[b.booking_status] ??
                    "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {b.booking_status}
                </span>
                {b.booking_status !== "Cancelled" && (
                  <form action={cancelBookingAction}>
                    <input
                      type="hidden"
                      name="booking_id"
                      value={b.booking_id}
                    />
                    <button
                      type="submit"
                      className="font-label-sm text-label-sm text-error-container hover:underline"
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
