/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: 10 * 1024 * 1024,  // Changed from maxRequestBodySize to bodySizeLimit
    },
  },
  output: "standalone",
};

export default nextConfig;
