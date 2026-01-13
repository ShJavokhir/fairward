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
      <div className="flex flex-wrap gap-2 justify-center">
        {POPULAR_PROCEDURES.slice(0, 6).map((procedure) => (
          <button
            key={procedure.id}
            onClick={() => onSelect(procedure)}
            className="px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-full text-sm text-[#6B7280] hover:border-[#002125]/40 hover:text-[#002125] hover:bg-[#E9FAE7] transition-all"
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
      <p className="text-overline mb-4">{title}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {POPULAR_PROCEDURES.map((procedure) => (
          <button
            key={procedure.id}
            onClick={() => onSelect(procedure)}
            className="p-4 bg-white border border-[#E5E7EB] rounded-xl text-left hover:border-[#002125]/30 transition-all group"
          >
            <span className="text-2xl mb-2 block">{procedure.icon}</span>
            <p className="font-medium text-[#17270C] text-sm group-hover:text-[#002125] transition-colors">
              {procedure.name}
            </p>
            <p className="text-xs text-[#6B7280] capitalize mt-1">
              {procedure.category}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
