import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // required for the Docker multi-stage build
  turbopack: {
    root: "/Users/bkampli/Documents/Projects/fictional-whisper",
  },
};

export default nextConfig;
