/**
 * Cognito Pre-SignUp trigger
 * Auto-confirms users and auto-verifies email for development
 */
exports.handler = async (event) => {

    // Auto-confirm the user
    event.response.autoConfirmUser = true;

    // Auto-verify email
    if (event.request.userAttributes.hasOwnProperty('email')) {
        event.response.autoVerifyEmail = true;
    }

    
    return event;
};


