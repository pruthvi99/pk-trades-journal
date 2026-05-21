import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	/** better-sqlite3 is a native Node module — exclude from client bundles */
	serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
