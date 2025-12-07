/**
 * Login Page Object
 * Handles authentication flows
 */

import { BasePage } from './BasePage.js';

export class LoginPage extends BasePage {
  constructor(page) {
    super(page);

    this.url = '/login';

    this.selectors = {
      ...this.selectors,
      // Form elements
      emailInput: 'input[name="email"], input[type="email"], #email',
      passwordInput: 'input[name="password"], input[type="password"], #password',
      submitButton: 'button[type="submit"]',
      rememberMe: 'input[name="remember"], #remember-me',

      // Error messages
      errorMessage: '[data-testid="login-error"], .error-message, [role="alert"], .bg-red-50, .dark\\:bg-red-900\\/20, .text-red-600',
      fieldError: '.field-error, [data-testid="field-error"]',

      // Links
      forgotPassword: 'a[href*="forgot"], a:has-text("Forgot")',
      signUp: 'a[href*="signup"], a[href*="register"], a:has-text("Sign up")',

      // OAuth buttons
      googleLogin: 'button:has-text("Google"), [data-testid="google-login"]',
      microsoftLogin: 'button:has-text("Microsoft"), [data-testid="microsoft-login"]',

      // Success indicators
      dashboardIndicator: '[data-testid="dashboard"], main h1',
    };
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await super.goto(this.url);
  }

  /**
   * Login with email and password
   */
  async login(email, password, options = {}) {
    const { rememberMe = false, expectSuccess = true } = options;

    await this.fillEmail(email);
    await this.fillPassword(password);

    if (rememberMe) {
      await this.checkRememberMe();
    }

    await this.clickLogin();

    if (expectSuccess) {
      await this.waitForLoginSuccess();
    } else {
      // Wait for error message or stay on login page
      await this.waitForLoginFailure();
    }
  }

  /**
   * Fill email field
   */
  async fillEmail(email) {
    await this.page.locator(this.selectors.emailInput).fill(email);
  }

  /**
   * Fill password field
   */
  async fillPassword(password) {
    await this.page.locator(this.selectors.passwordInput).fill(password);
  }

  /**
   * Check remember me checkbox
   */
  async checkRememberMe() {
    await this.setCheckbox(this.selectors.rememberMe, true);
  }

  /**
   * Click login button
   */
  async clickLogin() {
    await this.page.locator(this.selectors.submitButton).click();
  }

  /**
   * Wait for successful login
   */
  async waitForLoginSuccess() {
    // Wait for either redirect to dashboard or dashboard element to appear
    await Promise.race([
      this.page.waitForURL(/\/(today|dashboard|home)/, { timeout: 15000 }),
      this.page.locator(this.selectors.dashboardIndicator).waitFor({ timeout: 15000 }),
    ]);
  }

  /**
   * Wait for login failure (error message appears)
   */
  async waitForLoginFailure() {
    try {
      // Wait for error message to appear
      await this.page.locator(this.selectors.errorMessage).waitFor({
        state: 'visible',
        timeout: 10000
      });
    } catch (error) {
      // If no error message appears, at least wait for button to not be loading
      await this.page.locator('button[type="submit"]:not(:disabled)').waitFor({
        timeout: 10000
      });
    }
  }

  /**
   * Get login error message
   */
  async getErrorMessage() {
    const error = this.page.locator(this.selectors.errorMessage);
    if (await error.isVisible()) {
      return error.textContent();
    }
    return null;
  }

  /**
   * Check if login form is visible
   */
  async isLoginFormVisible() {
    return this.page.locator(this.selectors.emailInput).isVisible();
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword() {
    await this.page.locator(this.selectors.forgotPassword).click();
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn() {
    const url = this.getCurrentUrl();
    return !url.includes('/login');
  }

  /**
   * Get validation error for field
   */
  async getFieldError(fieldName) {
    const fieldError = this.page.locator(`[data-testid="${fieldName}-error"], #${fieldName}-error`);
    if (await fieldError.isVisible()) {
      return fieldError.textContent();
    }
    return null;
  }
}

export default LoginPage;
