import type { EventCategory } from "./types";

export const CATEGORY_META: Record<
  EventCategory,
  { label: string; short: string; color: string; text: string; description: string }
> = {
  social: {
    label: "Social play",
    short: "Social",
    color: "#D8F26A",
    text: "#123B2C",
    description: "Open play, drop-in sessions and rotating doubles",
  },
  casual: {
    label: "Casual games",
    short: "Casual",
    color: "#CDE7BE",
    text: "#123B2C",
    description: "Community games and friendly matches",
  },
  tournament: {
    label: "Tournaments",
    short: "Tournament",
    color: "#FF6B4A",
    text: "#4A1508",
    description: "Local, regional and sanctioned competitions",
  },
  league: {
    label: "Leagues",
    short: "League",
    color: "#C9BEF6",
    text: "#2A1F55",
    description: "Weekly fixtures, ladders and seasonal competitions",
  },
  coaching: {
    label: "Coaching",
    short: "Coaching",
    color: "#A8D8F0",
    text: "#0D3346",
    description: "Group lessons, clinics and skills sessions",
  },
  intro: {
    label: "Introductory sessions",
    short: "Intro",
    color: "#F7D9A0",
    text: "#4A3208",
    description: "Come-and-try days and beginner introductions",
  },
  special: {
    label: "Special events",
    short: "Special",
    color: "#F4A7B9",
    text: "#4A1224",
    description: "Charity days, mixers and one-off events",
  },
  junior: {
    label: "Junior events",
    short: "Junior",
    color: "#BFE8D8",
    text: "#0F3B2E",
    description: "Programs and competitions for young players",
  },
  senior: {
    label: "Senior events",
    short: "Senior",
    color: "#E8DCC0",
    text: "#43391C",
    description: "Age-restricted tournaments and social sessions",
  },
  "court-hire": {
    label: "Court hire",
    short: "Court hire",
    color: "#D9DEE3",
    text: "#26303A",
    description: "Bookable courts, not organised games",
  },
  other: {
    label: "Other",
    short: "Other",
    color: "#E3E0D6",
    text: "#3A3A2E",
    description: "Meetings and other pickleball activity",
  },
};

export const HERO_CATEGORIES: EventCategory[] = ["social", "tournament", "coaching", "league"];

export function categoryMeta(category: EventCategory) {
  return CATEGORY_META[category] ?? CATEGORY_META.other;
}
