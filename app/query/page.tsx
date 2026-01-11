"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// ============================================================================
// Types
// ============================================================================

interface ProcedureSuggestion {
  id: string;
  name: string;
  category: string;
  matchScore: number;
}

interface ProcedureSearchResult {
  id: string;
  name: string;
  score: number;
  keywords: string[];
  category: string;
  metroAvailability: {
    slug: string;
    name: string;
    available: boolean;
  }[];
}

interface SearchState {
  isLoading: boolean;
  error: string | null;
  suggestions: ProcedureSuggestion[];
  searchTimeMs?: number;
}

// ============================================================================
// Category Styling
// ============================================================================

const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  orthopedic: { bg: "bg-blue-100", text: "text-blue-700", icon: "🦴" },
  cardiac: { bg: "bg-red-100", text: "text-red-700", icon: "❤️" },
  dental: { bg: "bg-cyan-100", text: "text-cyan-700", icon: "🦷" },
  gastrointestinal: { bg: "bg-amber-100", text: "text-amber-700", icon: "🎗️" },
  oncology: { bg: "bg-purple-100", text: "text-purple-700", icon: "🎗️" },
  ophthalmology: { bg: "bg-emerald-100", text: "text-emerald-700", icon: "👁️" },
  urology: { bg: "bg-yellow-100", text: "text-yellow-700", icon: "💧" },
  neurology: { bg: "bg-pink-100", text: "text-pink-700", icon: "🧠" },
  obstetrics: { bg: "bg-rose-100", text: "text-rose-700", icon: "👶" },
  ent: { bg: "bg-orange-100", text: "text-orange-700", icon: "👂" },
  cosmetic: { bg: "bg-fuchsia-100", text: "text-fuchsia-700", icon: "✨" },
  diagnostic: { bg: "bg-slate-100", text: "text-slate-700", icon: "🔬" },
  general: { bg: "bg-gray-100", text: "text-gray-700", icon: "🏥" },
};

function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES.general;
}

// ============================================================================
// Custom Hook: Debounce
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// Semantic Search Input Component
// ============================================================================

interface SemanticSearchInputProps {
  onSelect: (result: ProcedureSearchResult) => void;
  placeholder?: string;
}

function SemanticSearchInput({
  onSelect,
  placeholder = "Describe what you need... (e.g., 'knee pain', 'heart problem')",
}: SemanticSearchInputProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: false,
    error: null,
    suggestions: [],
  });
  const [selectedResult, setSelectedResult] = useState<ProcedureSearchResult | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Debounce the search query
  const debouncedQuery = useDebounce(query, 300);

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    async function fetchSuggestions() {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        setSearchState({ isLoading: false, error: null, suggestions: [] });
        return;
      }

      setSearchState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(
          `/api/procedures/search?q=${encodeURIComponent(debouncedQuery.trim())}&limit=8`
        );

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json();

        // Transform search results to suggestions format with metro info
        const suggestions: ProcedureSuggestion[] = data.results.map(
          (r: ProcedureSearchResult) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            matchScore: r.score,
            metroAvailability: r.metroAvailability,
          })
        );

        setSearchState({
          isLoading: false,
          error: null,
          suggestions,
          searchTimeMs: data.searchTimeMs,
        });

        // Store full results for metro selection
        (window as unknown as { __searchResults: ProcedureSearchResult[] }).__searchResults = data.results;
      } catch (err) {
        setSearchState({
          isLoading: false,
          error: err instanceof Error ? err.message : "Search failed",
          suggestions: [],
        });
      }
    }

    fetchSuggestions();
  }, [debouncedQuery]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchState.suggestions]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setSelectedResult(null);
    if (!isOpen && newQuery.length >= 2) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (query.length >= 2) {
      setIsOpen(true);
    }
  };

  const handleSelect = useCallback(
    (suggestion: ProcedureSuggestion) => {
      // Get full result with metro availability
      const results = (window as unknown as { __searchResults: ProcedureSearchResult[] }).__searchResults || [];
      const fullResult = results.find((r) => r.id === suggestion.id);

      if (fullResult) {
        setSelectedResult(fullResult);
        setQuery(suggestion.name);
        setIsOpen(false);
        onSelect(fullResult);
      }
    },
    [onSelect]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && searchState.suggestions.length > 0) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        e.preventDefault();
        return;
      }
    }

    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < searchState.suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (searchState.suggestions[highlightedIndex]) {
          handleSelect(searchState.suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const formatScore = (score: number) => {
    return Math.round(score * 100);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input Field */}
      <div
        className={`relative rounded-2xl transition-all duration-300 ${
          isOpen ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white" : ""
        }`}
      >
        {/* Search Icon / Loading Spinner */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          {searchState.isLoading ? (
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          ) : (
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
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-12 pr-12 py-4 bg-slate-100/80 rounded-2xl text-lg focus:outline-none transition-colors ${
            selectedResult ? "text-slate-800" : "text-slate-600"
          } placeholder:text-slate-400`}
          autoComplete="off"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="semantic-search-listbox"
          role="combobox"
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelectedResult(null);
              setSearchState({ isLoading: false, error: null, suggestions: [] });
              inputRef.current?.focus();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
            aria-label="Clear search"
          >
            <svg
              className="w-5 h-5 text-slate-400 hover:text-slate-600"
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
      </div>

      {/* Semantic Search Hint */}
      {!isOpen && !selectedResult && query.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          <span className="text-xs text-slate-400">Try:</span>
          {["knee pain", "heart surgery", "stomach issues", "eye problem"].map((hint) => (
            <button
              key={hint}
              onClick={() => {
                setQuery(hint);
                setIsOpen(true);
              }}
              className="text-xs px-2 py-1 bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 rounded-full transition-colors"
            >
              {hint}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {/* Loading State */}
          {searchState.isLoading && query.length >= 2 && (
            <div className="px-4 py-6 text-center">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                Searching for &quot;{query}&quot;...
              </p>
              <p className="text-xs text-slate-400 mt-1">Using semantic search</p>
            </div>
          )}

          {/* Error State */}
          {searchState.error && (
            <div className="px-4 py-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <p className="text-sm text-red-600">{searchState.error}</p>
              <p className="text-xs text-slate-400 mt-1">Please try again</p>
            </div>
          )}

          {/* No Results */}
          {!searchState.isLoading &&
            !searchState.error &&
            searchState.suggestions.length === 0 &&
            query.length >= 2 && (
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
                  Try different keywords or descriptions
                </p>
              </div>
            )}

          {/* Results */}
          {!searchState.isLoading &&
            !searchState.error &&
            searchState.suggestions.length > 0 && (
              <>
                {/* Results Header */}
                <div className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-indigo-600">
                        {searchState.suggestions.length}
                      </span>{" "}
                      semantic matches
                    </p>
                    {searchState.searchTimeMs && (
                      <p className="text-xs text-slate-400">
                        {searchState.searchTimeMs}ms
                      </p>
                    )}
                  </div>
                </div>

                {/* Results List */}
                <ul
                  ref={listRef}
                  id="semantic-search-listbox"
                  role="listbox"
                  className="max-h-80 overflow-y-auto overscroll-contain"
                >
                  {searchState.suggestions.map((suggestion, index) => {
                    const style = getCategoryStyle(suggestion.category);
                    const relevance = formatScore(suggestion.matchScore);

                    return (
                      <li
                        key={suggestion.id}
                        role="option"
                        aria-selected={index === highlightedIndex}
                        onClick={() => handleSelect(suggestion)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`px-4 py-3 cursor-pointer transition-colors ${
                          index === highlightedIndex
                            ? "bg-indigo-50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Category Icon */}
                          <span className="text-xl flex-shrink-0 mt-0.5">
                            {style.icon}
                          </span>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-slate-800 truncate">
                                {suggestion.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Category Badge */}
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                              >
                                {suggestion.category}
                              </span>

                              {/* Relevance Score */}
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  relevance >= 70
                                    ? "bg-emerald-100 text-emerald-700"
                                    : relevance >= 50
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {relevance}% match
                              </span>
                            </div>
                          </div>

                          {/* Selection Indicator */}
                          {index === highlightedIndex && (
                            <div className="flex-shrink-0">
                              <svg
                                className="w-5 h-5 text-indigo-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Keyboard Hints */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                  <p className="text-xs text-slate-400 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-500 font-mono text-xs">
                        ↑↓
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

          {/* Initial State - Show Hint */}
          {!searchState.isLoading &&
            !searchState.error &&
            searchState.suggestions.length === 0 &&
            query.length < 2 && (
              <div className="px-4 py-6 text-center">
                <svg
                  className="w-10 h-10 mx-auto text-indigo-200 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <p className="text-sm text-slate-500">
                  Type at least 2 characters to search
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  AI-powered semantic search understands your intent
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Metro Selection Modal
// ============================================================================

interface MetroSelectionProps {
  procedure: ProcedureSearchResult;
  onSelect: (metroSlug: string) => void;
  onCancel: () => void;
}

function MetroSelection({ procedure, onSelect, onCancel }: MetroSelectionProps) {
  const availableMetros = procedure.metroAvailability.filter((m) => m.available);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">Select Location</h3>
            <p className="text-sm text-slate-500">{procedure.name}</p>
          </div>
        </div>

        {/* Metro Options */}
        <div className="space-y-3 mb-6">
          {availableMetros.map((metro) => (
            <button
              key={metro.slug}
              onClick={() => onSelect(metro.slug)}
              className="w-full p-4 bg-slate-50 hover:bg-indigo-50 rounded-xl text-left transition-colors group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <svg
                    className="w-5 h-5 text-slate-400 group-hover:text-indigo-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <span className="font-medium text-slate-700 group-hover:text-indigo-700">
                  {metro.name}
                </span>
              </div>
              <svg
                className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ))}
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="w-full py-3 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Selected Procedure Card
// ============================================================================

interface SelectedProcedureCardProps {
  procedure: ProcedureSearchResult;
  onClear: () => void;
  onViewPricing: (metroSlug: string) => void;
}

function SelectedProcedureCard({
  procedure,
  onClear,
  onViewPricing,
}: SelectedProcedureCardProps) {
  const style = getCategoryStyle(procedure.category);
  const availableMetros = procedure.metroAvailability.filter((m) => m.available);

  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{style.icon}</span>
          <div>
            <h3 className="font-semibold text-slate-800">{procedure.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
              >
                {procedure.category}
              </span>
              <span className="text-xs text-slate-400">
                {Math.round(procedure.score * 100)}% match
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClear}
          className="p-1 hover:bg-white/50 rounded-lg transition-colors"
          aria-label="Clear selection"
        >
          <svg
            className="w-5 h-5 text-slate-400 hover:text-slate-600"
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
      </div>

      {/* Keywords */}
      {procedure.keywords.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">Related terms:</p>
          <div className="flex flex-wrap gap-1">
            {procedure.keywords.slice(0, 5).map((keyword) => (
              <span
                key={keyword}
                className="px-2 py-0.5 bg-white/80 text-slate-600 text-xs rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metro Availability */}
      <div className="mb-4">
        <p className="text-xs text-slate-500 mb-2">Available in:</p>
        <div className="flex flex-wrap gap-2">
          {procedure.metroAvailability.map((metro) => (
            <span
              key={metro.slug}
              className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${
                metro.available
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {metro.available ? (
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3 h-3"
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
              )}
              {metro.name}
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      {availableMetros.length === 1 ? (
        <button
          onClick={() => onViewPricing(availableMetros[0].slug)}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 group"
        >
          <span>View Pricing in {availableMetros[0].name}</span>
          <svg
            className="w-5 h-5 transition-transform group-hover:translate-x-1"
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
      ) : availableMetros.length > 1 ? (
        <div className="grid grid-cols-2 gap-2">
          {availableMetros.map((metro) => (
            <button
              key={metro.slug}
              onClick={() => onViewPricing(metro.slug)}
              className="py-3 px-4 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-medium rounded-xl border border-slate-200 hover:border-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
              </svg>
              <span>{metro.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="py-3 px-4 bg-amber-50 text-amber-700 text-sm rounded-xl border border-amber-100 text-center">
          This procedure is not available in any location yet.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Query Page
// ============================================================================

export default function QueryPage() {
  const [selectedProcedure, setSelectedProcedure] = useState<ProcedureSearchResult | null>(null);
  const [showMetroModal, setShowMetroModal] = useState(false);
  const router = useRouter();

  const handleProcedureSelect = useCallback((result: ProcedureSearchResult) => {
    setSelectedProcedure(result);
  }, []);

  const handleViewPricing = (metroSlug: string) => {
    if (selectedProcedure) {
      router.push(
        `/results?procedure_id=${encodeURIComponent(selectedProcedure.id)}&metro_slug=${encodeURIComponent(metroSlug)}`
      );
    }
  };

  const handleClearSelection = () => {
    setSelectedProcedure(null);
  };

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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
              Find Medical Procedures
            </h1>
            <p className="text-slate-500 text-sm md:text-base">
              Describe what you&apos;re looking for in plain language
            </p>
          </div>

          {/* Semantic Search Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-2 ml-1">
              What procedure do you need?
            </label>
            <SemanticSearchInput
              onSelect={handleProcedureSelect}
              placeholder="e.g., 'knee pain surgery' or 'heart problem'"
            />
          </div>

          {/* Selected Procedure Card */}
          {selectedProcedure && (
            <SelectedProcedureCard
              procedure={selectedProcedure}
              onClear={handleClearSelection}
              onViewPricing={handleViewPricing}
            />
          )}

          {/* AI Badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>Powered by AI semantic search</span>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="flex justify-center mt-8 gap-2">
          <div className="w-8 h-1.5 bg-indigo-500 rounded-full" />
          <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
        </div>
      </div>

      {/* Metro Selection Modal */}
      {showMetroModal && selectedProcedure && (
        <MetroSelection
          procedure={selectedProcedure}
          onSelect={(metroSlug) => {
            setShowMetroModal(false);
            handleViewPricing(metroSlug);
          }}
          onCancel={() => setShowMetroModal(false)}
        />
      )}
    </div>
  );
}
