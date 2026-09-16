/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    instrumentationHook: true
  }
};

export default nextConfig;
