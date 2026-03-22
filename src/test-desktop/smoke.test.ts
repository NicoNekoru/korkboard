import { exec } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';

const execAsync = promisify(exec);

const getBinaryPath = (platform: string): string => {
	switch (platform) {
		case 'linux':
			return 'src-tauri/target/release/korkboard';
		case 'darwin':
			return 'src-tauri/target/release/korkboard.app/Contents/MacOS/korkboard';
		case 'win32':
			return 'src-tauri/target/release/korkboard.exe';
		default:
			throw new Error(`Unsupported platform: ${platform}`);
	}
};

const PORT = 9222;
const BIN_PATH = getBinaryPath(process.platform);

test.describe.configure({ mode: 'serial' });

test.describe('Korkboard Desktop App Smoke Test', () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let appProcess: any;

	test('binary exists and is executable', () => {
		const absPath = path.resolve(BIN_PATH);
		expect(fs.existsSync(absPath), `Binary not found at ${absPath}`).toBe(true);
	});

	test('app launches without crashing', async () => {
		const absPath = path.resolve(BIN_PATH);
		appProcess = exec(`"${absPath}" --remote-debugging-port=${PORT}`);

		await new Promise<void>((resolve) => {
			appProcess.on('spawn', () => resolve());
			setTimeout(resolve, 2000);
		});

		expect(appProcess.pid).toBeDefined();
		expect(appProcess.exitCode).toBeNull();
	});

	test('window renders the dashboard', async () => {
		await new Promise<void>((resolve) => setTimeout(resolve, 3000));

		const { stdout } = await execAsync(`curl -s http://localhost:${PORT}/json`);
		const pages = JSON.parse(stdout);
		expect(pages.length, 'No WebView page found').toBeGreaterThan(0);

		const wsEndpoint = pages[0].webSocketDebuggerUrl;

		const { chromium } = await import('@playwright/test');
		const browser = await chromium.connect(wsEndpoint);
		const context = await browser.newContext();
		const page = await context.newPage();

		await page.waitForLoadState('domcontentloaded');

		await expect(page.getByText('Korkboard')).toBeVisible({ timeout: 10000 });
		await expect(page.getByText('All Clusters')).toBeVisible({ timeout: 5000 });

		await context.close();
		await browser.close();
	});

	test.afterAll(async () => {
		if (appProcess && !appProcess.killed) {
			appProcess.kill('SIGTERM');
			await new Promise((r) => setTimeout(r, 1000));
			if (process.platform === 'win32') {
				exec(`taskkill /pid ${appProcess.pid} /T /F`);
			}
		}
	});
});
