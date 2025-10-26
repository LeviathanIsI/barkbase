/**
 * Cognito Pre-SignUp trigger
 * Auto-confirms users and auto-verifies email for development
 */
exports.handler = async (event) => {
    console.log('Pre-SignUp trigger event:', JSON.stringify(event, null, 2));

    // Auto-confirm the user
    event.response.autoConfirmUser = true;

    // Auto-verify email
    if (event.request.userAttributes.hasOwnProperty('email')) {
        event.response.autoVerifyEmail = true;
    }

    console.log('✅ User auto-confirmed and email auto-verified');
    
    return event;
};


