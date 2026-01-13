import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Check for an "auth" cookie (customize as needed)
  const isLoggedIn = request.cookies.get("auth");

  // Allow access to the login page and static files
  if (
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // If not logged in, redirect to /login
  if (!isLoggedIn) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Otherwise, continue
  return NextResponse.next();
}

// Optionally, specify which paths to match
export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"],
};