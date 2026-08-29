"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import AdminAnnouncementForm from "./AdminAnnouncementForm";
import {
  deleteAnnouncement,
  togglePinAnnouncement,
  updateAnnouncementStatus,
} from "./actions";

interface PropertyOption {
  property_id: string;
  property_name: string;
}

export interface AnnouncementRecord {
  announcement_id: string;
  property_id?: string | null;
  title: string;
  content: string;
  category: string;
  priority: string;
  status: string;
  is_pinned: boolean;
  target_audience: string;
  image_url?: string | null;
  attachment_url?: string | null;
  publish_date: Date | string;
  expiry_date: Date | string;
  created_at: Date | string;
  property?: {
    property_id: string;
    property_name: string;
    city?: string | null;
  } | null;
  author?: {
    user_id: string;
    user_name: string;
    user_email: string;
    role: string;
  } | null;
}

interface AdminAnnouncementListProps {
  announcements: AnnouncementRecord[];
  properties: PropertyOption[];
  defaultPropertyId?: string;
}

const CATEGORY_MAP: Record<string, { label: string; icon: string; style: string }> = {
  Notice: { label: "General Notice", icon: "campaign", style: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
  Maintenance: { label: "Maintenance", icon: "build", style: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  Emergency: { label: "Emergency Alert", icon: "warning", style: "bg-rose-500/15 text-rose-300 border-rose-500/40" },
  Security: { label: "Security", icon: "shield", style: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  Event: { label: "Community Event", icon: "celebration", style: "bg-purple-500/10 text-purple-300 border-purple-500/30" },
  Billing: { label: "Billing / Admin", icon: "payments", style: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" },
};

export default function AdminAnnouncementList({
  announcements,
  properties,
  defaultPropertyId,
}: AdminAnnouncementListProps) {
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modals & Form State
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementRecord | null>(null);
  const [previewItem, setPreviewItem] = useState<AnnouncementRecord | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [propertyFilter, setPropertyFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // KPI Calculations
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const total = announcements.length;
    const active = announcements.filter(
      (a) => a.status === "Published" && new Date(a.expiry_date) >= today
    ).length;
    const urgent = announcements.filter((a) => a.priority === "Urgent" && a.status === "Published").length;
    const pinned = announcements.filter((a) => a.is_pinned).length;

    return { total, active, urgent, pinned };
  }, [announcements]);

  // Filtered Announcements
  const filteredAnnouncements = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return announcements.filter((a) => {
      // Property Filter
      if (propertyFilter !== "ALL") {
        if (a.property_id && a.property_id !== propertyFilter) return false;
      }

      // Category Filter
      if (categoryFilter !== "ALL" && a.category !== categoryFilter) {
        return false;
      }

      // Priority Filter
      if (priorityFilter !== "ALL" && a.priority !== priorityFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== "ALL") {
        const isExpired = new Date(a.expiry_date) < today;
        if (statusFilter === "Active" && (a.status !== "Published" || isExpired)) return false;
        if (statusFilter === "Expired" && (a.status !== "Published" || !isExpired)) return false;
        if (statusFilter === "Draft" && a.status !== "Draft") return false;
        if (statusFilter === "Archived" && a.status !== "Archived") return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = a.title?.toLowerCase().includes(q);
        const matchesContent = a.content?.toLowerCase().includes(q);
        const matchesCategory = a.category?.toLowerCase().includes(q);
        const matchesAuthor = a.author?.user_name?.toLowerCase().includes(q);
        const matchesProperty = a.property?.property_name?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesContent && !matchesCategory && !matchesAuthor && !matchesProperty) {
          return false;
        }
      }

      return true;
    });
  }, [announcements, propertyFilter, categoryFilter, priorityFilter, statusFilter, searchQuery]);

  // Actions
  const handleTogglePin = (item: AnnouncementRecord) => {
    setUpdatingId(item.announcement_id);
    startTransition(async () => {
      await togglePinAnnouncement(item.announcement_id, item.is_pinned);
      setUpdatingId(null);
    });
  };

  const handleUpdateStatus = (announcementId: string, newStatus: string) => {
    setUpdatingId(announcementId);
    startTransition(async () => {
      await updateAnnouncementStatus(announcementId, newStatus);
      setUpdatingId(null);
    });
  };

  const handleDelete = (announcementId: string) => {
    if (!confirm("Are you sure you want to delete this announcement? This action cannot be undone.")) {
      return;
    }
    setUpdatingId(announcementId);
    startTransition(async () => {
      await deleteAnnouncement(announcementId);
      setUpdatingId(null);
    });
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === "Urgent") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
          Urgent Alert
        </span>
      );
    }
    if (priority === "High") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
          High Priority
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/50 text-[10px] font-medium">
        Normal
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 4 KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Announcements */}
        <div className="bg-surface-container border border-outline-variant/60 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Total Notices
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {stats.total}
            </span>
            <span className="text-[11px] text-on-surface-variant mt-0.5">All broadcasts logged</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">campaign</span>
          </div>
        </div>

        {/* Live Active */}
        <div className="bg-surface-container border border-outline-variant/60 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Live & Active
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1">
              {stats.active}
            </span>
            <span className="text-[11px] text-on-surface-variant mt-0.5">Visible to residents</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">check_circle</span>
          </div>
        </div>

        {/* Urgent Alerts */}
        <div className="bg-surface-container border border-outline-variant/60 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Urgent Alerts
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-400 mt-1">
              {stats.urgent}
            </span>
            <span className="text-[11px] text-on-surface-variant mt-0.5">Disruptions & critical</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">warning</span>
          </div>
        </div>

        {/* Pinned Notices */}
        <div className="bg-surface-container border border-outline-variant/60 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Pinned Top
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-300 mt-1">
              {stats.pinned}
            </span>
            <span className="text-[11px] text-on-surface-variant mt-0.5">Top-priority feed</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">push_pin</span>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT FORM POPUP MODAL */}
      {(isCreating || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl animate-in zoom-in-95 duration-200 shadow-2xl">
            <AdminAnnouncementForm
              properties={properties}
              defaultPropertyId={defaultPropertyId}
              initialData={editingItem}
              onSuccess={() => {
                setIsCreating(false);
                setEditingItem(null);
              }}
              onCancel={() => {
                setIsCreating(false);
                setEditingItem(null);
              }}
            />
          </div>
        </div>
      )}

      {/* CONTROLS & MULTI-FILTER BAR */}
      <div className="bg-surface-container border border-outline-variant/60 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements by title, content, or author..."
              className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
              </button>
            )}
          </div>

          {/* New Announcement Action */}
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsCreating(true);
            }}
            className="btn-primary px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shrink-0 pressable"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>New Announcement</span>
          </button>
        </div>

        {/* Filter Pills Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/30 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="ALL">📁 All Categories</option>
              <option value="Notice">📢 General Notice</option>
              <option value="Maintenance">🔧 Maintenance</option>
              <option value="Emergency">🚨 Emergency Alert</option>
              <option value="Security">🛡️ Security Advisory</option>
              <option value="Event">🎉 Community Event</option>
              <option value="Billing">💳 Billing & Admin</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="ALL">⚡ All Priorities</option>
              <option value="Urgent">🚨 Urgent</option>
              <option value="High">⚠️ High Priority</option>
              <option value="Normal">Normal</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="ALL">Status: All</option>
              <option value="Active">🟢 Live / Active</option>
              <option value="Draft">📝 Drafts</option>
              <option value="Expired">⌛ Expired</option>
              <option value="Archived">📦 Archived</option>
            </select>

            {/* Property Filter */}
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="ALL">🏢 All Target Properties</option>
              {properties.map((p) => (
                <option key={p.property_id} value={p.property_id}>
                  {p.property_name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded-xl border border-outline-variant/60">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-white"
              }`}
              title="Grid Cards"
            >
              <span className="material-symbols-outlined text-[16px] block">grid_view</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "table" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-white"
              }`}
              title="Table View"
            >
              <span className="material-symbols-outlined text-[16px] block">table_rows</span>
            </button>
          </div>
        </div>
      </div>

      {/* ANNOUNCEMENTS DIRECTORY / FEED */}
      {filteredAnnouncements.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant border border-dashed border-outline-variant/60 rounded-3xl bg-surface-container-lowest flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined text-4xl opacity-40">campaign</span>
          <p className="text-sm font-semibold text-white">No announcements found matching current filters.</p>
          <p className="text-xs text-on-surface-variant">Try adjusting the category, property, or status filter.</p>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnnouncements.map((a) => {
            const catMeta = CATEGORY_MAP[a.category] || CATEGORY_MAP.Notice;
            const isItemUpdating = isPending && updatingId === a.announcement_id;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isExpired = new Date(a.expiry_date) < today;

            return (
              <div
                key={a.announcement_id}
                className={`bg-surface-container border rounded-2xl p-5 shadow-lg relative flex flex-col justify-between transition-all gap-4 ${
                  a.is_pinned
                    ? "border-amber-500/50 bg-gradient-to-b from-surface-container to-amber-950/10 ring-1 ring-amber-500/30"
                    : a.priority === "Urgent"
                    ? "border-rose-500/50 bg-gradient-to-b from-surface-container to-rose-950/15"
                    : "border-outline-variant/60 hover:border-primary/40"
                }`}
              >
                {/* Header & Badges */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Pinned Tag */}
                      {a.is_pinned && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">push_pin</span>
                          Pinned
                        </span>
                      )}

                      {/* Category Badge */}
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 ${catMeta.style}`}>
                        <span className="material-symbols-outlined text-[13px]">{catMeta.icon}</span>
                        {catMeta.label}
                      </span>

                      {/* Priority Badge */}
                      {getPriorityBadge(a.priority)}
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                        a.status === "Published"
                          ? isExpired
                            ? "bg-gray-700/50 text-gray-400 border-gray-600"
                            : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : a.status === "Draft"
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-gray-700/50 text-gray-400 border-gray-600"
                      }`}
                    >
                      {a.status === "Published" ? (isExpired ? "Expired" : "Live") : a.status}
                    </span>
                  </div>

                  {/* Title & Property Tag */}
                  <div>
                    <div className="text-[11px] text-on-surface-variant flex items-center gap-1 mb-1 font-medium">
                      <span>{a.property ? `🏢 ${a.property.property_name}` : "🌐 Universal Broadcast"}</span>
                      <span>•</span>
                      <span>Audience: {a.target_audience}</span>
                    </div>
                    <h3
                      className="text-base font-bold text-white leading-snug cursor-pointer hover:text-primary transition-colors line-clamp-2"
                      onClick={() => setPreviewItem(a)}
                    >
                      {a.title}
                    </h3>
                  </div>

                  {/* Optional Cover Image */}
                  {a.image_url && (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-outline-variant/40">
                      <Image
                        src={a.image_url}
                        alt={a.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}

                  {/* Body Content Snippet */}
                  <p className="text-xs text-on-surface-variant line-clamp-3 leading-relaxed">
                    {a.content}
                  </p>
                </div>

                {/* Footer Metadata & Actions */}
                <div className="space-y-3 pt-3 border-t border-outline-variant/30 text-xs">
                  <div className="flex justify-between items-center text-[11px] text-on-surface-variant font-medium">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                      {new Date(a.publish_date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}{" "}
                      -{" "}
                      {new Date(a.expiry_date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {a.author && (
                      <span className="truncate max-w-[120px]" title={a.author.user_name}>
                        ✍️ {a.author.user_name}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <div className="flex items-center gap-1">
                      {/* Pin Button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePin(a)}
                        disabled={isItemUpdating}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          a.is_pinned
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-surface-container-high text-on-surface-variant border-outline-variant hover:text-white"
                        }`}
                        title={a.is_pinned ? "Unpin from top" : "Pin to top"}
                      >
                        <span className="material-symbols-outlined text-[16px]">push_pin</span>
                      </button>

                      {/* View Reader */}
                      <button
                        type="button"
                        onClick={() => setPreviewItem(a)}
                        className="p-1.5 rounded-lg bg-surface-container-high text-on-surface-variant border border-outline-variant hover:text-white transition-colors"
                        title="Read Full Notice"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreating(false);
                          setEditingItem(a);
                        }}
                        className="p-1.5 rounded-lg bg-surface-container-high text-on-surface-variant border border-outline-variant hover:text-primary transition-colors"
                        title="Edit Announcement"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                    </div>

                    {/* Status & Delete */}
                    <div className="flex items-center gap-1">
                      {a.status === "Published" ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(a.announcement_id, "Archived")}
                          disabled={isItemUpdating}
                          className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-white text-[11px] font-medium border border-outline-variant"
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(a.announcement_id, "Published")}
                          disabled={isItemUpdating}
                          className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-semibold border border-emerald-500/40"
                        >
                          Publish
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(a.announcement_id)}
                        disabled={isItemUpdating}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                        title="Delete Announcement"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-surface-container border border-outline-variant/60 rounded-2xl overflow-hidden shadow-lg overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-lowest text-on-surface-variant uppercase text-[10px] tracking-wider border-b border-outline-variant/60">
              <tr>
                <th className="px-4 py-3">Announcement</th>
                <th className="px-4 py-3">Category & Scope</th>
                <th className="px-4 py-3">Urgency</th>
                <th className="px-4 py-3">Validity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filteredAnnouncements.map((a) => {
                const catMeta = CATEGORY_MAP[a.category] || CATEGORY_MAP.Notice;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isExpired = new Date(a.expiry_date) < today;

                return (
                  <tr
                    key={a.announcement_id}
                    className={`hover:bg-surface-container-high/40 transition-colors ${
                      a.is_pinned ? "bg-amber-500/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {a.is_pinned && (
                          <span className="material-symbols-outlined text-[15px] text-amber-400 shrink-0">
                            push_pin
                          </span>
                        )}
                        <span
                          className="font-bold text-white hover:text-primary cursor-pointer max-w-xs truncate block"
                          onClick={() => setPreviewItem(a)}
                          title={a.title}
                        >
                          {a.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant truncate block max-w-sm mt-0.5">
                        {a.content}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold inline-block ${catMeta.style}`}>
                        {catMeta.label}
                      </span>
                      <div className="text-[11px] text-on-surface-variant mt-1">
                        {a.property?.property_name || "Universal Broadcast"}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {getPriorityBadge(a.priority)}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px] text-on-surface-variant">
                      <div>{new Date(a.publish_date).toLocaleDateString("en-GB")}</div>
                      <div className="text-[10px] text-on-surface-variant/70">
                        to {new Date(a.expiry_date).toLocaleDateString("en-GB")}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          a.status === "Published"
                            ? isExpired
                              ? "bg-gray-700/50 text-gray-400 border-gray-600"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {a.status === "Published" ? (isExpired ? "Expired" : "Live") : a.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleTogglePin(a)}
                          className="p-1 rounded-lg bg-surface-container-high border border-outline-variant hover:text-white"
                          title={a.is_pinned ? "Unpin" : "Pin"}
                        >
                          <span className="material-symbols-outlined text-[15px]">push_pin</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewItem(a)}
                          className="p-1 rounded-lg bg-surface-container-high border border-outline-variant hover:text-white"
                          title="Read"
                        >
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreating(false);
                            setEditingItem(a);
                          }}
                          className="p-1 rounded-lg bg-surface-container-high border border-outline-variant hover:text-primary"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(a.announcement_id)}
                          className="p-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FULL PREVIEW READER MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Close */}
            <button
              type="button"
              onClick={() => setPreviewItem(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant hover:text-white flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${
                CATEGORY_MAP[previewItem.category]?.style || ""
              }`}>
                {CATEGORY_MAP[previewItem.category]?.label || previewItem.category}
              </span>
              {getPriorityBadge(previewItem.priority)}
              <span className="text-xs text-on-surface-variant">
                {previewItem.property?.property_name ? `🏢 ${previewItem.property.property_name}` : "🌐 Universal"}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-xl font-extrabold text-white tracking-tight leading-snug">
              {previewItem.title}
            </h2>

            {/* Cover image if available */}
            {previewItem.image_url && (
              <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-outline-variant/40 my-1">
                <Image
                  src={previewItem.image_url}
                  alt={previewItem.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}

            {/* Body */}
            <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line bg-surface-container/60 p-4 rounded-2xl border border-outline-variant/40">
              {previewItem.content}
            </div>

            {/* Attachment */}
            {previewItem.attachment_url && (
              <a
                href={previewItem.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold flex items-center justify-between hover:bg-primary/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                  <span>Download Official Circular Document (PDF)</span>
                </div>
                <span className="material-symbols-outlined text-[16px]">download</span>
              </a>
            )}

            {/* Meta Footer */}
            <div className="flex items-center justify-between text-xs text-on-surface-variant pt-3 border-t border-outline-variant/40">
              <span>
                Published:{" "}
                {new Date(previewItem.publish_date).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              {previewItem.author && <span>By {previewItem.author.user_name} ({previewItem.author.role})</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
