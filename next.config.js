/** @type {import('next').NextConfig} */
const nextConfig = {
    // Allow openai package to run in Node.js API routes
    serverExternalPackages: ['openai'],

    // Increase the payload size limit for audio uploads (5 MB)
    experimental: {},

    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'no-store' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
