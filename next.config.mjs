/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: 10 * 1024 * 1024,  // Changed from maxRequestBodySize to bodySizeLimit
    },
  },
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com'
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com'
      },
    ],
  },
};

export default nextConfig;
