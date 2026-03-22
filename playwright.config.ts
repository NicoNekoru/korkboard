import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './src/test-desktop',
	reporter: 'list',
	use: {
		trace: 'on-first-retry',
	},
	webServer: undefined,
});
