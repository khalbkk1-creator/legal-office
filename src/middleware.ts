export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cases/:path*",
    "/clients/:path*",
    "/hearings/:path*",
    "/sales/:path*",
    "/quotes/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/consultations/:path*",
    "/print/:path*",
  ],
};
