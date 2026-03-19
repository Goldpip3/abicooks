import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { query, ensureDB } from './db';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        await ensureDB();
        const { email, password } = credentials;
        if (!email || !password) return null;

        const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
        if (rows.length === 0) return null;

        const user = rows[0];

        if (!user.password_hash) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        if (user.status !== 'approved') {
          throw new Error(
            user.status === 'pending'
              ? 'Your account is pending admin approval. Check back soon.'
              : 'Your account request was not approved.'
          );
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          is_admin: user.is_admin,
          status: user.status,
        };
      },
    }),
  ],

  callbacks: {

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.is_admin = user.is_admin;
        token.status = user.status;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.is_admin = token.is_admin;
        session.user.status = token.status;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
  },
};
