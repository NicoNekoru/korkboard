import { exec, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, test } from '@playwright/test';

const EXEC_PATHS: Record<string, string> = {
	linux: 'src-tauri/target/release/korkboard',
	darwin: 'src-tauri/target/release/korkboard.app/Contents/MacOS/korkboard',
	win32: 'src-tauri/target/release/korkboard.exe',
};

const platform = process.platform;
const BIN_PATH = EXEC_PATHS[platform];
const absBinPath = path.resolve(BIN_PATH);

test.describe.configure({ mode: 'serial' });

test.describe('Korkboard Desktop App Smoke Test', () => {
	let child: ReturnType<typeof spawn> | null = null;

	test('binary exists', () => {
		expect(BIN_PATH, `Unsupported platform: ${platform}`).toBeTruthy();
		expect(fs.existsSync(absBinPath), `Binary not found at ${absBinPath}`).toBe(
			true,
		);
	});

	test('app launches and stays running', async () => {
		const isWin = platform === 'win32';

		child = spawn(absBinPath, [], {
			stdio: 'ignore',
			detached: !isWin,
			shell: isWin,
		});

		await new Promise<void>((resolve) => {
			child!.on('spawn', resolve);
			setTimeout(resolve, 2000);
		});

		expect(child.pid, 'Process did not spawn').toBeDefined();

		await new Promise<void>((resolve) => setTimeout(resolve, 4000));

		try {
			child.kill('SIGTERM');
		} catch {
			// ignore if already dead
		}

		expect(child.exitCode, 'App exited unexpectedly').toBeNull();
	});

	test('window renders dashboard (Linux CDP)', async () => {
		if (platform !== 'linux') {
			test.skip();
			return;
		}

		// On Linux WebKitGTK, CDP must be enabled at launch via env var
		const childLinux = spawn(absBinPath, [], {
			stdio: 'ignore',
			env: {
				...process.env,
				WEBKIT_DISABLE_COMPOSITING_MODE: '1',
				WEB_INSPECTOR_PORT: '9222',
			},
		});

		await new Promise<void>((r) => setTimeout(r, 5000));

		try {
			const { execSync } = await import('node:child_process');
			const out = execSync('curl -sf http://localhost:9222/json').toString();
			const pages = JSON.parse(out);

			if (pages.length === 0) throw new Error('No pages found');

			const wsUrl = pages[0].webSocketDebuggerUrl;
			const { chromium } = await import('@playwright/test');
			const browser = await chromium.connect(wsUrl);
			const page = await browser.newPage();
			await page.waitForLoadState('networkidle');

			await expect(page.getByText('Korkboard')).toBeVisible({ timeout: 15000 });

			await browser.close();
		} finally {
			childLinux.kill('SIGTERM');
		}
	});

	test.afterAll(() => {
		if (child && !child.killed) {
			child.kill('SIGTERM');
		}
	});
});
