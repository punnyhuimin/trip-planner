import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

// Lets `next dev` see Cloudflare bindings (e.g. the D1 `DB` binding).
initOpenNextCloudflareForDev();
