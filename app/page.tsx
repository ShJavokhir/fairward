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
      className={`transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
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
      className={`transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
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
    <div ref={containerRef} className="relative">
      {/* Input Field */}
      <div className={`relative transition-all duration-300 ${isOpen ? "ring-2 ring-[#1a1a1a] ring-offset-2 rounded-full" : ""}`}>
        <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
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
          className="w-full pl-14 pr-12 py-4 bg-white border border-[#1a1a1a]/10 rounded-full text-lg focus:outline-none transition-colors placeholder:text-[#1a1a1a]/30"
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
            className="absolute right-6 top-1/2 -translate-y-1/2 p-1 hover:bg-[#1a1a1a]/5 rounded-full transition-colors"
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
    <div className="mt-8 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-[#1a1a1a]/10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs tracking-[0.15em] uppercase text-[#1a1a1a]/40 mb-2">Selected</p>
          <h3 className="font-display text-xl text-[#1a1a1a]">{procedure.name}</h3>
          <p className="text-sm text-[#1a1a1a]/50 mt-1 capitalize">{procedure.category}</p>
        </div>
        <button
          onClick={onClear}
          className="p-2 hover:bg-[#1a1a1a]/5 rounded-lg transition-colors"
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
              <span key={keyword} className="px-2.5 py-1 bg-[#1a1a1a]/5 text-[#1a1a1a]/60 text-xs rounded-full">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs text-[#1a1a1a]/40 mb-3">Select location to view prices</p>
        {availableMetros.length === 0 ? (
          <p className="text-sm text-[#1a1a1a]/50 italic">Not available in any location yet</p>
        ) : (
          <div className="grid gap-2">
            {availableMetros.map((metro) => (
              <button
                key={metro.slug}
                onClick={() => onViewPricing(metro.slug)}
                className="w-full p-4 bg-[#1a1a1a] hover:bg-[#333] text-white rounded-xl text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span className="font-medium">{metro.name}</span>
                </div>
                <svg className="w-4 h-4 text-white/50 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="min-h-screen bg-[#FAFAF8] text-[#1a1a1a] selection:bg-[#1a1a1a] selection:text-white">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-[#FAFAF8]/90 backdrop-blur-md border-b border-[#1a1a1a]/5"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <Link href="/" className="group">
            <img
              src="/justprice-logo.jpeg"
              alt="JustPrice"
              className="h-10 w-auto group-hover:opacity-80 transition-opacity duration-300"
            />
          </Link>

          <div className="hidden md:flex items-center gap-12">
            <Link
              href="/query"
              className="text-sm text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors duration-300"
            >
              Search Prices
            </Link>
            <a
              href="#approach"
              className="text-sm text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors duration-300"
            >
              How It Works
            </a>
          </div>

          <Link
            href="/query"
            className="px-5 py-2.5 bg-[#1a1a1a] text-white text-sm font-medium rounded-full hover:bg-[#333] transition-colors duration-300"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-2xl mx-auto text-center">
          {/* Headline */}
          <div className="mb-6">
            <h1 className="font-display text-4xl md:text-5xl font-normal leading-[1.15] tracking-[-0.02em] animate-fade-in-up">
              See what healthcare
              <br />
              <span className="italic">actually costs.</span>
            </h1>
          </div>

          {/* Subhead */}
          <div className="overflow-hidden mb-10">
            <p className="text-lg text-[#1a1a1a]/50 leading-relaxed animate-fade-in-up animation-delay-100">
              Compare real hospital prices. Fight unfair bills.
            </p>
          </div>

          {/* Search */}
          <div className="animate-fade-in-up animation-delay-200">
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
          </div>

          {/* Trust indicators */}
          <p className="mt-8 text-xs text-[#1a1a1a]/30 animate-fade-in-up animation-delay-300">
            Free to search · No account required · Real hospital prices
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 px-6 md:px-12 border-t border-[#1a1a1a]/5">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8">
            {[
              {
                number: "5",
                suffix: "×",
                label: "Price variance",
                desc: "Same procedure, different hospital"
              },
              {
                number: "80",
                suffix: "%",
                label: "Bills with errors",
                desc: "Average overcharge of $1,300"
              },
              {
                number: "#1",
                suffix: "",
                label: "Cause of bankruptcy",
                desc: "Medical debt in America"
              }
            ].map((stat, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="group">
                  <div className="font-display text-[clamp(4rem,10vw,7rem)] font-normal leading-none tracking-tight mb-4">
                    <AnimatedNumber value={stat.number} suffix={stat.suffix} />
                  </div>
                  <div className="text-lg font-medium mb-2">{stat.label}</div>
                  <div className="text-[#1a1a1a]/40 text-sm">{stat.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Context Section */}
      <section className="py-32 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-start">
            <Reveal>
              <div className="lg:sticky lg:top-32">
                <p className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a]/40 mb-6">
                  The Problem
                </p>
                <h2 className="font-display text-4xl md:text-5xl font-normal leading-[1.1] tracking-tight">
                  Hospitals must publish prices.
                  <span className="text-[#1a1a1a]/30"> They made it impossible to find.</span>
                </h2>
              </div>
            </Reveal>

            <div className="space-y-8">
              <Reveal delay={100}>
                <p className="text-lg text-[#1a1a1a]/60 leading-relaxed">
                  Since 2021, federal law requires every hospital to publish their prices online.
                  But they&apos;ve buried the data in incompatible formats, broken links, and
                  spreadsheets designed to confuse.
                </p>
              </Reveal>
              <Reveal delay={200}>
                <p className="text-lg text-[#1a1a1a]/60 leading-relaxed">
                  The same MRI costs $400 at one hospital and $4,000 at another just 20 miles away.
                  The information is technically public but practically invisible.
                </p>
              </Reveal>
              <Reveal delay={300}>
                <p className="text-xl font-medium">
                  JustPrice makes it accessible.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Approach Section */}
      <section id="approach" className="py-32 px-6 md:px-12 bg-[#1a1a1a] text-white">
        <div className="max-w-[1400px] mx-auto">
          <Reveal>
            <div className="mb-24">
              <p className="text-sm tracking-[0.2em] uppercase text-white/40 mb-6">
                Our Approach
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-normal leading-[1.1] tracking-tight max-w-2xl">
                With you at every step of your healthcare journey
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10">
            {[
              {
                num: "01",
                phase: "Before Care",
                title: "Know your options",
                desc: "Search any procedure. See what every hospital actually charges. Know when you're being quoted 3× the fair price."
              },
              {
                num: "02",
                phase: "Before You Commit",
                title: "Confirm in writing",
                desc: "We contact providers to confirm prices, request cash-pay alternatives, and find more affordable options nearby."
              },
              {
                num: "03",
                phase: "After Care",
                title: "Fight unfair bills",
                desc: "Upload your bill. We detect errors, identify overcharges, and negotiate with billing departments on your behalf."
              }
            ].map((step, i) => (
              <Reveal key={i} delay={i * 150}>
                <div className="bg-[#1a1a1a] p-8 md:p-12 h-full">
                  <div className="flex items-baseline gap-4 mb-8">
                    <span className="text-sm text-white/30 font-mono">{step.num}</span>
                    <span className="text-sm text-white/50">{step.phase}</span>
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl font-normal mb-6">
                    {step.title}
                  </h3>
                  <p className="text-white/50 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-32 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <Reveal>
              <div className="font-display text-[clamp(5rem,15vw,12rem)] font-normal leading-none tracking-tight mb-8">
                <AnimatedNumber value="74" suffix="%" />
              </div>
            </Reveal>
            <Reveal delay={100}>
              <p className="text-2xl md:text-3xl font-display leading-snug mb-8">
                of people who challenge a medical bill
                <br />
                <span className="text-[#1a1a1a]/40">get it reduced or corrected</span>
              </p>
            </Reveal>
            <Reveal delay={200}>
              <p className="text-lg text-[#1a1a1a]/50 max-w-xl mx-auto">
                The problem isn&apos;t that bills can&apos;t be fought—it&apos;s that most people don&apos;t have the time, knowledge, or energy to fight.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Intelligence Section */}
      <section className="py-32 px-6 md:px-12 border-t border-[#1a1a1a]/5">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32">
            <Reveal>
              <div>
                <p className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a]/40 mb-6">
                  Compounding Intelligence
                </p>
                <h2 className="font-display text-4xl md:text-5xl font-normal leading-[1.1] tracking-tight mb-8">
                  Every bill we fight makes us smarter
                </h2>
                <p className="text-lg text-[#1a1a1a]/60 leading-relaxed mb-12">
                  Every bill we review teaches us which hospitals negotiate, which insurers
                  approve appeals, and what tactics work. This intelligence compounds into
                  an advantage no one else has.
                </p>

                <div className="space-y-6">
                  {[
                    "Pattern recognition across thousands of bills",
                    "Real-time database of negotiation outcomes",
                    "AI that learns what arguments actually work"
                  ].map((item, i) => (
                    <Reveal key={i} delay={i * 100}>
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full" />
                        <span className="text-base">{item}</span>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="bg-[#F5F5F3] rounded-2xl p-8 md:p-12">
                <div className="space-y-4 mb-8">
                  {[
                    { name: "Memorial General", amount: "$2,340" },
                    { name: "St. Mary's Medical", amount: "$890" },
                    { name: "University Health", amount: "$4,120" }
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-4 border-b border-[#1a1a1a]/5 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-[#1a1a1a]/40 mt-0.5">Bill reduced</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-xl">{item.amount}</div>
                        <div className="text-xs text-[#1a1a1a]/40 mt-0.5">saved</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 pt-4 border-t border-[#1a1a1a]/5">
                  <span className="text-xs text-[#1a1a1a]/40">Learning from every outcome</span>
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 h-1 bg-[#1a1a1a]/20 rounded-full animate-pulse"
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
      <section className="py-32 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal>
              <h2 className="font-display text-4xl md:text-6xl font-normal leading-[1.1] tracking-tight mb-8">
                Stop overpaying
                <br />
                <span className="italic">for healthcare</span>
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="text-xl text-[#1a1a1a]/50 mb-12">
                Start with a simple search. See what your procedure should actually cost.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <Link
                href="/query"
                className="inline-flex items-center gap-3 px-10 py-5 bg-[#1a1a1a] text-white text-lg font-medium rounded-full hover:bg-[#333] transition-all duration-300 hover:shadow-xl hover:shadow-[#1a1a1a]/10 active:scale-[0.98] group"
              >
                <span>Search Procedure Prices</span>
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </Reveal>
            <Reveal delay={300}>
              <p className="mt-10 text-sm text-[#1a1a1a]/40">
                Free to search · No account required · Real hospital prices
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 md:px-12 border-t border-[#1a1a1a]/5">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <img
                src="/justprice-logo.jpeg"
                alt="JustPrice"
                className="h-8 w-auto"
              />
            </div>

            <p className="text-sm text-[#1a1a1a]/40 italic">
              Know before you owe.
            </p>

            <div className="flex items-center gap-8 text-sm text-[#1a1a1a]/40">
              <a href="#" className="hover:text-[#1a1a1a] transition-colors duration-300">Privacy</a>
              <a href="#" className="hover:text-[#1a1a1a] transition-colors duration-300">Terms</a>
              <a href="#" className="hover:text-[#1a1a1a] transition-colors duration-300">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
