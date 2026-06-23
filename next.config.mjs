/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript errors should be fixed, not ignored (security best practice)
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
