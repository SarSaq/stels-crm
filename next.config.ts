import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Превью заказов: Supabase Storage + исторические ссылки Cloudinary
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
