"use client";

import { useState } from "react";
import Modal from "@/components/admin/Modal";
import AdminFacilityBooking from "@/app/admin/bookings/AdminFacilityBooking";
import { BTN } from "@/components/admin/ui";

/**
 * "New booking" in the page header (DEV-201). The form used to unfold inline
 * above the list, pushing today's bookings off the screen just as the person
 * on the phone asks what is free.
 */
export default function BookForResidentButton(props: React.ComponentProps<typeof AdminFacilityBooking>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={BTN.primary}>
        <span className="material-symbols-outlined text-[18px]">event_available</span>
        New booking
      </button>

      {open && (
        <Modal
          title="Book on a resident's behalf"
          subtitle="For calls and walk-ins at the office."
          icon="event_available"
          size="xl"
          onClose={() => setOpen(false)}
        >
          <AdminFacilityBooking {...props} />
        </Modal>
      )}
    </>
  );
}
