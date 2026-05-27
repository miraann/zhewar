import { createClient } from '@supabase/supabase-js';
import type { BarberProfile, GalleryPhoto } from '@/lib/types';
import ScrollNav      from '@/components/home/ScrollNav';
import HeroSection    from '@/components/home/HeroSection';
import AboutSection   from '@/components/home/AboutSection';
import GallerySection from '@/components/home/GallerySection';
import SocialSection  from '@/components/home/SocialSection';

export const revalidate = 30;

const DEFAULT_PROFILE: BarberProfile = {
  id: '',
  name: 'بەربەری لوکس',
  tagline: 'چاکسازی بەرز بۆ پیاوی مۆدێرن',
  logo_url: null,
  instagram_url: null,
  facebook_url: null,
  whatsapp_number: null,
  tiktok_url: null,
  address: null,
  updated_at: '',
};

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (url, opts) => fetch(url, { ...opts, next: { revalidate: 30 } }) } }
  );

  const [{ data: profileData }, { data: galleryData }] = await Promise.all([
    supabase.from('barber_profile').select('*').single(),
    supabase.from('gallery_photos').select('*').order('sort_order'),
  ]);

  return {
    profile: (profileData as BarberProfile | null) ?? DEFAULT_PROFILE,
    gallery: (galleryData as GalleryPhoto[] | null) ?? [],
  };
}

export default async function HomePage() {
  const { profile, gallery } = await getData();

  return (
    <>
      <ScrollNav profile={profile} />
      <main>
        <section id="home">
          <HeroSection profile={profile} />
        </section>
        <section id="about">
          <AboutSection profile={profile} />
        </section>
        <section id="gallery">
          <GallerySection photos={gallery} />
        </section>
        <section id="connect">
          <SocialSection profile={profile} />
        </section>
      </main>
    </>
  );
}
