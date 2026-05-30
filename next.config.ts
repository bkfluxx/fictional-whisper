import type { NextConfig } from "next";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { version } = require("./package.json") as { version: string };

const nextConfig: NextConfig = {
  output: "standalone", // required for the Docker multi-stage build
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
};

export default nextConfig;
