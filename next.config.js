/** @type {import('next').NextConfig} */
const nextConfig = process.env.CLOUDFLARE_TEST_EXPORT === "1"
  ? { output: "export", trailingSlash: true }
  : {};

module.exports = nextConfig;
