/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@app/shared-types", "@app/api-client"],
};

export default nextConfig;
