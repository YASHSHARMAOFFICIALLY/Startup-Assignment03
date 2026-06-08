import type { NextAuthOptions } from "next-auth";
import type { Provider } from "next-auth/providers/index";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { findUserByEmail, verifyPassword } from "@/lib/users";

// Validate NEXTAUTH_SECRET at runtime (not during build/generate)
if (
  typeof window === "undefined" &&
  process.env.NODE_ENV === "production" &&
  !process.env.NEXT_PHASE // skip during build
) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret === "CHANGE_ME_RUN_openssl_rand_base64_32") {
    throw new Error("NEXTAUTH_SECRET is not set. Run: openssl rand -base64 32");
  }
}

// Only register Google provider when credentials are configured
const providers: Provider[] = [
  CredentialsProvider({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const user = await verifyPassword(credentials.email, credentials.password);
      if (!user) return null;
      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;
      if (!user.email) return false;

      const existing = await findUserByEmail(user.email);
      if (!existing) return false;

      user.id = existing.id;
      user.name = existing.name;
      user.image = existing.image ?? user.image;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};
