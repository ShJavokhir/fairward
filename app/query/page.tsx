"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  placeholder = "Describe what you need...",
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

  const debouncedQuery = useDebounce(query, 300);

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

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchState.suggestions]);

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
      <div className={`relative transition-all duration-300 ${isOpen ? "ring-2 ring-[#1a1a1a] ring-offset-2" : ""}`}>
        <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
          {searchState.isLoading ? (
            <div className="w-5 h-5 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-5 h-5 text-[#1a1a1a]/30"
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
          className="w-full pl-14 pr-12 py-5 bg-white border border-[#1a1a1a]/10 rounded-2xl text-lg focus:outline-none transition-colors placeholder:text-[#1a1a1a]/30"
          autoComplete="off"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelectedResult(null);
              setSearchState({ isLoading: false, error: null, suggestions: [] });
              inputRef.current?.focus();
            }}
            className="absolute right-5 top-1/2 -translate-y-1/2 p-1 hover:bg-[#1a1a1a]/5 rounded-full transition-colors"
            aria-label="Clear search"
          >
            <svg
              className="w-5 h-5 text-[#1a1a1a]/30 hover:text-[#1a1a1a]/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestion Hints */}
      {!isOpen && !selectedResult && query.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <span className="text-xs text-[#1a1a1a]/40">Try:</span>
          {["knee replacement", "MRI scan", "colonoscopy"].map((hint) => (
            <button
              key={hint}
              onClick={() => {
                setQuery(hint);
                setIsOpen(true);
              }}
              className="text-xs px-3 py-1.5 border border-[#1a1a1a]/10 hover:border-[#1a1a1a]/30 text-[#1a1a1a]/60 hover:text-[#1a1a1a] rounded-full transition-all"
            >
              {hint}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-[#1a1a1a]/5 overflow-hidden">
          {searchState.isLoading && query.length >= 2 && (
            <div className="px-6 py-8 text-center">
              <div className="w-6 h-6 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-[#1a1a1a]/60">Searching...</p>
            </div>
          )}

          {searchState.error && (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-red-600">{searchState.error}</p>
            </div>
          )}

          {!searchState.isLoading &&
            !searchState.error &&
            searchState.suggestions.length === 0 &&
            query.length >= 2 && (
              <div className="px-6 py-8 text-center">
                <p className="text-[#1a1a1a]/60 text-sm">No procedures found</p>
                <p className="text-[#1a1a1a]/40 text-xs mt-1">Try different keywords</p>
              </div>
            )}

          {!searchState.isLoading &&
            !searchState.error &&
            searchState.suggestions.length > 0 && (
              <>
                <div className="px-5 py-3 border-b border-[#1a1a1a]/5">
                  <p className="text-xs text-[#1a1a1a]/40">
                    {searchState.suggestions.length} results
                    {searchState.searchTimeMs && ` · ${searchState.searchTimeMs}ms`}
                  </p>
                </div>

                <ul ref={listRef} role="listbox" className="max-h-80 overflow-y-auto">
                  {searchState.suggestions.map((suggestion, index) => {
                    const relevance = formatScore(suggestion.matchScore);

                    return (
                      <li
                        key={suggestion.id}
                        role="option"
                        aria-selected={index === highlightedIndex}
                        onClick={() => handleSelect(suggestion)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`px-5 py-4 cursor-pointer transition-colors border-b border-[#1a1a1a]/5 last:border-0 ${
                          index === highlightedIndex ? "bg-[#1a1a1a]/[0.03]" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#1a1a1a] truncate">{suggestion.name}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs text-[#1a1a1a]/40 capitalize">
                                {suggestion.category}
                              </span>
                              <span className="text-[#1a1a1a]/20">·</span>
                              <span className={`text-xs ${
                                relevance >= 70 ? "text-emerald-600" : "text-[#1a1a1a]/40"
                              }`}>
                                {relevance}% match
                              </span>
                            </div>
                          </div>
                          {index === highlightedIndex && (
                            <svg className="w-4 h-4 text-[#1a1a1a]/30 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="px-5 py-3 bg-[#1a1a1a]/[0.02] border-t border-[#1a1a1a]/5">
                  <p className="text-xs text-[#1a1a1a]/30 flex items-center gap-4">
                    <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-[#1a1a1a]/10 text-[10px] font-mono">↑↓</kbd> navigate</span>
                    <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-[#1a1a1a]/10 text-[10px] font-mono">↵</kbd> select</span>
                  </p>
                </div>
              </>
            )}

          {!searchState.isLoading &&
            !searchState.error &&
            searchState.suggestions.length === 0 &&
            query.length < 2 && (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-[#1a1a1a]/60">Type at least 2 characters</p>
              </div>
            )}
        </div>
      )}
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
  const availableMetros = procedure.metroAvailability.filter((m) => m.available);

  return (
    <div className="mt-8 p-6 bg-[#F5F5F3] rounded-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-[#1a1a1a]/40 mb-2">Selected</p>
          <h3 className="font-display text-xl text-[#1a1a1a]">{procedure.name}</h3>
          <p className="text-sm text-[#1a1a1a]/50 mt-1 capitalize">{procedure.category}</p>
        </div>
        <button
          onClick={onClear}
          className="p-2 hover:bg-white rounded-lg transition-colors"
          aria-label="Clear selection"
        >
          <svg className="w-5 h-5 text-[#1a1a1a]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {procedure.keywords.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-[#1a1a1a]/40 mb-2">Related terms</p>
          <div className="flex flex-wrap gap-2">
            {procedure.keywords.slice(0, 4).map((keyword) => (
              <span key={keyword} className="px-2.5 py-1 bg-white text-[#1a1a1a]/60 text-xs rounded-full">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <p className="text-xs text-[#1a1a1a]/40 mb-3">Select location</p>
        {availableMetros.length === 0 ? (
          <p className="text-sm text-[#1a1a1a]/50 italic">Not available in any location yet</p>
        ) : (
          <div className="grid gap-2">
            {availableMetros.map((metro) => (
              <button
                key={metro.slug}
                onClick={() => onViewPricing(metro.slug)}
                className="w-full p-4 bg-white hover:bg-[#1a1a1a] text-[#1a1a1a] hover:text-white rounded-xl text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#1a1a1a]/30 group-hover:text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span className="font-medium">{metro.name}</span>
                </div>
                <svg className="w-4 h-4 text-[#1a1a1a]/30 group-hover:text-white/50 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Query Page
// ============================================================================

export default function QueryPage() {
  const [selectedProcedure, setSelectedProcedure] = useState<ProcedureSearchResult | null>(null);
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
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Navigation */}
      <nav className="border-b border-[#1a1a1a]/5">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="group">
            <img
              src="/justprice-logo.jpeg"
              alt="JustPrice"
              className="h-9 w-auto group-hover:opacity-80 transition-opacity"
            />
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <p className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a]/40 mb-4">
            Price Search
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-normal leading-[1.1] tracking-tight text-[#1a1a1a] mb-4">
            Find your procedure
          </h1>
          <p className="text-lg text-[#1a1a1a]/50">
            Describe what you need in plain language. Our AI will find matching procedures.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <SemanticSearchInput
            onSelect={handleProcedureSelect}
            placeholder="e.g., knee replacement, heart surgery..."
          />
        </div>

        {/* Selected Procedure */}
        {selectedProcedure && (
          <SelectedProcedureCard
            procedure={selectedProcedure}
            onClear={handleClearSelection}
            onViewPricing={handleViewPricing}
          />
        )}

        {/* Footer Note */}
        <div className="mt-16 pt-8 border-t border-[#1a1a1a]/5">
          <div className="flex items-center justify-center gap-2 text-xs text-[#1a1a1a]/30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Powered by semantic search</span>
          </div>
        </div>
      </main>
    </div>
  );
}
