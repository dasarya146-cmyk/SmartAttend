import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days persistent session
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.uid = profile.sub ?? token.sub ?? '';
        token.picture = (profile as Record<string, string>).picture ?? '';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, string>).uid = token.uid as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
