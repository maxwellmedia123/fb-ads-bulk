export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    // Match all paths except static files and api/auth
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
