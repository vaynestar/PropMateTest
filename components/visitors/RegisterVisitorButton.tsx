"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/admin/Modal";
import AdminVisitorForm from "@/app/admin/visitors/AdminVisitorForm";
import { BTN } from "@/components/admin/ui";

/**
 * "New visitor" in the page header, opening the registration form in a dialog
 * (DEV-195) - it used to unfold inline and push the whole directory down.
 */
export default function RegisterVisitorButton(props: React.ComponentProps<typeof AdminVisitorForm>) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={BTN.primary}>
        <span className="material-symbols-outlined text-[18px]">person_add</span>
        New visitor
      </button>

      {open && (
        <Modal
          title="Register a visitor"
          subtitle="The pass is issued as soon as this is saved."
          icon="badge"
          size="lg"
          onClose={() => setOpen(false)}
        >
          <AdminVisitorForm
            {...props}
            bare
            onSuccess={() => {
              router.refresh();
              setTimeout(() => setOpen(false), 1200);
            }}
          />
        </Modal>
      )}
    </>
  );
}
