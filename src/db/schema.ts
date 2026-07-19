// ---------------------------------------------------------------------------
// Litter Lab Pro — Database Schema
// All CREATE TABLE statements and corresponding TypeScript interfaces.
// ---------------------------------------------------------------------------

// ── Dogs ───────────────────────────────────────────────────────────────────
export const CREATE_DOGS = `
CREATE TABLE IF NOT EXISTS dogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT,
  sex TEXT NOT NULL CHECK(sex IN ('male','female')),
  birthdate TEXT,
  microchip TEXT,
  registration TEXT,
  photo_uri TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`;

export interface Dog {
  id: number;
  name: string;
  color: string | null;
  sex: 'male' | 'female';
  birthdate: string | null;
  microchip: string | null;
  registration: string | null;
  photo_uri: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// ── Heat Cycles ────────────────────────────────────────────────────────────
export const CREATE_HEAT_CYCLES = `
CREATE TABLE IF NOT EXISTS heat_cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT,
  symptoms TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface HeatCycle {
  id: number;
  dog_id: number;
  start_date: string;
  end_date: string | null;
  symptoms: string | null;
  notes: string | null;
  created_at: string;
}

// ── Progesterone Tests ─────────────────────────────────────────────────────
export const CREATE_PROGESTERONE_TESTS = `
CREATE TABLE IF NOT EXISTS progesterone_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  heat_cycle_id INTEGER NOT NULL REFERENCES heat_cycles(id) ON DELETE CASCADE,
  test_date TEXT NOT NULL,
  result_level REAL,
  unit TEXT DEFAULT 'ng/mL',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface ProgesteroneTest {
  id: number;
  heat_cycle_id: number;
  test_date: string;
  result_level: number | null;
  unit: string;
  notes: string | null;
  created_at: string;
}

// ── Breedings ──────────────────────────────────────────────────────────────
export const CREATE_BREEDINGS = `
CREATE TABLE IF NOT EXISTS breedings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  heat_cycle_id INTEGER NOT NULL REFERENCES heat_cycles(id) ON DELETE CASCADE,
  breeding_date TEXT NOT NULL,
  method TEXT CHECK(method IN ('natural','AI')),
  stud_name TEXT,
  stud_details TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface Breeding {
  id: number;
  heat_cycle_id: number;
  breeding_date: string;
  method: 'natural' | 'AI' | null;
  stud_name: string | null;
  stud_details: string | null;
  notes: string | null;
  created_at: string;
}

// ── Litters ────────────────────────────────────────────────────────────────
export const CREATE_LITTERS = `
CREATE TABLE IF NOT EXISTS litters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  breeding_id INTEGER REFERENCES breedings(id),
  dam_id INTEGER NOT NULL REFERENCES dogs(id),
  sire_id INTEGER REFERENCES dogs(id),
  whelping_date TEXT,
  whelping_type TEXT CHECK(whelping_type IN ('natural','c-section')),
  total_puppies INTEGER,
  stillborns INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface Litter {
  id: number;
  breeding_id: number | null;
  dam_id: number;
  sire_id: number | null;
  whelping_date: string | null;
  whelping_type: 'natural' | 'c-section' | null;
  total_puppies: number | null;
  stillborns: number | null;
  notes: string | null;
  created_at: string;
}

// ── Puppies ────────────────────────────────────────────────────────────────
export const CREATE_PUPPIES = `
CREATE TABLE IF NOT EXISTS puppies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  litter_id INTEGER NOT NULL REFERENCES litters(id) ON DELETE CASCADE,
  name_or_id TEXT,
  sex TEXT CHECK(sex IN ('male','female')),
  color TEXT,
  birth_weight_grams REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface Puppy {
  id: number;
  litter_id: number;
  name_or_id: string | null;
  sex: 'male' | 'female' | null;
  color: string | null;
  birth_weight_grams: number | null;
  notes: string | null;
  created_at: string;
}

// ── Weight Entries ─────────────────────────────────────────────────────────
export const CREATE_WEIGHT_ENTRIES = `
CREATE TABLE IF NOT EXISTS weight_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  puppy_id INTEGER NOT NULL REFERENCES puppies(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  weight_grams REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface WeightEntry {
  id: number;
  puppy_id: number;
  date: string;
  weight_grams: number;
  created_at: string;
}

// ── Feeding Logs ───────────────────────────────────────────────────────────
export const CREATE_FEEDING_LOGS = `
CREATE TABLE IF NOT EXISTS feeding_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  puppy_id INTEGER NOT NULL REFERENCES puppies(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  feed_type TEXT CHECK(feed_type IN ('bottle','gruel','solid')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface FeedingLog {
  id: number;
  puppy_id: number;
  date: string;
  feed_type: 'bottle' | 'gruel' | 'solid' | null;
  notes: string | null;
  created_at: string;
}

// ── Health Notes ───────────────────────────────────────────────────────────
export const CREATE_HEALTH_NOTES = `
CREATE TABLE IF NOT EXISTS health_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  puppy_id INTEGER NOT NULL REFERENCES puppies(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface HealthNote {
  id: number;
  puppy_id: number;
  date: string;
  description: string;
  created_at: string;
}

// ── Milestones ─────────────────────────────────────────────────────────────
export const CREATE_MILESTONES = `
CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  litter_id INTEGER REFERENCES litters(id) ON DELETE CASCADE,
  puppy_id INTEGER REFERENCES puppies(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date TEXT,
  completed_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface Milestone {
  id: number;
  litter_id: number | null;
  puppy_id: number | null;
  milestone_type: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

// ── Photos ─────────────────────────────────────────────────────────────────
export const CREATE_PHOTOS = `
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('dog','litter','puppy')),
  entity_id INTEGER NOT NULL,
  photo_uri TEXT NOT NULL,
  caption TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface Photo {
  id: number;
  entity_type: 'dog' | 'litter' | 'puppy';
  entity_id: number;
  photo_uri: string;
  caption: string | null;
  created_at: string;
}

// ── Buyers ─────────────────────────────────────────────────────────────────
export const CREATE_BUYERS = `
CREATE TABLE IF NOT EXISTS buyers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface Buyer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

// ── Placements ─────────────────────────────────────────────────────────────
export const CREATE_PLACEMENTS = `
CREATE TABLE IF NOT EXISTS placements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  puppy_id INTEGER NOT NULL REFERENCES puppies(id),
  buyer_id INTEGER NOT NULL REFERENCES buyers(id),
  status TEXT DEFAULT 'pending',
  deposit_amount REAL,
  price REAL,
  pickup_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface Placement {
  id: number;
  puppy_id: number;
  buyer_id: number;
  status: string;
  deposit_amount: number | null;
  price: number | null;
  pickup_date: string | null;
  notes: string | null;
  created_at: string;
}

// ── Expenses ───────────────────────────────────────────────────────────────
export const CREATE_EXPENSES = `
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  litter_id INTEGER NOT NULL REFERENCES litters(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface Expense {
  id: number;
  litter_id: number;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
}

// ── Health Clearances ──────────────────────────────────────────────────────
export const CREATE_HEALTH_CLEARANCES = `
CREATE TABLE IF NOT EXISTS health_clearances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  test_date TEXT,
  result TEXT,
  expiry_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface HealthClearance {
  id: number;
  dog_id: number;
  test_type: string;
  test_date: string | null;
  result: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
}

// ── Contracts ──────────────────────────────────────────────────────────────
export const CREATE_CONTRACTS = `
CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  placement_id INTEGER REFERENCES placements(id),
  template_type TEXT,
  content TEXT,
  generated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export interface Contract {
  id: number;
  placement_id: number | null;
  template_type: string | null;
  content: string | null;
  generated_at: string;
  created_at: string;
}

// ── All CREATE statements in order (for init) ──────────────────────────────
export const ALL_CREATE_STATEMENTS = [
  CREATE_DOGS,
  CREATE_HEAT_CYCLES,
  CREATE_PROGESTERONE_TESTS,
  CREATE_BREEDINGS,
  CREATE_LITTERS,
  CREATE_PUPPIES,
  CREATE_WEIGHT_ENTRIES,
  CREATE_FEEDING_LOGS,
  CREATE_HEALTH_NOTES,
  CREATE_MILESTONES,
  CREATE_PHOTOS,
  CREATE_BUYERS,
  CREATE_PLACEMENTS,
  CREATE_EXPENSES,
  CREATE_HEALTH_CLEARANCES,
  CREATE_CONTRACTS,
];
