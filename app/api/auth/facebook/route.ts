import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';

export function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const state   = randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id:     process.env.FACEBOOK_APP_ID!,
    redirect_uri:  `${siteUrl}/api/auth/facebook/callback`,
    scope:         'public_profile',
    response_type: 'code',
    display:       'touch',
    state,
  });

  const res = NextResponse.redirect(`https://www.facebook.com/dialog/oauth?${params}`);
  res.cookies.set('fb_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   300,
    path:     '/',
  });
  return res;
}
