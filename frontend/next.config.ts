import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8001/api/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8001",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8001",
      },
    ],
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
