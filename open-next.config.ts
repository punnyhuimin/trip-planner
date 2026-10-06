import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every page reads live trip data, so no incremental cache is configured.
export default defineCloudflareConfig({});
