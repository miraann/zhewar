import { timingSafeEqual } from 'crypto';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST() {
  const session = cookies().get('admin_session');
  if (!session?.value || !safeEqual(session.value, process.env.ADMIN_TOKEN ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Revalidate the home page and the root layout (affects favicon + OG metadata)
  revalidatePath('/', 'layout');
  revalidatePath('/');
  return NextResponse.json({ revalidated: true });
}
