import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { MANAGER_ONLY_ROUTES } from "@/lib/nav-config";

const MANAGER_ONLY_PREFIXES = [...MANAGER_ONLY_ROUTES, "/api/users"];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    const isManagerRoute = MANAGER_ONLY_PREFIXES.some((p) => path.startsWith(p));
    if (isManagerRoute && token?.role !== "manager") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: [
    "/((?!login|api/auth|api/cron|_next/static|_next/image|favicon.ico).*)",
  ],
};
