"use client";

import { useState, useTransition } from "react";
import {
  addCategoryAction,
  toggleCategoryAction,
  deleteCategoryAction,
} from "@/app/admin/maintenance/actions";

type CategoryItem = {
  category_id: string;
  category_name: string;
  description?: string | null;
  is_active: boolean;
  created_at: Date;
};

export default function CategoryMasterManager({
  categories,
}: {
  categories: CategoryItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const formEl = e.currentTarget;

    startTransition(async () => {
      const res = await addCategoryAction(formData);
      if (res?.error) {
        showToast(res.error, "error");
      } else if (res?.success) {
        showToast(res.message, "success");
        formEl.reset();
      }
    });
  };

  const handleToggle = (categoryId: string, currentActive: boolean) => {
    startTransition(async () => {
      const res = await toggleCategoryAction(categoryId, !currentActive);
      if (res?.error) {
        showToast(res.error, "error");
      } else if (res?.success) {
        showToast(res.message, "success");
      }
    });
  };

  const handleDelete = (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete category "${categoryName}"?`)) return;

    startTransition(async () => {
      const res = await deleteCategoryAction(categoryId);
      if (res?.error) {
        showToast(res.error, "error");
      } else if (res?.success) {
        showToast(res.message, "success");
      }
    });
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden border border-outline-variant/30 transition-all">
      <div className="p-4 bg-surface-container-low flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">settings_suggest</span>
          <div>
            <h3 className="font-title-md text-title-md text-on-surface font-bold">
              Category Masterfile Settings
            </h3>
            <p className="text-xs text-on-surface-variant">
              Manage ticket categories used across resident & admin helpdesk forms ({categories.length} categories)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant text-xs font-semibold text-on-surface hover:bg-surface-variant transition-colors flex items-center gap-1 pressable"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isOpen ? "expand_less" : "tune"}
          </span>
          <span>{isOpen ? "Hide Settings" : "Manage Categories"}</span>
        </button>
      </div>

      {isOpen && (
        <div className="p-4 border-t border-outline-variant/30 space-y-6">
          {toast && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
                toast.type === "success"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/40"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {toast.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{toast.message}</span>
            </div>
          )}

          {/* Add New Category Form */}
          <form onSubmit={handleAddSubmit} className="grid gap-3 md:grid-cols-3 bg-surface-container/40 p-3 rounded-xl border border-outline-variant/20">
            <div className="md:col-span-1 space-y-1">
              <span className="text-xs font-medium text-on-surface-variant">Category Name *</span>
              <input
                type="text"
                name="category_name"
                placeholder="e.g. Elevator / Lift Maintenance"
                required
                className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-3 py-1.5 text-on-surface outline-none focus:border-primary text-xs"
              />
            </div>
            <div className="md:col-span-1 space-y-1">
              <span className="text-xs font-medium text-on-surface-variant">Description (Optional)</span>
              <input
                type="text"
                name="description"
                placeholder="Brief description of issues under category"
                className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-3 py-1.5 text-on-surface outline-none focus:border-primary text-xs"
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary w-full py-1.5 rounded-lg text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5 transition-all pressable disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>{isPending ? "Adding..." : "Add Master Category"}</span>
              </button>
            </div>
          </form>

          {/* Category List */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <div
                key={c.category_id}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  c.is_active
                    ? "bg-surface-container-high/60 border-outline-variant/40"
                    : "bg-surface-container/20 border-outline-variant/20 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-xs text-on-surface truncate">
                      {c.category_name}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        c.is_active
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-surface-variant text-on-surface-variant border border-outline-variant"
                      }`}
                    >
                      {c.is_active ? "Active" : "Disabled"}
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-[11px] text-on-surface-variant line-clamp-2 mb-2">
                      {c.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggle(c.category_id, c.is_active)}
                    disabled={isPending}
                    className={`text-[11px] font-medium transition-colors ${
                      c.is_active
                        ? "text-amber-400 hover:text-amber-300"
                        : "text-emerald-400 hover:text-emerald-300"
                    }`}
                  >
                    {c.is_active ? "Disable" : "Enable"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(c.category_id, c.category_name)}
                    disabled={isPending}
                    className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
