"use client";

import { POPULAR_PROCEDURES, PopularProcedure } from "@/lib/popular-procedures";

interface PopularProceduresProps {
  onSelect: (procedure: PopularProcedure) => void;
  title?: string;
  compact?: boolean;
}

export default function PopularProcedures({
  onSelect,
  title = "Popular Procedures",
  compact = false,
}: PopularProceduresProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {POPULAR_PROCEDURES.slice(0, 6).map((procedure) => (
          <button
            key={procedure.id}
            onClick={() => onSelect(procedure)}
            className="px-3 py-1.5 bg-white border border-[#1a1a1a]/10 rounded-full text-sm text-[#1a1a1a]/70 hover:border-[#1a1a1a]/30 hover:text-[#1a1a1a] transition-all"
          >
            <span className="mr-1.5">{procedure.icon}</span>
            {procedure.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs tracking-[0.15em] uppercase text-[#1a1a1a]/40 mb-4">
        {title}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {POPULAR_PROCEDURES.map((procedure) => (
          <button
            key={procedure.id}
            onClick={() => onSelect(procedure)}
            className="p-4 bg-white border border-[#1a1a1a]/5 rounded-xl text-left hover:border-[#1a1a1a]/20 hover:shadow-sm transition-all group"
          >
            <span className="text-2xl mb-2 block">{procedure.icon}</span>
            <p className="font-medium text-[#1a1a1a] text-sm group-hover:text-[#1a1a1a] transition-colors">
              {procedure.name}
            </p>
            <p className="text-xs text-[#1a1a1a]/40 capitalize mt-1">
              {procedure.category}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
