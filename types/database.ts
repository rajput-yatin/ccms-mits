export type UserRole = 'student' | 'club_lead' | 'super_admin';

export type ClubCategory =
  | 'Technical'
  | 'Cultural'
  | 'Sports'
  | 'Literary'
  | 'Entrepreneurship';

export type ApplicationStatus =
  | 'Applied'
  | 'Shortlisted'
  | 'Interview Scheduled'
  | 'Accepted'
  | 'Rejected';

export interface ExecMember {
  name: string;
  role: string;
  initials: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  roll_number: string | null;
  branch: string;
  year: string;
  role: UserRole;
  managed_club_id: string | null;
  created_at: string;
}

export interface Club {
  id: string;
  slug: string;
  name: string;
  description: string;
  vision: string;
  category: ClubCategory;
  tags: string[];
  achievements: string[];
  is_recruiting: boolean;
  lead_name: string;
  member_count: number;
  exec_board: ExecMember[];
  created_at: string;
}

export interface Application {
  id: string;
  club_id: string;
  student_id: string | null;
  applicant_name: string;
  roll_number: string;
  branch: string;
  year: string;
  email: string;
  statement: string | null;
  resume_url: string | null;
  status: ApplicationStatus;
  created_at: string;
  clubs?: {
    name: string;
    slug: string;
    category: ClubCategory;
  };
}

export interface Notice {
  id: string;
  club_id: string | null;
  title: string;
  content: string;
  posted_by: string;
  created_at: string;
  clubs?: {
    name: string;
    slug: string;
  } | null;
}

export interface ClubEvent {
  id: string;
  club_id: string;
  title: string;
  description: string;
  event_date: string;
  venue: string;
  created_at: string;
  clubs?: {
    name: string;
    slug: string;
    category: ClubCategory;
  };
}