import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
const { Pool } = require('pg');
import { z } from 'zod';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt';

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'dev',
  password: 'qwertyuiop',
  port: 5432,
});

async function getUser(email: string): Promise<User | undefined> {
  try {
    const userSql=`SELECT * FROM users WHERE email=${email}`;
    console.log(userSql);
    const user = await pool.query(userSql);
    return user.rows[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
 
export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [Credentials({
    async authorize(credentials) {
      const parsedCredentials = z
        .object({ email: z.string().email(), password: z.string().min(6) })
        .safeParse(credentials);

      if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user;

      }
      console.log('Invalid credentials');
      return null;
    },
  }),
],
});