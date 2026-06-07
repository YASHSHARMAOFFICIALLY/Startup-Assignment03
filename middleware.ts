import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    // Protect all routes except login, auth API, static files, and Next.js internals
    "/((?!login|setup|api/auth|api/cron|_next/static|_next/image|favicon.ico).*)",
  ],
};
