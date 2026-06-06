import HeroSection from '@/components/home/HeroSection';
import SocialSection from '@/components/home/SocialSection';
import ScrollNav from '@/components/home/ScrollNav';
import GallerySection from '@/components/home/GallerySection';
import LinksSection from '@/components/home/LinksSection';
import ClientOnly from '@/components/ClientOnly';
import type { BarberProfile, GalleryPhoto, SocialLink } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 30;

const DEFAULT_PROFILE: BarberProfile = {
  id: '',
  name: 'بەربەری لوکس',
  tagline: 'شێوازی تۆ، ناسنامەی تۆیە. لێرە کوالێتی و وردەکاری کۆدەبنەوە',
  logo_url: null,
  instagram_url: null,
  facebook_url: null,
  whatsapp_number: null,
  tiktok_url: null,
  maps_url: null,
  address: null,
  updated_at: '',
};

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (url, opts) => fetch(url, { ...opts, next: { revalidate: 30 } }) } }
  );

  const [{ data: profileData }, { data: galleryData }, { data: socialData }] = await Promise.all([
    supabase.from('barber_profile').select('*').single(),
    supabase.from('gallery_photos').select('*').order('sort_order'),
    supabase.from('social_links').select('*').order('sort_order'),
  ]);

  return {
    profile:     (profileData as BarberProfile | null) ?? DEFAULT_PROFILE,
    gallery:     (galleryData as GalleryPhoto[] | null) ?? [],
    socialLinks: (socialData as SocialLink[] | null) ?? [],
  };
}

export default async function HomePage() {
  const { profile, gallery, socialLinks } = await getData();

  return (
    <>
      <ClientOnly><ScrollNav profile={profile} /></ClientOnly>
      <main>
        <section id="home">
          <HeroSection profile={profile} />
        </section>
        <section id="gallery">
          <ClientOnly><GallerySection photos={gallery} /></ClientOnly>
        </section>
        <section id="links">
          <ClientOnly><LinksSection links={socialLinks} /></ClientOnly>
        </section>
        <section id="connect">
          <SocialSection profile={profile} />
        </section>
      </main>
    </>
  );
}
