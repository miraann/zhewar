import { NextResponse } from 'next/server';

export function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const params = new URLSearchParams({
    client_id:     process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!,
    redirect_uri:  `${siteUrl}/api/auth/facebook/callback`,
    scope:         'public_profile',
    response_type: 'code',
    display:       'touch',
  });
  return NextResponse.redirect(`https://www.facebook.com/dialog/oauth?${params}`);
}
