export interface Customer {
  id: string;
  full_name: string;
  phone_number: string;
  photo_url: string | null;
  facebook_id: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export interface Appointment {
  id: string;
  customer_id: string;
  service_id: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

export interface AppointmentFull extends Appointment {
  customers: { full_name: string; phone_number: string; photo_url: string | null; facebook_id: string | null };
  services: { name: string; duration: number; price: number };
}

export interface WorkingSchedule {
  id: string;
  day_of_week: number; // 0 = Sun … 6 = Sat
  is_active: boolean;
  start_time: string;  // "HH:MM"
  end_time: string;    // "HH:MM"
  slot_interval: number; // minutes
}

export interface BlockedDate {
  id: string;
  blocked_date: string; // "YYYY-MM-DD"
  reason: string | null;
  created_at: string;
}

export interface BarberProfile {
  id: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  whatsapp_number: string | null;
  tiktok_url: string | null;
  maps_url: string | null;
  address: string | null;
  updated_at: string;
}

export interface SocialLink {
  id: string;
  title: string;
  image_url: string | null;
  url: string;
  sort_order: number;
  created_at: string;
}

export interface GalleryPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      customers:        { Row: Customer;       Insert: Omit<Customer, 'id'|'created_at'>;       Update: Partial<Omit<Customer, 'id'|'created_at'>>       };
      services:         { Row: Service;        Insert: Omit<Service, 'id'>;                     Update: Partial<Omit<Service, 'id'>>                     };
      appointments:     { Row: Appointment;    Insert: Omit<Appointment, 'id'|'created_at'>;    Update: Partial<Omit<Appointment, 'id'|'created_at'>>    };
      working_schedule: { Row: WorkingSchedule;Insert: Omit<WorkingSchedule, 'id'>;             Update: Partial<Omit<WorkingSchedule, 'id'>>             };
      blocked_dates:    { Row: BlockedDate;    Insert: Omit<BlockedDate, 'id'|'created_at'>;    Update: Partial<Omit<BlockedDate, 'id'|'created_at'>>    };
      barber_profile:   { Row: BarberProfile;  Insert: Omit<BarberProfile, 'id'|'updated_at'>; Update: Partial<Omit<BarberProfile, 'id'|'updated_at'>>  };
      gallery_photos:   { Row: GalleryPhoto;   Insert: Omit<GalleryPhoto, 'id'|'created_at'>;  Update: Partial<Omit<GalleryPhoto, 'id'|'created_at'>>   };
    };
  };
};
