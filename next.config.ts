import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "*.ngrok-free.dev",
    "*.ngrok.io",
    "*.ngrok.app",
    "*.trycloudflare.com",
  ],
};

export default nextConfig;
