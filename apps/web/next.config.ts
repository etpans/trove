import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const webRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = join(webRoot, "../..");

const nextConfig: NextConfig = {
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
