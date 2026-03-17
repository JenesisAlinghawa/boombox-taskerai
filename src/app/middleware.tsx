import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname;

  // Allow access to auth pages and static files
  if (
    pathname === "/" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Check for authentication on protected routes
  // Get userId from cookies (set by login)
  const userId = request.cookies.get("userId")?.value;

  if (!userId) {
    // No authentication found, redirect to login
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

// Optionally, specify which paths to match
export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"],
};
