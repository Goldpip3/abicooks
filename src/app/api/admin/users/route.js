import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, ensureDB } from '@/lib/db';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!session.user.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await ensureDB();
    const { rows } = await query(
      'SELECT id, name, email, status, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
