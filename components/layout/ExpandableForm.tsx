"use client";

import { useState, ReactNode } from "react";

type ExpandableFormProps = {
  title: string;
  buttonLabel: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export default function ExpandableForm({
  title,
  buttonLabel,
  children,
  defaultOpen = false,
}: ExpandableFormProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-stack-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 self-start transition-all"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          {open ? "remove" : "add"}
        </span>
        {buttonLabel}
      </button>

      {open && (
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-title-lg text-title-lg text-on-surface mb-4">
            {title}
          </h2>
          {children}
        </div>
      )}
    </div>
  );
}
