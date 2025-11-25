import type { Page } from '@playwright/test';
import { expect } from '../fixtures';

export class AuthPage {
  constructor(private page: Page) {}

  async gotoLogin() {
    await this.page.goto('/login');
    await expect(this.page.getByRole('heading')).toContainText('Sign In');
  }

  async gotoRegister() {
    await this.page.goto('/register');
    await expect(this.page.getByRole('heading')).toContainText('Sign Up');
  }

  async register(userId: string, password: string) {
    await this.gotoRegister();
    await this.page.getByLabel('User ID').click();
    await this.page.getByLabel('User ID').fill(userId);
    await this.page.getByLabel('Password').click();
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign Up' }).click();
  }

  async login(userId: string, password: string) {
    await this.gotoLogin();
    await this.page.getByLabel('User ID').click();
    await this.page.getByLabel('User ID').fill(userId);
    await this.page.getByLabel('Password').click();
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign In' }).click();
  }

  async logout(userId: string, password: string) {
    await this.login(userId, password);
    await this.page.waitForURL('/');

    await this.openSidebar();

    const userNavButton = this.page.getByTestId('user-nav-button');
    await expect(userNavButton).toBeVisible();

    await userNavButton.click();
    const userNavMenu = this.page.getByTestId('user-nav-menu');
    await expect(userNavMenu).toBeVisible();

    const authMenuItem = this.page.getByTestId('user-nav-item-sign-out');
    await expect(authMenuItem).toContainText('Sign out');

    await authMenuItem.click();

    const userIdentifier = this.page.getByTestId('user-identifier');
    await expect(userIdentifier).toContainText('Guest');
  }

  async expectToastToContain(text: string) {
    await expect(this.page.getByTestId('toast')).toContainText(text);
  }

  async openSidebar() {
    const sidebarToggleButton = this.page.getByTestId('sidebar-toggle-button');
    await sidebarToggleButton.click();
  }
}
