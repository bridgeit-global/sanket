import type { Request } from '@playwright/test';
import { expect, test } from '../fixtures';
import { AuthPage } from '../pages/auth';
import { generateRandomTestUser } from '../helpers';
import { ChatPage } from '../pages/chat';
import { getMessageByErrorCode } from '@/lib/errors';

test.describe
  .serial('Guest Session', () => {
    test('Authenticate as guest user when a new session is loaded', async ({
      page,
    }) => {
      const response = await page.goto('/');

      if (!response) {
        throw new Error('Failed to load page');
      }

      let request: Request | null = response.request();

      const chain = [];

      while (request) {
        chain.unshift(request.url());
        request = request.redirectedFrom();
      }

      expect(chain).toEqual([
        'http://localhost:3000/',
        'http://localhost:3000/api/auth/guest?redirectUrl=http%3A%2F%2Flocalhost%3A3000%2F',
        'http://localhost:3000/',
      ]);
    });

    test('Log out is not available for guest users', async ({ page }) => {
      await page.goto('/');

      const sidebarToggleButton = page.getByTestId('sidebar-toggle-button');
      await sidebarToggleButton.click();

      const userNavButton = page.getByTestId('user-nav-button');
      await expect(userNavButton).toBeVisible();

      await userNavButton.click();
      const userNavMenu = page.getByTestId('user-nav-menu');
      await expect(userNavMenu).toBeVisible();

      const authMenuItem = page.getByTestId('user-nav-item-sign-out');
      await expect(authMenuItem).toContainText('Sign out');
    });

    test('Do not authenticate as guest user when an existing non-guest session is active', async ({
      adaContext,
    }) => {
      const response = await adaContext.page.goto('/');

      if (!response) {
        throw new Error('Failed to load page');
      }

      let request: Request | null = response.request();

      const chain = [];

      while (request) {
        chain.unshift(request.url());
        request = request.redirectedFrom();
      }

      expect(chain).toEqual(['http://localhost:3000/']);
    });

    test('Allow navigating to /login as guest user', async ({ page }) => {
      await page.goto('/login');
      await page.waitForURL('/login');
      await expect(page).toHaveURL('/login');
    });

    test('Allow navigating to /register as guest user', async ({ page }) => {
      await page.goto('/register');
      await page.waitForURL('/register');
      await expect(page).toHaveURL('/register');
    });

    test('Do not show user ID in user menu for guest user', async ({ page }) => {
      await page.goto('/');

      const sidebarToggleButton = page.getByTestId('sidebar-toggle-button');
      await sidebarToggleButton.click();

      const userIdentifier = page.getByTestId('user-identifier');
      await expect(userIdentifier).toContainText('Guest');
    });
  });

test.describe
  .serial('Login and Registration', () => {
    let authPage: AuthPage;

    const testUser = generateRandomTestUser();

    test.beforeEach(async ({ page }) => {
      authPage = new AuthPage(page);
    });

    test('Register new account', async () => {
      await authPage.register(testUser.userId, testUser.password);
      await authPage.expectToastToContain('Account created successfully!');
    });

    test('Register new account with existing user ID', async () => {
      await authPage.register(testUser.userId, testUser.password);
      await authPage.expectToastToContain('Account already exists!');
    });

    test('Log into account that exists', async ({ page }) => {
      await authPage.login(testUser.userId, testUser.password);

      await page.waitForURL('/');
      await expect(page.getByPlaceholder('Send a message...')).toBeVisible();
    });

    test('Display user ID in user menu', async ({ page }) => {
      await authPage.login(testUser.userId, testUser.password);

      await page.waitForURL('/');
      await expect(page.getByPlaceholder('Send a message...')).toBeVisible();

      const userIdentifier = await page.getByTestId('user-identifier');
      await expect(userIdentifier).toHaveText(testUser.userId);
    });

    test('Log out as non-guest user', async () => {
      await authPage.logout(testUser.userId, testUser.password);
    });

    test('Do not force create a guest session if non-guest session already exists', async ({
      page,
    }) => {
      await authPage.login(testUser.userId, testUser.password);
      await page.waitForURL('/');

      const userIdentifier = await page.getByTestId('user-identifier');
      await expect(userIdentifier).toHaveText(testUser.userId);

      await page.goto('/api/auth/guest');
      await page.waitForURL('/');

      const updatedUserIdentifier = await page.getByTestId('user-identifier');
      await expect(updatedUserIdentifier).toHaveText(testUser.userId);
    });

    test('Log out is available for non-guest users', async ({ page }) => {
      await authPage.login(testUser.userId, testUser.password);
      await page.waitForURL('/');

      authPage.openSidebar();

      const userNavButton = page.getByTestId('user-nav-button');
      await expect(userNavButton).toBeVisible();

      await userNavButton.click();
      const userNavMenu = page.getByTestId('user-nav-menu');
      await expect(userNavMenu).toBeVisible();

      const authMenuItem = page.getByTestId('user-nav-item-sign-out');
      await expect(authMenuItem).toContainText('Sign out');
    });

    test('Do not navigate to /register for non-guest users', async ({
      page,
    }) => {
      await authPage.login(testUser.userId, testUser.password);
      await page.waitForURL('/');

      await page.goto('/register');
      await expect(page).toHaveURL('/');
    });

    test('Do not navigate to /login for non-guest users', async ({ page }) => {
      await authPage.login(testUser.userId, testUser.password);
      await page.waitForURL('/');

      await page.goto('/login');
      await expect(page).toHaveURL('/');
    });
  });

test.describe('Entitlements', () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
  });

  test('Guest user cannot send more than 20 messages/day', async () => {
    test.fixme();
    await chatPage.createNewChat();

    for (let i = 0; i <= 20; i++) {
      await chatPage.sendUserMessage('Why is the sky blue?');
      await chatPage.isGenerationComplete();
    }

    await chatPage.sendUserMessage('Why is the sky blue?');
    await chatPage.expectToastToContain(
      getMessageByErrorCode('rate_limit:chat'),
    );
  });
});
