/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  serverExternalPackages: ["esbuild"],
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          destination: "/webbrain-landing/index.html",
        },
      ],
    };
  },
};

export default nextConfig;
