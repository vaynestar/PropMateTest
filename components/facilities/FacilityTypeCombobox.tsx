"use client";

import { useState, useRef, useEffect } from "react";

const DEFAULT_TYPES = [
  "Swimming Pool",
  "Gym",
  "Function Hall",
  "Badminton Court",
  "BBQ Area",
  "Tennis Court",
  "Meeting Room",
  "Sky Lounge",
  "Squash Court",
  "Games Room",
  "Sauna",
  "Co-Working Space",
];

interface FacilityTypeComboboxProps {
  defaultValue?: string;
  name?: string;
  existingTypes?: string[];
  required?: boolean;
}

export default function FacilityTypeCombobox({
  defaultValue = "",
  name = "facility_type",
  existingTypes = [],
  required = false,
}: FacilityTypeComboboxProps) {
  const [value, setValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Combine default suggestions + unique existing types from DB
  const allSuggestions = Array.from(
    new Set([...DEFAULT_TYPES, ...existingTypes].filter(Boolean))
  );

  // Auto-filter list based on user input
  const filteredOptions = allSuggestions.filter((opt) =>
    opt.toLowerCase().includes(value.toLowerCase().trim())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Type or select facility type..."
          required={required}
          className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 pr-10 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary text-sm transition-all"
        />
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-2 text-on-surface-variant hover:text-on-surface p-1 rounded-md transition-colors"
          tabIndex={-1}
          aria-label="Toggle facility type dropdown"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isOpen ? "arrow_drop_up" : "arrow_drop_down"}
          </span>
        </button>
      </div>

      {/* Auto-Filtered Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-xl bg-surface-container-high border border-outline-variant/80 shadow-2xl z-[100] py-1 backdrop-blur-md">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setValue(opt);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center justify-between ${
                  value.toLowerCase() === opt.toLowerCase()
                    ? "bg-primary/20 text-primary font-bold"
                    : "text-on-surface hover:bg-surface-container-highest"
                }`}
              >
                <span>{opt}</span>
                {value.toLowerCase() === opt.toLowerCase() && (
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    check
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-2.5 text-xs text-on-surface-variant italic">
              Press enter to use custom type: <strong className="text-primary">&quot;{value}&quot;</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
