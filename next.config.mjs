/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow Replit's proxied preview origin in dev
  ...(process.env.NODE_ENV !== 'production' && process.env.REPLIT_DEV_DOMAIN
    ? { allowedDevOrigins: [process.env.REPLIT_DEV_DOMAIN] }
    : {}),
}

export default nextConfig
