import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { auth } from '@/lib/apiClient'; // Using the new auth client
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

// This component now needs to handle Cognito's email verification flow.
// The old backend generated a token, but Cognito uses a code sent to the user.
// For now, we assume the user clicks a link like /verify-email?code=...&username=...
// A more robust solution might involve a dedicated page to enter the code.

const VerifyEmail = () => {
    const location = useLocation();
    const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
    const [error, setError] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const username = params.get('username'); // Cognito confirmation links include the username
        const token = params.get('token'); // Mock verification token

        if (code && username) {
            // Real Cognito verification flow
            const confirmSignUp = async () => {
                try {
                    await auth.confirmSignUp({ username, code });
                    setStatus('success');
                } catch (error) {
                    setError(error.message);
                    setStatus('error');
                }
            };
            confirmSignUp();
        } else if (token) {
            // Mock verification flow for development
            const confirmSignUp = async () => {
                try {
                    // For mock verification, we can simulate success
                    setStatus('success');
                } catch (error) {
                    setError(error.message);
                    setStatus('error');
                }
            };
            confirmSignUp();
        } else {
            setError('Verification parameters not found in URL. Please check your email for the verification link.');
            setStatus('error');
        }
    }, [location]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
            <div className="mb-6 text-center">
                <p className="text-xs uppercase tracking-wide text-muted">BarkBase</p>
                <h1 className="text-2xl font-semibold text-text">Verify your email</h1>
            </div>
            <Card className="w-full max-w-md">
                {status === 'loading' && (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-sm text-muted">Verifying your email...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center space-y-4 py-6">
                        <div className="text-green-600 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-text">Email verified successfully!</h2>
                        <p className="text-sm text-muted">
                            Your account has been created and verified. You can now sign in to your BarkBase workspace.
                        </p>
                        <Button asChild className="w-full">
                            <Link to="/login">Sign in to your account</Link>
                        </Button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center space-y-4 py-6">
                        <div className="text-red-600 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-text">Verification failed</h2>
                        <p className="text-sm text-danger">{error}</p>
                        <p className="text-sm text-muted">
                            Please try signing up again or contact support if the problem persists.
                        </p>
                        <Button asChild className="w-full">
                            <Link to="/signup">Try signing up again</Link>
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default VerifyEmail;
