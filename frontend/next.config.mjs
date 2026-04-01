/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    BAZAAR_API_URL: process.env.BAZAAR_API_URL ?? 'http://localhost:4000',
  },
};
export default nextConfig;
