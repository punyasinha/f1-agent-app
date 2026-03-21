import type { NextConfig } from "next";

const config: NextConfig = {
  // The API route uses Azure SDKs which run only on the server.
  // This tells Next.js not to try bundling them for the browser.
  serverExternalPackages: ["@azure/ai-projects", "@azure/identity"],
};

export default config;
