export type EventCategory =
  | "social"
  | "casual"
  | "tournament"
  | "league"
  | "coaching"
  | "intro"
  | "special"
  | "junior"
  | "senior"
  | "court-hire"
  | "other";

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "all" | "dupr";

export type OccurrenceStatus = "scheduled" | "confirmed" | "full" | "cancelled";

export type RegistrationStatus = "open" | "closed" | "full" | "waitlist" | "unknown";

export interface Occurrence {
  id: string;
  start: string;
  end: string;
  status: OccurrenceStatus;
  registrationStatus: RegistrationStatus;
  spotsLeft: number | null;
  sourceId: string;
  sourceOccurrenceId: string | null;
  url: string | null;
  note: string | null;
}

export interface Price {
  amount: number;
  min: number;
  max: number;
  memberAmount: number | null;
  currency: string;
  unit: string;
  notes: string;
  free: boolean;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  suburb: string | null;
  state: string;
  postcode: string | null;
  lat: number | null;
  lng: number | null;
  indoor: boolean | null;
  facilities: string[];
  website?: string | null;
  eventCount?: number;
  eventIds?: string[];
  nextEventAt?: string | null;
  upcomingEvents?: number;
  hasCoordinates?: boolean;
}

export interface Organizer {
  id: string;
  name: string;
  website: string | null;
  description?: string | null;
  verified: boolean;
  sourceIds?: string[];
  eventCount?: number;
  eventIds?: string[];
  nextEventAt?: string | null;
}

export interface EventSourceRef {
  sourceId: string;
  url: string;
  title: string;
  method: string;
  lastChecked: string;
}

export interface PickleballEvent {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  categoryLabel: string;
  summary: string;
  description: string | null;
  descriptionExcerpt: string | null;
  levels: SkillLevel[];
  duprRange: string | null;
  format: string | null;
  indoor: boolean | null;
  ageGroup: string | null;
  gender: string | null;
  price: Price | null;
  venueId: string;
  venue: Venue;
  organizerId: string;
  organizer: Organizer;
  occurrences: Occurrence[];
  sources: EventSourceRef[];
  bookingUrl: string | null;
  officialUrl: string | null;
  membershipRequired: boolean | null;
  equipmentProvided: boolean | null;
  facilities: string[];
  region: string | null;
  recurrenceLabel: string | null;
  status: "scheduled" | "cancelled" | "completed";
  nextStart: string;
  nextEnd: string;
  nextStatus: OccurrenceStatus;
  nextRegistrationStatus: RegistrationStatus;
  nextSpotsLeft?: number | null;
  tournamentTier: string | null;
  sanctioned: boolean | null;
  verified: boolean;
  lastChecked: string;
  sourceCount: number;
  occurrenceCount: number;
  featured: boolean;
  mergedFrom: string[];
  searchText: string;
}

export interface Source {
  id: string;
  name: string;
  homepage: string;
  url: string;
  domain: string;
  region: string;
  type: string;
  method: string;
  policy: "allowed" | "restricted" | "excluded" | "unavailable" | "review";
  policyNote: string;
  refreshHours: number | null;
  status: string;
  lastRun: string | null;
  lastSuccess: string | null;
  eventCount: number;
  recordCount: number;
  consecutiveFailures: number;
  health: string;
  message: string | null;
}

export interface Submission {
  id: string;
  mode: "new" | "report";
  reportEventId: string | null;
  title: string;
  category: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  venue: string;
  address: string;
  suburb: string;
  price: string;
  level: string;
  bookingUrl: string;
  organiser: string;
  email: string;
  description: string;
  createdAt: string;
  status: "pending" | "reviewed" | "rejected";
}

export interface Locality {
  id: string;
  name: string;
  postcode: string;
  region: string;
  lat: number;
  lng: number;
  label: string;
}

export interface Dataset {
  generatedAt: string | null;
  timezone: string;
  region: string;
  events: PickleballEvent[];
  venues: Venue[];
  organizers: Organizer[];
  sources: Source[];
  categories: { id: EventCategory; label: string; count: number }[];
  localities: Locality[];
  stats: {
    events: number;
    occurrences: number;
    venues: number;
    organizers: number;
    sources: number;
    rawListings: number;
    staleSources: number;
    thisWeek: number;
    free: number;
    withCoordinates: number;
    weeklyRecurring: number;
    byCategory: Record<string, number>;
    byRegion: Record<string, number>;
  };
  dataQuality: Record<string, number>;
}

export interface EventQuery {
  q?: string;
  locality?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  from?: string;
  to?: string;
  category?: EventCategory | "all";
  level?: SkillLevel | "all";
  dupr?: number;
  day?: string;
  session?: "morning" | "afternoon" | "evening" | "all";
  indoor?: "indoor" | "outdoor" | "all";
  price?: "free" | "paid" | "all";
  membership?: "open" | "members" | "all";
  sort?: "relevance" | "soonest" | "closest" | "price";
  page?: number;
  limit?: number;
  ids?: string[];
  venueId?: string;
  organizerId?: string;
}
