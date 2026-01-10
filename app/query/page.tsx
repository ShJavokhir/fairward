"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Procedure {
  id: string;
  name: string;
}

interface MetroArea {
  name: string;
  slug: string;
  results_base_path: string;
  procedures: Procedure[];
}

interface IndexData {
  version: string;
  metro_areas: MetroArea[];
  counts: {
    metro_areas: number;
    total_procedures: number;
  };
}

// Searchable Select Component
interface SearchableSelectProps {
  options: Procedure[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search procedures...",
  onSubmit,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Get selected option name
  const selectedOption = options.find((opt) => opt.id === value);

  // Filter options based on search query
  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // Reset search query to selected value when closing
        if (selectedOption) {
          setSearchQuery(selectedOption.name);
        } else {
          setSearchQuery("");
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOption]);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    if (!isOpen) {
      setIsOpen(true);
    }
    // Clear selection if user is typing something different
    if (selectedOption && newQuery !== selectedOption.name) {
      onChange("");
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    // Select all text on focus for easy replacement
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleOptionSelect = useCallback(
    (option: Procedure) => {
      onChange(option.id);
      setSearchQuery(option.name);
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
          // Trigger submit if a value is already selected
          if (value && onSubmit) {
            setTimeout(onSubmit, 100);
          }
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        if (selectedOption) {
          setSearchQuery(selectedOption.name);
        }
        inputRef.current?.blur();
        break;
      case "Tab":
        setIsOpen(false);
        if (selectedOption) {
          setSearchQuery(selectedOption.name);
        }
        break;
    }
  };

  // Highlight matching text in option
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="bg-indigo-100 text-indigo-800 rounded px-0.5"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input Field */}
      <div
        className={`relative rounded-2xl transition-all duration-300 ${
          isOpen
            ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white"
            : ""
        }`}
      >
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className={`w-5 h-5 transition-colors duration-300 ${
              isOpen ? "text-indigo-500" : "text-slate-400"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-12 pr-12 py-4 bg-slate-100/80 rounded-2xl text-lg focus:outline-none transition-colors ${
            value ? "text-slate-800" : "text-slate-600"
          } placeholder:text-slate-400`}
          autoComplete="off"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="procedure-listbox"
          role="combobox"
        />
        {/* Clear / Dropdown indicator */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSearchQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 hover:bg-slate-200 rounded-full transition-colors"
              aria-label="Clear selection"
            >
              <svg
                className="w-4 h-4 text-slate-400 hover:text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
          <svg
            className={`w-5 h-5 transition-all duration-300 ${
              value ? "text-indigo-500" : "text-slate-300"
            } ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <svg
                className="w-12 h-12 mx-auto text-slate-300 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-slate-500 text-sm">No procedures found</p>
              <p className="text-slate-400 text-xs mt-1">
                Try a different search term
              </p>
            </div>
          ) : (
            <>
              {/* Results count */}
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                <p className="text-xs text-slate-500">
                  {filteredOptions.length === options.length
                    ? `${options.length} procedures`
                    : `${filteredOptions.length} of ${options.length} procedures`}
                </p>
              </div>
              {/* Options list */}
              <ul
                ref={listRef}
                id="procedure-listbox"
                role="listbox"
                className="max-h-64 overflow-y-auto overscroll-contain"
              >
                {filteredOptions.map((option, index) => (
                  <li
                    key={option.id}
                    role="option"
                    aria-selected={option.id === value}
                    onClick={() => handleOptionSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-4 py-3 cursor-pointer transition-colors flex items-center gap-3 ${
                      index === highlightedIndex
                        ? "bg-indigo-50"
                        : "hover:bg-slate-50"
                    } ${option.id === value ? "bg-indigo-50" : ""}`}
                  >
                    {/* Selection indicator */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        option.id === value
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-slate-300"
                      }`}
                    >
                      {option.id === value && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    {/* Option text */}
                    <span
                      className={`text-sm ${
                        option.id === value
                          ? "text-indigo-700 font-medium"
                          : "text-slate-700"
                      }`}
                    >
                      {highlightMatch(option.name, searchQuery)}
                    </span>
                  </li>
                ))}
              </ul>
              {/* Keyboard hint */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-400 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-500 font-mono text-xs">
                      ↑
                    </kbd>
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-500 font-mono text-xs">
                      ↓
                    </kbd>
                    <span>navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-500 font-mono text-xs">
                      ↵
                    </kbd>
                    <span>select</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-500 font-mono text-xs">
                      esc
                    </kbd>
                    <span>close</span>
                  </span>
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function QueryPage() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState("");
  const [defaultMetroSlug, setDefaultMetroSlug] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchProcedures() {
      try {
        const response = await fetch("/api/procedures");
        if (!response.ok) {
          throw new Error("Failed to fetch procedures");
        }
        const data: IndexData = await response.json();

        // Use the first metro area as default and get its procedures
        if (data.metro_areas && data.metro_areas.length > 0) {
          const firstMetro = data.metro_areas[0];
          setDefaultMetroSlug(firstMetro.slug);
          setProcedures(firstMetro.procedures || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load procedures");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProcedures();
  }, []);

  const isFormValid = selectedProcedure !== "";

  const handleNext = () => {
    if (isFormValid) {
      router.push(
        `/results?procedure_id=${encodeURIComponent(selectedProcedure)}&metro_slug=${encodeURIComponent(defaultMetroSlug)}`
      );
    }
  };

  const selectedProcedureName = procedures.find((p) => p.id === selectedProcedure)?.name || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      {/* Main card */}
      <div className="relative w-full max-w-lg">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-500/10 p-8 md:p-12 border border-white/50">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 rotate-3 hover:rotate-0 transition-transform duration-300">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
              Find Your Procedure
            </h1>
            <p className="text-slate-500 text-sm md:text-base">
              Search for the medical procedure you&apos;re looking for
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-500 text-sm">Loading procedures...</p>
            </div>
          ) : (
            <>
              {/* Searchable Procedure Select */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-600 mb-2 ml-1">
                  Medical Procedure
                </label>
                <SearchableSelect
                  options={procedures}
                  value={selectedProcedure}
                  onChange={setSelectedProcedure}
                  placeholder="Type to search procedures..."
                  onSubmit={handleNext}
                />
                {selectedProcedureName && (
                  <div className="mt-3 flex items-center gap-2 ml-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-sm text-green-600 font-medium">
                      Ready: {selectedProcedureName}
                    </p>
                  </div>
                )}
              </div>

              {/* Button */}
              <button
                onClick={handleNext}
                disabled={!isFormValid}
                className={`w-full py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3 group ${
                  isFormValid
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <span>View Pricing</span>
                <svg
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isFormValid ? "group-hover:translate-x-1" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button>

              {/* Procedure count */}
              <p className="text-center text-xs text-slate-400 mt-6">
                {procedures.length} procedures available
              </p>
            </>
          )}
        </div>

        {/* Bottom decoration */}
        <div className="flex justify-center mt-8 gap-2">
          <div className="w-8 h-1.5 bg-indigo-500 rounded-full" />
          <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
        </div>
      </div>
    </div>
  );
}
