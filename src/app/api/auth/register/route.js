import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, ensureDB } from '@/lib/db';

export async function POST(request) {
  try {
    await ensureDB();

    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const { rows: existing } = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const isAdmin = adminEmail && email.toLowerCase() === adminEmail;
    const status = isAdmin ? 'approved' : 'pending';

    const { rows } = await query(
      'INSERT INTO users (name, email, password_hash, status, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, status, is_admin',
      [name.trim(), email.toLowerCase(), password_hash, status, isAdmin]
    );

    if (status === 'pending') {
      return NextResponse.json({ pending: true }, { status: 202 });
    }

    return NextResponse.json(
      { message: 'Account created. Please sign in.', user: { id: rows[0].id, name: rows[0].name, email: rows[0].email, is_admin: rows[0].is_admin } },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
