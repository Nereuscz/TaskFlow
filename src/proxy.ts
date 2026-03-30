import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public paths
  const publicPaths = ["/login", "/signup", "/forgot-password", "/reset-password", "/api/auth"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  // Allow invite paths without auth (token validated server-side)
  const isInvite = pathname.startsWith("/invite");

  if (!req.auth && !isPublic && !isInvite) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect logged-in users away from auth pages
  if (req.auth && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
