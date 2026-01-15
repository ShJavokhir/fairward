"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PopularProcedures from "@/components/PopularProcedures";
import { PopularProcedure } from "@/lib/popular-procedures";
import { cn } from "@/lib/utils";

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

// Animated counter component
function AnimatedNumber({ value, suffix = "" }: { value: string; suffix?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      className={cn(
        "transition-all duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      {value}{suffix}
    </span>
  );
}

// Reveal on scroll component
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-500 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Arrow Icon Component
// ============================================================================

function ArrowIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
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
    <div ref={containerRef} className="relative z-50">
      {/* Input Field */}
      <div className={cn(
        "relative transition-all duration-200",
        isOpen && "ring-2 ring-[#002125] ring-offset-2 rounded-xl"
      )}>
        <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
          {searchState.isLoading ? (
            <div className="size-5 border-2 border-[#002125] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="size-5 text-[#6B7280]"
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
          className="w-full pl-14 pr-12 py-4 bg-white border border-[#E5E7EB] rounded-xl text-lg text-[#17270C] focus:outline-none focus:border-[#002125] transition-colors placeholder:text-[#6B7280]"
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
              setSearchState({ isLoading: false, error: null, suggestions: [] });
              inputRef.current?.focus();
            }}
            className="absolute right-5 top-1/2 -translate-y-1/2 p-1.5 hover:bg-[#F2FBEF] rounded-lg transition-colors"
            aria-label="Clear search"
          >
            <svg
              className="size-5 text-[#6B7280] hover:text-[#17270C]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          {searchState.isLoading && query.length >= 2 && (
            <div className="px-6 py-8 text-center">
              <div className="size-6 border-2 border-[#002125] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-[#6B7280]">Searching...</p>
            </div>
          )}

          {searchState.error && (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-[#C47B8C]">{searchState.error}</p>
            </div>
          )}

          {!searchState.isLoading &&
            !searchState.error &&
            searchState.suggestions.length === 0 &&
            query.length >= 2 && (
              <div className="px-6 py-8 text-center">
                <p className="text-[#6B7280] text-sm">No procedures found</p>
                <p className="text-[#6B7280] text-xs mt-1">Try different keywords</p>
              </div>
            )}

          {!searchState.isLoading &&
            !searchState.error &&
            searchState.suggestions.length > 0 && (
              <>
                <div className="px-4 py-2.5 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <p className="text-xs text-[#6B7280]">
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
                        className={cn(
                          "px-4 py-3.5 cursor-pointer transition-colors border-b border-[#E5E7EB] last:border-0",
                          index === highlightedIndex ? "bg-[#F2FBEF]" : ""
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#17270C] truncate">{suggestion.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-[#6B7280] capitalize">
                                {suggestion.category}
                              </span>
                              <span className="text-[#E5E7EB]">·</span>
                              <span className={cn(
                                "text-xs font-medium",
                                relevance >= 70 ? "text-[#5A9A6B]" : "text-[#6B7280]"
                              )}>
                                {relevance}% match
                              </span>
                            </div>
                          </div>
                          {index === highlightedIndex && (
                            <svg className="size-4 text-[#002125] flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="px-4 py-2.5 bg-[#F9FAFB] border-t border-[#E5E7EB]">
                  <p className="text-xs text-[#6B7280] flex items-center gap-4">
                    <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E5E7EB] text-[10px] font-mono">↑↓</kbd> navigate</span>
                    <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E5E7EB] text-[10px] font-mono">↵</kbd> select</span>
                  </p>
                </div>
              </>
            )}

          {!searchState.isLoading &&
            !searchState.error &&
            searchState.suggestions.length === 0 &&
            query.length < 2 && (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-[#6B7280]">Type at least 2 characters</p>
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
    <div className="mt-6 p-6 bg-white rounded-2xl border border-[#E5E7EB] animate-scale-in text-center relative">
      {/* Close button */}
      <button
        onClick={onClear}
        className="absolute top-4 right-4 p-2 hover:bg-[#F2FBEF] rounded-lg transition-colors"
        aria-label="Clear selection"
      >
        <svg className="size-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Procedure info */}
      <div className="mb-6">
        <h3 className="text-2xl text-[#17270C] mb-1">{procedure.name}</h3>
        <p className="text-sm text-[#6B7280] capitalize">{procedure.category}</p>
      </div>

      {/* Keywords */}
      {procedure.keywords.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap justify-center gap-2">
            {procedure.keywords.slice(0, 4).map((keyword) => (
              <span key={keyword} className="px-3 py-1.5 bg-[#F2FBEF] text-[#6B7280] text-xs rounded-full">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Location selection */}
      <div className="pt-4 border-t border-[#E5E7EB]">
        <p className="text-xs text-[#6B7280] mb-3">Select location to view prices</p>
        {availableMetros.length === 0 ? (
          <p className="text-sm text-[#6B7280] italic">Not available in any location yet</p>
        ) : (
          <div className="grid gap-2">
            {availableMetros.map((metro) => (
              <button
                key={metro.slug}
                onClick={() => onViewPricing(metro.slug)}
                className="w-full p-4 bg-[#002125] text-[#CEFDCE] rounded-xl text-left transition-all flex items-center justify-between group hover:bg-[#012E33]"
              >
                <div className="flex items-center gap-3">
                  <svg className="size-5 text-[#98FB98]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span className="font-medium">{metro.name}</span>
                </div>
                <svg className="size-4 text-[#98FB98] group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

export default function Home() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<ProcedureSearchResult | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    <div className="min-h-dvh bg-white text-[#17270C] selection:bg-[#98FB98] selection:text-[#002125]">
      {/* Navigation */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-[#002125] border-b border-[#002125]"
            : "bg-transparent"
        )}
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="group">
            <span className={cn(
              "text-2xl font-semibold group-hover:opacity-80 transition-opacity",
            )}>
              <span className={isScrolled ? "text-white" : "text-[#17270C]"}>Just</span>
              <span className={isScrolled ? "text-[#98FB98]" : "text-[#5A9A6B]"}>Price</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/query"
              className={cn(
                "text-sm transition-colors font-medium no-underline",
                isScrolled ? "text-white/70 hover:text-white" : "text-[#6B7280] hover:text-[#17270C]"
              )}
            >
              Price Search
            </Link>
            <Link
              href="/bill-buster"
              className={cn(
                "text-sm transition-colors font-medium no-underline",
                isScrolled ? "text-white/70 hover:text-white" : "text-[#6B7280] hover:text-[#17270C]"
              )}
            >
              Lower My Bill
            </Link>
            <Link
              href="/pricing"
              className={cn(
                "text-sm transition-colors font-medium no-underline",
                isScrolled ? "text-white/70 hover:text-white" : "text-[#6B7280] hover:text-[#17270C]"
              )}
            >
              Pricing
            </Link>
            <a
              href="#approach"
              className={cn(
                "text-sm transition-colors font-medium no-underline",
                isScrolled ? "text-white/70 hover:text-white" : "text-[#6B7280] hover:text-[#17270C]"
              )}
            >
              How It Works
            </a>
          </div>

          <Link
            href="/query"
            className="btn-primary no-underline"
          >
            <span>Get Started</span>
            <span className="btn-arrow">
              <ArrowIcon />
            </span>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 bg-[#F2FBEF] overflow-hidden">
        {/* Illustration placeholder - top right */}
        <div className="illustration-placeholder w-96 h-96 -top-20 -right-20" />

        <div className="max-w-2xl mx-auto text-center relative">
          {/* Badge */}
          <div className="mb-6 animate-fade-in">
            <span className="badge badge-brand">
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Transparent Healthcare Pricing
            </span>
          </div>

          {/* Headline */}
          <div className="mb-6">
            <h1 className="text-h1 animate-slide-up delay-120">
              See what healthcare
              <br />
              <span className="italic">
                <span className="text-mint">actually</span> costs.
              </span>
            </h1>
          </div>

          {/* Subhead */}
          <div className="mb-10">
            <p className="text-lg md:text-xl text-[#6B7280] leading-relaxed animate-slide-up delay-240">
              Compare real hospital prices. Fight unfair bills.
              <br className="hidden md:block" />
              Finally, transparency in healthcare.
            </p>
          </div>

          {/* Search */}
          <div className="animate-slide-up delay-360">
            <SemanticSearchInput
              onSelect={handleProcedureSelect}
              placeholder="Search for a procedure..."
            />

            {/* Selected Procedure Card */}
            {selectedProcedure && (
              <SelectedProcedureCard
                procedure={selectedProcedure}
                onClear={handleClearSelection}
                onViewPricing={handleViewPricing}
              />
            )}

            {/* Popular Procedures - show when nothing selected */}
            {!selectedProcedure && (
              <div className="mt-6">
                <p className="text-overline mb-3">Popular searches</p>
                <PopularProcedures
                  compact
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
          </div>

          {/* Trust indicators */}
          <div className="relative z-0 mt-10 flex flex-wrap justify-center gap-6 animate-slide-up delay-480">
            {[
              { icon: "M5 13l4 4L19 7", text: "Free to search" },
              { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", text: "No account required" },
              { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", text: "Real hospital prices" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-[#6B7280]">
                <svg className="size-4 text-[#5A9A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 bg-[#E9FAE7]">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                number: "5",
                suffix: "×",
                label: "Price variance",
                desc: "Same procedure, different hospital",
                color: "text-[#002125]"
              },
              {
                number: "80",
                suffix: "%",
                label: "Bills with errors",
                desc: "Average overcharge of $1,300",
                color: "text-[#C4A86B]"
              },
              {
                number: "#1",
                suffix: "",
                label: "Cause of bankruptcy",
                desc: "Medical debt in America",
                color: "text-[#C47B8C]"
              }
            ].map((stat, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className="text-center p-8 rounded-2xl bg-white border border-[#E5E7EB]">
                  <div className={cn("text-h1 mb-4", stat.color)}>
                    <AnimatedNumber value={stat.number} suffix={stat.suffix} />
                  </div>
                  <div className="text-lg font-medium text-[#17270C] mb-2">{stat.label}</div>
                  <div className="text-[#6B7280] text-sm">{stat.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Context Section */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            <Reveal>
              <div className="lg:sticky lg:top-32">
                <span className="badge badge-muted mb-6">The Problem</span>
                <h2 className="text-h2 leading-[1.1]">
                  Hospitals must publish prices.
                  <span className="text-[#6B7280]"> They made it impossible to find.</span>
                </h2>
              </div>
            </Reveal>

            <div className="space-y-6">
              <Reveal delay={120}>
                <div className="p-6 bg-[#F2FBEF] rounded-2xl">
                  <p className="text-lg text-[#6B7280] leading-relaxed">
                    Since 2021, federal law requires every hospital to publish their prices online.
                    But they&apos;ve buried the data in incompatible formats, broken links, and
                    spreadsheets designed to confuse.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={240}>
                <div className="p-6 bg-[#F2FBEF] rounded-2xl">
                  <p className="text-lg text-[#6B7280] leading-relaxed">
                    The same MRI costs <span className="font-semibold text-[#5A9A6B]">$400</span> at one hospital and <span className="font-semibold text-[#C47B8C]">$4,000</span> at another just 20 miles away.
                    The information is technically public but practically invisible.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={360}>
                <div className="p-6 bg-[#002125] rounded-2xl">
                  <p className="text-xl font-medium text-[#CEFDCE]">
                    JustPrice makes it accessible.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Approach Section */}
      <section id="approach" className="py-20 px-4 sm:px-6 bg-[#F2FBEF]">
        <div className="max-w-[1280px] mx-auto">
          <Reveal>
            <div className="mb-16 text-center">
              <span className="text-overline text-[#002125] mb-6 block">
                Our Approach
              </span>
              <h2 className="text-h2 leading-[1.1] max-w-2xl mx-auto text-[#17270C]">
                With you at every step of your healthcare journey
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                phase: "Before Care",
                title: "Know your options",
                desc: "Search any procedure. See what every hospital actually charges. Know when you're being quoted 3× the fair price.",
                icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
                bg: "bg-[#E9FAE7]"
              },
              {
                num: "02",
                phase: "Before You Commit",
                title: "Confirm in writing",
                desc: "We contact providers to confirm prices, request cash-pay alternatives, and find more affordable options nearby.",
                icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                bg: "bg-white"
              },
              {
                num: "03",
                phase: "After Care",
                title: "Fight unfair bills",
                desc: "Upload your bill. We detect errors, identify overcharges, and negotiate with billing departments on your behalf.",
                icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                bg: "bg-white"
              }
            ].map((step, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className={cn("p-8 rounded-2xl h-full border border-[#E5E7EB] hover:border-[#002125] transition-colors", step.bg)}>
                  <div className="size-12 bg-[#002125] rounded-xl flex items-center justify-center mb-6">
                    <svg className="size-6 text-[#98FB98]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                    </svg>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm text-[#002125] font-mono">{step.num}</span>
                    <span className="text-sm text-[#6B7280]">{step.phase}</span>
                  </div>
                  <h3 className="text-h4 mb-4 text-[#17270C]">
                    {step.title}
                  </h3>
                  <p className="text-[#6B7280] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 sm:px-6 bg-[#E9FAE7]">
        <div className="max-w-[1280px] mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal>
              <div className="text-h1 text-[#002125] mb-6">
                <AnimatedNumber value="74" suffix="%" />
              </div>
            </Reveal>
            <Reveal delay={120}>
              <p className="text-2xl md:text-3xl leading-snug mb-6">
                of people who challenge a medical bill
                <br />
                <span className="text-[#6B7280]">get it reduced or corrected</span>
              </p>
            </Reveal>
            <Reveal delay={240}>
              <p className="text-lg text-[#6B7280] max-w-xl mx-auto">
                The problem isn&apos;t that bills can&apos;t be fought—it&apos;s that most people don&apos;t have the time, knowledge, or energy to fight.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Intelligence Section */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
            <Reveal>
              <div>
                <span className="badge badge-brand mb-6">Compounding Intelligence</span>
                <h2 className="text-h2 leading-[1.1] mb-8">
                  Every bill we fight makes us smarter
                </h2>
                <p className="text-lg text-[#6B7280] leading-relaxed mb-10">
                  Every bill we review teaches us which hospitals negotiate, which insurers
                  approve appeals, and what tactics work. This intelligence compounds into
                  an advantage no one else has.
                </p>

                <div className="space-y-3">
                  {[
                    "Pattern recognition across thousands of bills",
                    "Real-time database of negotiation outcomes",
                    "AI that learns what arguments actually work"
                  ].map((item, i) => (
                    <Reveal key={i} delay={i * 120}>
                      <div className="flex items-center gap-4 p-4 bg-[#F2FBEF] rounded-xl border border-[#E5E7EB]">
                        <div className="size-6 bg-[#5A9A6B] rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="size-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-[#17270C] font-medium">{item}</span>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={240}>
              <div className="bg-[#F2FBEF] rounded-2xl p-8 md:p-10 border border-[#E5E7EB]">
                <div className="space-y-4 mb-8">
                  {[
                    { name: "Memorial General", amount: "$2,340", badge: "Verified" },
                    { name: "St. Mary's Medical", amount: "$890", badge: "Best Deal" },
                    { name: "University Health", amount: "$4,120", badge: "Highest" }
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-5 bg-white rounded-xl border border-[#E5E7EB]"
                    >
                      <div>
                        <div className="font-medium text-[#17270C]">{item.name}</div>
                        <div className="text-xs text-[#6B7280] mt-1">Bill reduced</div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "text-xl tabular-nums font-medium",
                          i === 1 ? "text-[#5A9A6B]" : "text-[#17270C]"
                        )}>{item.amount}</div>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          i === 1 ? "bg-[rgba(90,154,107,0.1)] text-[#5A9A6B]" : "bg-[#F9FAFB] text-[#6B7280]"
                        )}>
                          {item.badge}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 pt-6 border-t border-[#E5E7EB]">
                  <span className="text-sm text-[#6B7280]">Learning from every outcome</span>
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="size-1.5 bg-[#002125] rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 bg-[#F2FBEF]">
        <div className="max-w-[1280px] mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal>
              <h2 className="text-h1 leading-[1.1] mb-6">
                Stop overpaying
                <br />
                <span className="italic">
                  for <span className="text-mint">healthcare</span>
                </span>
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="text-xl text-[#6B7280] mb-10">
                Start with a simple search. See what your procedure should actually cost.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <Link
                href="/query"
                className="inline-flex btn-primary px-8 py-3 text-lg no-underline group"
              >
                <span>Search Procedure Prices</span>
                <span className="btn-arrow group-hover:translate-x-0.5 transition-transform">
                  <ArrowIcon className="size-5" />
                </span>
              </Link>
            </Reveal>
            <Reveal delay={360}>
              <p className="mt-8 text-sm text-[#6B7280]">
                Free to search · No account required · Real hospital prices
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 bg-white border-t border-[#E5E7EB]">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <span className="text-xl font-semibold">
                <span className="text-[#17270C]">Just</span>
                <span className="text-[#5A9A6B]">Price</span>
              </span>
            </div>

            <p className="text-sm text-[#6B7280] italic font-serif">
              Know before you owe.
            </p>

            <div className="flex items-center gap-8 text-sm text-[#6B7280]">
              <a href="#" className="hover:text-[#002125] transition-colors no-underline">Privacy</a>
              <a href="#" className="hover:text-[#002125] transition-colors no-underline">Terms</a>
              <a href="#" className="hover:text-[#002125] transition-colors no-underline">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
