export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cases/:path*",
    "/clients/:path*",
    "/hearings/:path*",
    "/sales/:path*",
    "/expenses/:path*",
    "/finance/:path*",
    "/accounting/:path*",
    "/payment-requests/:path*",
    "/payees/:path*",
    "/analytics/:path*",
    "/quotes/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/consultations/:path*",
    "/service-requests/:path*",
    "/print/:path*",
  ],
};
