import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/login", "/register", "/public"];

// Routes that are only accessible when NOT authenticated
const authRoutes = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is an API route or static file
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") // Static files
  ) {
    return NextResponse.next();
  }

  // Get the token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || "klion-nextauth-secret-2024",
  });

  const isAuthenticated = !!token;
  const isAuthRoute = authRoutes.includes(pathname);
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // If user is authenticated and trying to access auth pages, redirect to home
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If user is not authenticated and trying to access protected routes
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*|klion_logo\\.png).*)",
  ],
};
