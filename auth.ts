import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Check if ALLOWED_EMAILS is configured
      const allowedEmails = process.env.ALLOWED_EMAILS;

      // If no restriction is set, allow all users
      if (!allowedEmails) {
        return true;
      }

      // Split the comma-separated list and trim whitespace
      const allowedEmailList = allowedEmails.split(',').map(email => email.trim().toLowerCase());

      // Check if user's email is in the allowed list
      const userEmail = user.email?.toLowerCase();
      if (userEmail && allowedEmailList.includes(userEmail)) {
        return true;
      }

      // Deny access if email not in allowed list
      return false;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith('/auth');
      const isApiAuth = nextUrl.pathname.startsWith('/api/auth');

      // Allow auth pages and API routes
      if (isAuthPage || isApiAuth) {
        return true;
      }

      // Redirect to sign-in if not logged in
      if (!isLoggedIn) {
        return false;
      }

      return true;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
});
