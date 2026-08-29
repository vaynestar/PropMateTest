"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

export interface ResidentAnnouncement {
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
  } | null;
  author?: {
    user_name: string;
    role: string;
  } | null;
}

interface ResidentAnnouncementListProps {
  announcements: ResidentAnnouncement[];
  propertyName?: string;
}

const CATEGORIES = [
  { id: "ALL", label: "All Notices", icon: "dashboard" },
  { id: "Maintenance", label: "Maintenance", icon: "build" },
  { id: "Emergency", label: "Emergency", icon: "warning" },
  { id: "Security", label: "Security", icon: "shield" },
  { id: "Event", label: "Events", icon: "celebration" },
  { id: "Notice", label: "Circulars", icon: "campaign" },
];

const CATEGORY_STYLES: Record<string, { label: string; icon: string; style: string }> = {
  Notice: { label: "General Notice", icon: "campaign", style: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
  Maintenance: { label: "Maintenance Disruption", icon: "build", style: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  Emergency: { label: "Emergency Alert", icon: "warning", style: "bg-rose-500/15 text-rose-300 border-rose-500/40" },
  Security: { label: "Security Advisory", icon: "shield", style: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  Event: { label: "Community Event", icon: "celebration", style: "bg-purple-500/10 text-purple-300 border-purple-500/30" },
  Billing: { label: "Billing & Admin", icon: "payments", style: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" },
};

export default function ResidentAnnouncementList({
  announcements,
  propertyName,
}: ResidentAnnouncementListProps) {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [readingItem, setReadingItem] = useState<ResidentAnnouncement | null>(null);

  // Urgent Emergency Announcement (if any)
  const urgentAnnouncement = useMemo(() => {
    return announcements.find((a) => a.priority === "Urgent");
  }, [announcements]);

  // Filtered List
  const filteredList = useMemo(() => {
    return announcements.filter((a) => {
      if (selectedCategory !== "ALL" && a.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = a.title.toLowerCase().includes(q);
        const matchesContent = a.content.toLowerCase().includes(q);
        if (!matchesTitle && !matchesContent) return false;
      }
      return true;
    });
  }, [announcements, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* EMERGENCY CRITICAL BANNER (if urgent announcement exists) */}
      {urgentAnnouncement && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/30 border border-rose-500/40 shadow-lg relative overflow-hidden animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[22px]">
                  emergency
                </span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                    Urgent Management Advisory
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {urgentAnnouncement.property?.property_name || propertyName || "Building Wide"}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  {urgentAnnouncement.title}
                </h3>
                <p className="text-xs text-rose-200/80 line-clamp-2 mt-0.5">
                  {urgentAnnouncement.content}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setReadingItem(urgentAnnouncement)}
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shrink-0 shadow-md transition-colors flex items-center gap-1.5 self-end sm:self-center pressable"
            >
              <span>View Notice</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                type="button"
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all pressable ${
                  isSelected
                    ? "bg-primary text-on-primary font-bold shadow-md"
                    : "bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-white hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search circulars..."
            className="w-full bg-surface-container border border-outline-variant/50 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* NOTICE CARDS GRID */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant glass-card rounded-2xl flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined text-4xl opacity-40">campaign</span>
          <p className="text-sm font-semibold text-white">No active circulars in this category.</p>
          <p className="text-xs text-on-surface-variant">Check back later or view all notice categories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((item) => {
            const catMeta = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.Notice;
            const publishFormatted = new Date(item.publish_date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={item.announcement_id}
                className={`glass-card rounded-2xl p-5 border flex flex-col justify-between hover:border-primary/40 transition-all gap-4 ${
                  item.is_pinned
                    ? "border-amber-500/40 bg-gradient-to-b from-surface-container to-amber-950/10 shadow-lg"
                    : "border-outline-variant/50 shadow-md"
                }`}
              >
                <div className="flex flex-col gap-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.is_pinned && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">push_pin</span>
                          Pinned Notice
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 ${catMeta.style}`}>
                        <span className="material-symbols-outlined text-[13px]">{catMeta.icon}</span>
                        {catMeta.label}
                      </span>
                      {item.priority === "High" && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          High Priority
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-on-surface-variant font-medium">
                      {publishFormatted}
                    </span>
                  </div>

                  {/* Title & Preview Image */}
                  <div>
                    <h3
                      onClick={() => setReadingItem(item)}
                      className="text-base font-bold text-white hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-snug"
                    >
                      {item.title}
                    </h3>
                  </div>

                  {item.image_url && (
                    <div
                      onClick={() => setReadingItem(item)}
                      className="relative w-full h-36 rounded-xl overflow-hidden border border-outline-variant/40 cursor-pointer group"
                    >
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    </div>
                  )}

                  {/* Content Snippet */}
                  <p className="text-xs text-on-surface-variant line-clamp-3 leading-relaxed">
                    {item.content}
                  </p>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-on-surface-variant text-[11px]">
                    <span className="material-symbols-outlined text-[15px]">domain</span>
                    <span>{item.property?.property_name || propertyName || "Community"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.attachment_url && (
                      <a
                        href={item.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-surface-container-highest border border-outline-variant hover:border-primary text-primary transition-colors flex items-center"
                        title="Download PDF Notice"
                      >
                        <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setReadingItem(item)}
                      className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-bold text-xs flex items-center gap-1 transition-colors pressable"
                    >
                      <span>Read More</span>
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL NOTICE READER MODAL */}
      {readingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Close */}
            <button
              type="button"
              onClick={() => setReadingItem(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant hover:text-white flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${
                CATEGORY_STYLES[readingItem.category]?.style || ""
              }`}>
                {CATEGORY_STYLES[readingItem.category]?.label || readingItem.category}
              </span>
              {readingItem.priority === "Urgent" && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                  🚨 Urgent Alert
                </span>
              )}
              <span className="text-xs text-on-surface-variant">
                🏢 {readingItem.property?.property_name || propertyName || "PropMate Community"}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-xl font-extrabold text-white tracking-tight leading-snug">
              {readingItem.title}
            </h2>

            {/* Cover image if available */}
            {readingItem.image_url && (
              <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-outline-variant/40 my-1">
                <Image
                  src={readingItem.image_url}
                  alt={readingItem.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}

            {/* Body */}
            <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line bg-surface-container/60 p-4 rounded-2xl border border-outline-variant/40">
              {readingItem.content}
            </div>

            {/* Attachment */}
            {readingItem.attachment_url && (
              <a
                href={readingItem.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold flex items-center justify-between hover:bg-primary/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                  <span>Download Official Circular Attachment</span>
                </div>
                <span className="material-symbols-outlined text-[16px]">download</span>
              </a>
            )}

            {/* Meta Footer */}
            <div className="flex items-center justify-between text-xs text-on-surface-variant pt-3 border-t border-outline-variant/40">
              <span>
                Issued on{" "}
                {new Date(readingItem.publish_date).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span>PropMate Management Office</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
