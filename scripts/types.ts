import type { City, Source, Category } from "../config";

export interface NormalizedEvent {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:mm:ss
  endTime: string | null;
  city: City;
  venue: string | null;
  url: string;
  source: Source;
  organizer: string | null;
  imageUrl: string | null;
}

export interface CategorizedEvent extends NormalizedEvent {
  categories: Category[];
}
