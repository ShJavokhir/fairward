"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PopularProcedures from "@/components/PopularProcedures";
import { PopularProcedure } from "@/lib/popular-procedures";

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
      <div className={`relative transition-all duration-300 ${isOpen ? "ring-2 ring-[#2DD4BF] ring-offset-2 rounded-2xl" : ""}`}>
        <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
          {searchState.isLoading ? (
            <div className="w-5 h-5 border-2 border-[#0A4D4D] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-5 h-5 text-[#5F7A7A]"
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
          className="w-full pl-14 pr-12 py-5 bg-white border-2 border-[#0F2E2E]/10 rounded-2xl text-lg text-[#0F2E2E] focus:outline-none focus:border-[#2DD4BF] transition-all placeholder:text-[#94A3A3] shadow-sm"
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
            className="absolute right-5 top-1/2 -translate-y-1/2 p-1.5 hover:bg-[#E8F5F0] rounded-full transition-colors"
            aria-label="Clear search"
          >
            <svg
              className="w-5 h-5 text-[#5F7A7A] hover:text-[#0F2E2E]"
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
          <span className="text-xs text-[#5F7A7A]">Try:</span>
          {["knee replacement", "MRI scan", "colonoscopy"].map((hint) => (
            <button
              key={hint}
              onClick={() => {
                setQuery(hint);
                setIsOpen(true);
              }}
              className="text-xs px-3 py-1.5 bg-[#E8F5F0] hover:bg-[#CCFBF1] text-[#0A4D4D] rounded-full transition-all font-medium"
            >
              {hint}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-3 bg-white rounded-2xl shadow-lg border border-[#0F2E2E]/10 overflow-hidden">
          {searchState.isLoading && query.length >= 2 && (
            <div className="px-6 py-8 text-center">
              <div className="w-6 h-6 border-2 border-[#0A4D4D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-[#5F7A7A]">Searching...</p>
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
                <p className="text-[#5F7A7A] text-sm">No procedures found</p>
                <p className="text-[#94A3A3] text-xs mt-1">Try different keywords</p>
              </div>
            )}

          {!searchState.isLoading &&
            !searchState.error &&
            searchState.suggestions.length > 0 && (
              <>
                <div className="px-5 py-3 border-b border-[#0F2E2E]/5 bg-[#F2FAF7]">
                  <p className="text-xs text-[#5F7A7A]">
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
                        className={`px-5 py-4 cursor-pointer transition-colors border-b border-[#0F2E2E]/5 last:border-0 ${
                          index === highlightedIndex ? "bg-[#E8F5F0]" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#0F2E2E] truncate">{suggestion.name}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs text-[#5F7A7A] capitalize">
                                {suggestion.category}
                              </span>
                              <span className="text-[#94A3A3]">·</span>
                              <span className={`text-xs font-medium ${
                                relevance >= 70 ? "text-[#22C55E]" : "text-[#5F7A7A]"
                              }`}>
                                {relevance}% match
                              </span>
                            </div>
                          </div>
                          {index === highlightedIndex && (
                            <svg className="w-4 h-4 text-[#2DD4BF] flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="px-5 py-3 bg-[#F2FAF7] border-t border-[#0F2E2E]/5">
                  <p className="text-xs text-[#5F7A7A] flex items-center gap-4">
                    <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-[#0F2E2E]/10 text-[10px] font-mono">↑↓</kbd> navigate</span>
                    <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-[#0F2E2E]/10 text-[10px] font-mono">↵</kbd> select</span>
                  </p>
                </div>
              </>
            )}

          {!searchState.isLoading &&
            !searchState.error &&
            searchState.suggestions.length === 0 &&
            query.length < 2 && (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-[#5F7A7A]">Type at least 2 characters</p>
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
    <div className="mt-8 p-6 bg-white rounded-2xl border-2 border-[#2DD4BF]/20 shadow-md animate-scale-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <span className="badge badge-accent mb-2">Selected</span>
          <h3 className="font-display text-xl text-[#0F2E2E]">{procedure.name}</h3>
          <p className="text-sm text-[#5F7A7A] mt-1 capitalize">{procedure.category}</p>
        </div>
        <button
          onClick={onClear}
          className="p-2 hover:bg-[#E8F5F0] rounded-xl transition-colors"
          aria-label="Clear selection"
        >
          <svg className="w-5 h-5 text-[#5F7A7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {procedure.keywords.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-[#5F7A7A] mb-2">Related terms</p>
          <div className="flex flex-wrap gap-2">
            {procedure.keywords.slice(0, 4).map((keyword) => (
              <span key={keyword} className="px-3 py-1.5 bg-[#F2FAF7] text-[#0A4D4D] text-xs rounded-full font-medium">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-2">
        <p className="text-xs text-[#5F7A7A] mb-3">Select location to view prices</p>
        {availableMetros.length === 0 ? (
          <p className="text-sm text-[#5F7A7A] italic">Not available in any location yet</p>
        ) : (
          <div className="grid gap-2">
            {availableMetros.map((metro) => (
              <button
                key={metro.slug}
                onClick={() => onViewPricing(metro.slug)}
                className="w-full p-4 bg-[#0A4D4D] hover:bg-[#0D5F5F] text-white rounded-xl text-left transition-all flex items-center justify-between group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#2DD4BF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span className="font-medium">{metro.name}</span>
                </div>
                <svg className="w-4 h-4 text-[#2DD4BF] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="min-h-screen bg-gradient-to-b from-[#FDFCFA] to-[#F2FAF7]">
      {/* Navigation */}
      <nav className="border-b border-[#0F2E2E]/5 bg-white/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="group">
            <img
              src="/justprice-logo.jpeg"
              alt="JustPrice"
              className="h-9 w-auto group-hover:opacity-80 transition-opacity"
            />
          </Link>
          <Link
            href="/"
            className="text-sm text-[#5F7A7A] hover:text-[#0A4D4D] transition-colors font-medium"
          >
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#CCFBF1] text-[#0A4D4D] text-sm font-medium rounded-full mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Price Search
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-normal leading-[1.1] tracking-tight text-[#0F2E2E] mb-4">
            Find your procedure
          </h1>
          <p className="text-lg text-[#5F7A7A]">
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

        {/* Popular Procedures - show when nothing selected */}
        {!selectedProcedure && (
          <div className="mb-8">
            <PopularProcedures
              onSelect={(proc: PopularProcedure) => {
                handleProcedureSelect({
                  id: proc.id,
                  name: proc.name,
                  score: 1,
                  keywords: [],
                  category: proc.category,
                  metroAvailability: [
                    { slug: "Los_Angeles", name: "Los Angeles", available: true },
                    { slug: "Miami", name: "Miami", available: true },
                  ],
                });
              }}
            />
          </div>
        )}

        {/* Selected Procedure */}
        {selectedProcedure && (
          <SelectedProcedureCard
            procedure={selectedProcedure}
            onClear={handleClearSelection}
            onViewPricing={handleViewPricing}
          />
        )}

        {/* Footer Note */}
        <div className="mt-16 pt-8 border-t border-[#0F2E2E]/5">
          <div className="flex items-center justify-center gap-2 text-xs text-[#5F7A7A]">
            <svg className="w-4 h-4 text-[#2DD4BF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Powered by semantic search</span>
          </div>
        </div>
      </main>
    </div>
  );
}
