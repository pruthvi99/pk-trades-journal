import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': resolve(__dirname, '.'),
		},
	},
	test: {
		globals: true,
		environment: 'node',
		include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			include: ['lib/**/*.ts', 'app/api/**/*.ts'],
			exclude: ['lib/db/migrate.ts', '**/*.d.ts'],
			thresholds: {
				lines: 85,
			},
		},
		setupFiles: ['tests/setup.ts'],
	},
});
