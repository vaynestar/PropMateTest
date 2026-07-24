// Deterministic Color Hashing for Facility Cards
export function getFacilityAccentColor(type: string | null | undefined): {
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
  icon: string;
} {
  if (!type) {
    return {
      bg: "bg-cyan-500/10",
      text: "text-cyan-400",
      border: "border-cyan-500/30",
      badgeBg: "bg-cyan-500/20",
      icon: "apartment",
    };
  }

  const normalized = type.toLowerCase().trim();

  if (normalized.includes("pool") || normalized.includes("swimming")) {
    return { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", badgeBg: "bg-cyan-500/20", icon: "pool" };
  }
  if (normalized.includes("gym") || normalized.includes("fitness")) {
    return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", badgeBg: "bg-emerald-500/20", icon: "fitness_center" };
  }
  if (normalized.includes("badminton")) {
    return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", badgeBg: "bg-amber-500/20", icon: "sports_tennis" };
  }
  if (normalized.includes("tennis")) {
    return { bg: "bg-lime-500/10", text: "text-lime-400", border: "border-lime-500/30", badgeBg: "bg-lime-500/20", icon: "sports_tennis" };
  }
  if (normalized.includes("hall") || normalized.includes("ballroom") || normalized.includes("event")) {
    return { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", badgeBg: "bg-violet-500/20", icon: "domain" };
  }
  if (normalized.includes("bbq") || normalized.includes("barbecue")) {
    return { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", badgeBg: "bg-orange-500/20", icon: "kebab_dining" };
  }
  if (normalized.includes("work") || normalized.includes("office") || normalized.includes("study")) {
    return { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", badgeBg: "bg-blue-500/20", icon: "laptop_mac" };
  }

  // Fallback string hashing into 10 vibrant color combos
  const colorMap = [
    { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", badgeBg: "bg-cyan-500/20", icon: "meeting_room" },
    { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", badgeBg: "bg-emerald-500/20", icon: "meeting_room" },
    { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", badgeBg: "bg-amber-500/20", icon: "meeting_room" },
    { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", badgeBg: "bg-violet-500/20", icon: "meeting_room" },
    { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/30", badgeBg: "bg-teal-500/20", icon: "meeting_room" },
    { bg: "bg-lime-500/10", text: "text-lime-400", border: "border-lime-500/30", badgeBg: "bg-lime-500/20", icon: "meeting_room" },
    { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", badgeBg: "bg-rose-500/20", icon: "meeting_room" },
    { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30", badgeBg: "bg-sky-500/20", icon: "meeting_room" },
    { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30", badgeBg: "bg-indigo-500/20", icon: "meeting_room" },
    { bg: "bg-fuchsia-500/10", text: "text-fuchsia-400", border: "border-fuchsia-500/30", badgeBg: "bg-fuchsia-500/20", icon: "meeting_room" },
  ];

  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = type.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colorMap.length;
  return colorMap[index];
}
