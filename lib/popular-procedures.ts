// Curated list of popular medical procedures
export interface PopularProcedure {
  id: string;
  name: string;
  category: string;
  icon: string; // emoji for visual appeal
}

export const POPULAR_PROCEDURES: PopularProcedure[] = [
  { id: "mri_spine", name: "MRI (Spine)", category: "diagnostic", icon: "🔬" },
  { id: "mri_brain", name: "MRI (Brain)", category: "diagnostic", icon: "🧠" },
  { id: "ct_scan_abdomen", name: "CT Scan (Abdomen)", category: "diagnostic", icon: "📷" },
  { id: "colonoscopy", name: "Colonoscopy", category: "gastrointestinal", icon: "🏥" },
  { id: "knee_replacement", name: "Knee Replacement", category: "orthopedic", icon: "🦵" },
  { id: "hip_replacement", name: "Hip Replacement", category: "orthopedic", icon: "🦴" },
  { id: "cataract_surgery", name: "Cataract Surgery", category: "ophthalmology", icon: "👁️" },
  { id: "mammogram", name: "Mammogram", category: "diagnostic", icon: "💗" },
];
