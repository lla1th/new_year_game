import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests (M5): the dev server is started automatically.
 * Only Chromium is installed in the cloud container; add WebKit/Firefox projects where those browsers exist.
 */
export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 120_000,
    workers: 1,
    reporter: [['list']],
    use: {
        baseURL: 'http://localhost:5180/new_year_game/',
        viewport: { width: 1280, height: 720 },
        trace: 'off',
    },
    webServer: {
        command: 'npx vite --port 5180 --strictPort',
        url: 'http://localhost:5180/new_year_game/',
        reuseExistingServer: true,
        timeout: 60_000,
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
        ...(process.env.E2E_ALL_BROWSERS ? [
            { name: 'webkit', use: { ...devices['Desktop Safari'] }, testMatch: /(smoke|save)\.spec\.ts/ },
            { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: /(smoke|save)\.spec\.ts/ },
        ] : []),
    ],
});
