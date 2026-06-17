import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const { searchParams } = new URL(request.url);
  const code        = searchParams.get('code');
  const error       = searchParams.get('error');
  const stateParam  = searchParams.get('state');
  const stateCookie = request.cookies.get('fb_state')?.value;

  // Validate CSRF state
  if (!stateParam || !stateCookie || stateParam !== stateCookie) {
    return NextResponse.redirect(`${siteUrl}/book`);
  }

  if (!code || error) {
    return NextResponse.redirect(`${siteUrl}/book`);
  }

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
        client_id:     process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        redirect_uri:  `${siteUrl}/api/auth/facebook/callback`,
        code,
      })}`,
    );
    const { access_token } = await tokenRes.json();
    if (!access_token) throw new Error('no token');

    const profileRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,picture.width(400)&access_token=${access_token}`,
    );
    const profile = await profileRes.json();

    const payload = Buffer.from(JSON.stringify({
      id:    profile.id    ?? '',
      name:  profile.name  ?? '',
      photo: profile.picture?.data?.url ?? '',
    })).toString('base64');

    const res = NextResponse.redirect(`${siteUrl}/book`);
    // Clear the state cookie
    res.cookies.set('fb_state', '', { maxAge: 0, path: '/' });
    // Set the profile cookie — httpOnly so JS cannot steal it via XSS
    res.cookies.set('fb_auth', payload, {
      maxAge:   300,
      path:     '/',
      httpOnly: true,
      sameSite: 'lax',
      secure:   process.env.NODE_ENV === 'production',
    });
    return res;
  } catch {
    return NextResponse.redirect(`${siteUrl}/book`);
  }
}
