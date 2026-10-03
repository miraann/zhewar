import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminSession';
import { unauthorized } from '@/lib/apiResponse';

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return unauthorized();

  // Revalidate the home page and the root layout (affects favicon + OG metadata)
  revalidatePath('/', 'layout');
  revalidatePath('/');
  return NextResponse.json({ revalidated: true });
}
