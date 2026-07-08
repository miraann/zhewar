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
  name: ' ژێوار محمد',
  tagline: 'شێوازی تۆ، ناسنامەی تۆیە. لێرە کوالێتی و وردەکاری کۆدەبنەوە',
  logo_url: null,
  instagram_url: null,
  facebook_url: null,
  whatsapp_number: null,
  tiktok_url: null,
  maps_url: null,
  address: null,
  face_scan_enabled: true,
  facebook_required: true,
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
      {/* Fixed nav sits above the snap container */}
      <ClientOnly><ScrollNav profile={profile} /></ClientOnly>

      {/*
        Scroll-snap root — fixed to the viewport so the body never scrolls.
        Each child section is exactly h-screen and snap-start.
      */}
      <div
        id="snap-root"
        className="fixed inset-0 z-0 overflow-y-scroll snap-y snap-mandatory scrollbar-none select-none"
      >

        {/* ── 1. Home ───────────────────────────────────────────────────── */}
        <section
          id="home"
          className="relative h-screen w-full snap-start snap-always overflow-hidden"
        >
          <HeroSection profile={profile} />
        </section>

        {/* ── 2. Gallery ────────────────────────────────────────────────── */}
        <section
          id="gallery"
          className="relative h-screen w-full snap-start snap-always overflow-hidden flex flex-col justify-center"
        >
          <ClientOnly><GallerySection photos={gallery} /></ClientOnly>
        </section>

        {/* ── 3. Links / Social Posts ───────────────────────────────────── */}
        <section
          id="links"
          className="relative h-screen w-full snap-start snap-always overflow-hidden flex flex-col justify-center"
        >
          <ClientOnly><LinksSection links={socialLinks} /></ClientOnly>
        </section>

        {/* ── 4. Connect + Footer ───────────────────────────────────────── */}
        <section
          id="connect"
          className="relative h-screen w-full snap-start snap-always flex flex-col overflow-hidden"
        >
          {/* Social links list — internally scrollable on very small screens */}
          <div className="flex-1 overflow-y-auto scrollbar-none">
            <SocialSection profile={profile} />
          </div>

          {/* Footer pinned to the bottom of this last section */}
          <footer dir="rtl" className="relative bg-blue-600 text-white px-4 py-2.5 overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              <div className="absolute inset-0 bg-blue-400/30 rounded-none" style={{ animation: 'footerGlow 2.8s ease-in-out infinite' }} />
              <div className="absolute inset-0 bg-white/5 rounded-none"    style={{ animation: 'footerGlow 2.8s ease-in-out infinite 1.4s' }} />
            </div>
            <style>{`
              @keyframes footerGlow {
                0%, 100% { opacity: 0; }
                50%       { opacity: 1; }
              }
            `}</style>
            <div className="relative max-w-2xl mx-auto flex flex-col items-center gap-0.5 text-center">
              <p className="text-[1rem] font-semibold text-white leading-snug">
                میران بەرزنجی © ٢٠٢٦
              </p>
              <a href="tel:+9647701466787" dir="ltr" className="flex items-center gap-1 text-[0.7rem] text-white leading-snug">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                  <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" />
                </svg>
                0770 146 6787
              </a>
              <p className="text-[0.55rem] text-white leading-snug">Powered by Click Group | Innovation &amp; Excellence</p>
            </div>
          </footer>
        </section>

      </div>
    </>
  );
}
