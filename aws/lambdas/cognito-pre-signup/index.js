/**
 * Cognito Pre-SignUp trigger
 * SECURITY: Only auto-confirms in development environments
 * Production REQUIRES email verification to prevent fake accounts
 */
exports.handler = async (event) => {
    const environment = process.env.ENVIRONMENT || 'production';
    const isDevelopment = environment === 'development' || environment === 'local';

    console.log(`[PRE_SIGNUP] Environment: ${environment}, Auto-confirm: ${isDevelopment}`);

    // SECURITY: Only bypass verification in development
    if (isDevelopment) {
        console.log('[PRE_SIGNUP] Auto-confirming user (DEVELOPMENT MODE)');
        event.response.autoConfirmUser = true;

        if (event.request.userAttributes.hasOwnProperty('email')) {
            event.response.autoVerifyEmail = true;
        }
    } else {
        // PRODUCTION: Require email verification
        console.log('[PRE_SIGNUP] User must verify email (PRODUCTION MODE)');

        // SECURITY: Block disposable email domains
        const email = event.request.userAttributes.email;
        if (email) {
            const disposableEmailDomains = [
                'tempmail.com',
                '10minutemail.com',
                'guerrillamail.com',
                'mailinator.com',
                'throwaway.email',
                'temp-mail.org',
                'maildrop.cc',
                'getnada.com',
                'trashmail.com',
                'fakeinbox.com'
            ];

            const emailDomain = email.split('@')[1]?.toLowerCase();
            if (disposableEmailDomains.includes(emailDomain)) {
                console.warn(`[PRE_SIGNUP] Blocked disposable email domain: ${emailDomain}`);
                throw new Error('Disposable email addresses are not allowed. Please use a permanent email address.');
            }
        }

        // In production, Cognito will send verification email
        // event.response.autoConfirmUser and autoVerifyEmail remain undefined (false)
    }

    return event;
};


