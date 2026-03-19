import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, ensureDB } from '@/lib/db';

export async function PATCH(request, { params }) {
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
      "UPDATE users SET status = 'approved' WHERE id = $1 RETURNING id, name, email, status",
      [params.id]
    );
    if (rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
