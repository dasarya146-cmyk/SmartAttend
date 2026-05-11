/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
