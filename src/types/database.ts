export interface Profile {
  id: string;
  email: string;
  full_name: string;
  membership_code: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string | null;
  location_secret: boolean;
  lineup: string[];
  cover_image: string | null;
  is_published: boolean;
  early_access_until: string | null;
  capacity: number | null;
  created_at: string;
  updated_at: string;
}

export interface RSVP {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  event_id: string;
  user_id: string;
  checked_in_at: string;
  checked_in_by: string;
}

export interface EventMedia {
  id: string;
  event_id: string;
  url: string;
  type: "photo" | "video";
  caption: string | null;
  order: number;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
}
