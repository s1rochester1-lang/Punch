export type Role = "manager" | "employee";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  hourly_rate: number;
}

export interface TimeEntry {
  id: string;
  employee_id: string;
  clock_in: string; // ISO timestamp
  clock_out: string | null; // ISO timestamp, null while clocked in
  source: "self" | "manager";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
