import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const session = cookies().get('admin_session');
  if (!session || session.value !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  revalidatePath('/');
  return NextResponse.json({ revalidated: true });
}
