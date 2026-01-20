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

  // For all other routes, we'll rely on client-side authentication checks
  // The client pages will redirect to login if no session is found
  // This is because middleware runs server-side and doesn't have access to localStorage

  return NextResponse.next();
}

// Optionally, specify which paths to match
export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"],
};
