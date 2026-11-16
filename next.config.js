/** @type {import('next').NextConfig} */
const testExport = process.env.CLOUDFLARE_TEST_EXPORT === "1";
const pilotReadOnly = testExport && process.env.WORKERS_CI === "1" &&
  process.env.WORKERS_CI_BRANCH === "codex/pilot-supabase-auth-cloud-crud";
const nextConfig = {
  ...(testExport ? { output: "export", trailingSlash: true } : {}),
  env: { NEXT_PUBLIC_TEST_READ_ONLY: pilotReadOnly ? "1" : "0", NEXT_PUBLIC_TEST_WRITES_READY: pilotReadOnly && process.env.PILOT_TEST_WRITES_VERIFIED === "1" ? "1" : "0" },
};

module.exports = nextConfig;
