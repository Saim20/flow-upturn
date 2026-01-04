import { Page, expect } from '@playwright/test';

/**
 * Authentication Helper Functions
 * 
 * These functions handle login, logout, and authentication state
 * for E2E tests.
 */

export interface TestUser {
    email: string;
    password: string;
    role?: 'admin' | 'user' | 'manager';
}

/**
 * Default test users from environment variables
 */
export const TEST_USERS = {
    admin: {
        email: process.env.TEST_ADMIN_EMAIL || 'annonymous.sakibulhasan@gmail.com',
        password: process.env.TEST_ADMIN_PASSWORD || 'Test@flow1234',
    },
    user: {
        email: process.env.TEST_USER_EMAIL || 'annonymous.sakibulhasan@gmail.com',
        password: process.env.TEST_USER_PASSWORD || 'Test@flow1234',
    },
    manager: {
        email: process.env.TEST_MANAGER_EMAIL || 'annonymous.sakibulhasan@gmail.com',
        password: process.env.TEST_MANAGER_PASSWORD || 'Test@flow1234',
    },
};

/**
 * Login to the application
 * @param page - Playwright page object
 * @param user - User credentials (defaults to regular user)
 */
export async function login(page: Page, user: TestUser = TEST_USERS.user) {
    // Check if already logged in
    const isLoggedIn = await checkIfLoggedIn(page);

    if (isLoggedIn) {
        console.log('Already logged in, skipping login');
        return;
    }

    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill in credentials - try multiple selector strategies
    const emailInput = page.locator('input[type="email"]')
        .or(page.locator('input[name="email"]'))
        .or(page.locator('[data-testid="email-input"]'))
        .first();

    const passwordInput = page.locator('input[type="password"]')
        .or(page.locator('input[name="password"]'))
        .or(page.locator('[data-testid="password-input"]'))
        .first();

    await emailInput.fill(user.email);
    await passwordInput.fill(user.password);

    // Submit form
    const loginButton = page.locator('button[type="submit"]')
        .or(page.locator('button:has-text("Sign In")'))
        .or(page.locator('button:has-text("Login")'))
        .or(page.locator('[data-testid="login-button"]'))
        .first();

    await loginButton.click();

    // Wait for navigation after login
    await page.waitForURL('**/ops/**', { timeout: 15000 }).catch(async () => {
        // If not redirected to /ops, check if we're on dashboard or home
        await page.waitForURL('**/', { timeout: 5000 });
    });

    // Verify login was successful
    await page.waitForTimeout(1000);
    const loggedIn = await checkIfLoggedIn(page);

    if (!loggedIn) {
        throw new Error('Login failed - user not authenticated');
    }
}

/**
 * Check if user is currently logged in
 * @param page - Playwright page object
 * @returns true if logged in, false otherwise
 */
export async function checkIfLoggedIn(page: Page): Promise<boolean> {
    // Try multiple strategies to detect logged-in state

    // Strategy 1: Check for user menu/avatar
    const userMenu = await page.locator('[data-testid="user-menu"]')
        .or(page.locator('[aria-label="User menu"]'))
        .or(page.locator('.user-avatar'))
        .isVisible()
        .catch(() => false);

    if (userMenu) return true;

    // Strategy 2: Check for logout button
    const logoutButton = await page.locator('button:has-text("Logout")')
        .or(page.locator('button:has-text("Sign Out")'))
        .isVisible()
        .catch(() => false);

    if (logoutButton) return true;

    // Strategy 3: Check localStorage for auth token
    const hasAuthToken = await page.evaluate(() => {
        return !!(
            localStorage.getItem('supabase.auth.token') ||
            localStorage.getItem('auth_token') ||
            sessionStorage.getItem('auth_token')
        );
    });

    if (hasAuthToken) return true;

    // Strategy 4: Check if on a protected route
    const url = page.url();
    const onProtectedRoute = url.includes('/ops') || url.includes('/dashboard');
    const notOnLogin = !url.includes('/login') && !url.includes('/auth');

    return onProtectedRoute && notOnLogin;
}

/**
 * Logout from the application
 * @param page - Playwright page object
 */
export async function logout(page: Page) {
    // Look for user menu or logout button
    const userMenu = page.locator('[data-testid="user-menu"]')
        .or(page.locator('[aria-label="User menu"]'))
        .or(page.locator('.user-avatar'))
        .first();

    // Click user menu if it exists
    if (await userMenu.isVisible().catch(() => false)) {
        await userMenu.click();
        await page.waitForTimeout(500);
    }

    // Click logout button
    const logoutButton = page.locator('button:has-text("Logout")')
        .or(page.locator('button:has-text("Sign Out")'))
        .or(page.locator('[data-testid="logout-button"]'))
        .first();

    if (await logoutButton.isVisible().catch(() => false)) {
        await logoutButton.click();

        // Wait for redirect to login
        await page.waitForURL('**/login**', { timeout: 5000 }).catch(() => {
            // Might redirect to home page instead
            page.waitForURL('/', { timeout: 5000 });
        });
    } else {
        // Manually clear auth state
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        await page.goto('/login');
    }
}

/**
 * Get current user information from the page
 * @param page - Playwright page object
 * @returns User information if available
 */
export async function getCurrentUser(page: Page) {
    return await page.evaluate(() => {
        const authData = localStorage.getItem('supabase.auth.token');
        if (authData) {
            try {
                const parsed = JSON.parse(authData);
                return parsed.currentSession?.user || null;
            } catch {
                return null;
            }
        }
        return null;
    });
}

/**
 * Wait for authentication to be ready
 * @param page - Playwright page object
 */
export async function waitForAuth(page: Page) {
    await page.waitForFunction(() => {
        return !!(
            window.localStorage.getItem('supabase.auth.token') ||
            document.querySelector('[data-testid="user-menu"]')
        );
    }, { timeout: 10000 });
}

/**
 * Setup authentication state for tests
 * This can be used in beforeEach hooks
 * @param page - Playwright page object
 * @param user - User to login as
 */
export async function setupAuth(page: Page, user: TestUser = TEST_USERS.user) {
    await login(page, user);
    await waitForAuth(page);
}
