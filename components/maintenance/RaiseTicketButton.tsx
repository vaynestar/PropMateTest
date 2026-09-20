"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/admin/Modal";
import AdminRaiseTicketForm from "./AdminRaiseTicketForm";
import { BTN } from "@/components/admin/ui";

/**
 * "New ticket" in the page header, opening the form in a dialog (DEV-195).
 * It used to be a lone purple button halfway down the page that unfolded an
 * inline panel and pushed the ticket table out of view.
 */
export default function RaiseTicketButton(props: React.ComponentProps<typeof AdminRaiseTicketForm>) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={BTN.primary}>
        <span className="material-symbols-outlined text-[18px]">add</span>
        New ticket
      </button>

      {open && (
        <Modal
          title="Raise a ticket"
          subtitle="For a unit or a common area in this property."
          icon="add_task"
          size="lg"
          onClose={() => setOpen(false)}
        >
          <AdminRaiseTicketForm
            {...props}
            onSuccess={() => {
              router.refresh();
              setTimeout(() => setOpen(false), 900);
            }}
          />
        </Modal>
      )}
    </>
  );
}
