// Types for procedure search with VoyageAI embeddings

export interface MetroAvailability {
  slug: string;           // e.g., "Los_Angeles"
  name: string;           // e.g., "Los Angeles"
  filePath: string;       // Path to pricing data file
  fileUrl: string;        // GCS URL
}

export interface Procedure {
  id: string;                     // e.g., "knee_replacement"
  name: string;                   // e.g., "Knee Replacement"
  keywords: string[];             // e.g., ["knee", "replacement"]
  searchText: string;             // Combined text used for embedding
  category: ProcedureCategory;    // Auto-detected category
  embedding: number[];            // VoyageAI vector (1024 dimensions)
  metroAreas: MetroAvailability[];
  createdAt: Date;
  updatedAt: Date;
}

export type ProcedureCategory =
  | 'orthopedic'
  | 'cardiac'
  | 'dental'
  | 'gastrointestinal'
  | 'oncology'
  | 'ophthalmology'
  | 'urology'
  | 'neurology'
  | 'obstetrics'
  | 'ent'
  | 'cosmetic'
  | 'diagnostic'
  | 'general';

export interface ProcedureSearchResult {
  id: string;
  name: string;
  score: number;                  // Similarity score (0-1)
  keywords: string[];
  category: ProcedureCategory;
  metroAvailability: {
    slug: string;
    name: string;
    available: boolean;
  }[];
}

export interface ProcedureSearchResponse {
  results: ProcedureSearchResult[];
  query: string;
  totalFound: number;
  metros: string[];
  searchTimeMs: number;
}

export interface ProcedureSuggestion {
  id: string;
  name: string;
  category: ProcedureCategory;
  matchScore: number;
}

export interface ProcedureSuggestResponse {
  suggestions: ProcedureSuggestion[];
  query: string;
}

// Raw data from the manifest JSON
export interface RawProcedureData {
  id: string;
  name: string;
  keywords: string[];
  files: {
    public?: {
      path: string;
      url: string;
    };
  };
}

export interface RawMetroArea {
  name: string;
  slug: string;
  results_base_path: string;
  procedure_count: number;
  procedures: RawProcedureData[];
}

export interface ProcedureManifest {
  version: string;
  generated_at: string;
  metro_count: number;
  total_procedures: number;
  metro_areas: RawMetroArea[];
}

// Category detection configuration
export const PROCEDURE_CATEGORIES: Record<ProcedureCategory, string[]> = {
  orthopedic: [
    'knee', 'hip', 'shoulder', 'ankle', 'bone', 'fracture', 'arthroscopy',
    'rotator', 'meniscus', 'acl', 'spinal', 'lumbar', 'cervical', 'fusion',
    'joint', 'replacement', 'discectomy', 'carpal', 'trigger_finger', 'bunion',
    'clavicle', 'achilles'
  ],
  cardiac: [
    'heart', 'cardiac', 'cardiovascular', 'pacemaker', 'stent', 'valve',
    'ablation', 'bypass', 'catheterization', 'echocardiogram', 'ekg',
    'cardioversion', 'aneurysm', 'carotid', 'atrial', 'holter', 'stress_test'
  ],
  dental: [
    'tooth', 'dental', 'root_canal', 'wisdom', 'crown', 'bridge', 'implant',
    'gum', 'extraction'
  ],
  gastrointestinal: [
    'colonoscopy', 'endoscopy', 'gastric', 'bowel', 'colon', 'gallbladder',
    'hernia', 'hemorrhoid', 'appendectomy', 'esophageal', 'liver', 'pancreatic'
  ],
  oncology: [
    'tumor', 'biopsy', 'mastectomy', 'lumpectomy', 'melanoma', 'chemotherapy',
    'radiation', 'basal_cell', 'port_placement'
  ],
  ophthalmology: [
    'eye', 'cataract', 'laser', 'retinal', 'glaucoma', 'corneal', 'strabismus',
    'eyelid'
  ],
  urology: [
    'kidney', 'prostate', 'bladder', 'vasectomy', 'circumcision', 'ureteroscopy',
    'cystoscopy', 'hydrocele', 'varicocele', 'testicular'
  ],
  neurology: [
    'brain', 'nerve', 'spinal_cord', 'deep_brain', 'ventriculoperitoneal',
    'nerve_decompression'
  ],
  obstetrics: [
    'cesarean', 'delivery', 'hysterectomy', 'tubal', 'd_and_c', 'fibroid',
    'ovarian', 'endometrial', 'normal_delivery'
  ],
  ent: [
    'ear', 'tonsil', 'adenoid', 'sinus', 'thyroid', 'cochlear', 'deviated_septum',
    'tympanoplasty', 'tracheostomy', 'parathyroid', 'thyroglossal'
  ],
  cosmetic: [
    'botox', 'facelift', 'rhinoplasty', 'liposuction', 'tummy_tuck',
    'chemical_peel', 'eyelid_surgery', 'breast_reconstruction'
  ],
  diagnostic: [
    'mri', 'ct', 'ultrasound', 'xray', 'pet_scan', 'mammogram', 'screening',
    'test', 'scan', 'bone_density', 'pulmonary_function', 'sleep_study',
    'allergy_testing', 'physical_exam'
  ],
  general: [] // Fallback category
};

/**
 * Auto-detect procedure category based on ID and keywords
 */
export function detectCategory(procedureId: string, keywords: string[]): ProcedureCategory {
  const allText = [procedureId, ...keywords].join(' ').toLowerCase();

  for (const [category, markers] of Object.entries(PROCEDURE_CATEGORIES)) {
    if (category === 'general') continue; // Skip fallback
    if (markers.some(marker => allText.includes(marker.toLowerCase()))) {
      return category as ProcedureCategory;
    }
  }

  return 'general';
}

/**
 * Get category hints for enriching search text
 */
export function getCategoryHints(category: ProcedureCategory): string {
  const hints: Record<ProcedureCategory, string> = {
    orthopedic: 'orthopedic surgery bone joint musculoskeletal',
    cardiac: 'cardiac heart cardiovascular surgery',
    dental: 'dental oral teeth mouth surgery',
    gastrointestinal: 'gastrointestinal digestive stomach intestine surgery',
    oncology: 'oncology cancer tumor malignant treatment',
    ophthalmology: 'ophthalmology eye vision surgery',
    urology: 'urology urinary kidney bladder surgery',
    neurology: 'neurology brain nervous system surgery',
    obstetrics: 'obstetrics gynecology women reproductive surgery',
    ent: 'ent ear nose throat otolaryngology surgery',
    cosmetic: 'cosmetic plastic aesthetic surgery',
    diagnostic: 'diagnostic imaging test screening examination',
    general: 'medical procedure treatment'
  };

  return hints[category];
}
