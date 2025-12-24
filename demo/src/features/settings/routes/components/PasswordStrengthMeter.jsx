import { CheckCircle, X, Lightbulb } from 'lucide-react';

const PasswordStrengthMeter = ({ password }) => {
  const getStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '', width: '0%' };

    let score = 0;
    const checks = [
      pwd.length >= 8,
      /[a-z]/.test(pwd),
      /[A-Z]/.test(pwd),
      /\d/.test(pwd),
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    ];

    score = checks.filter(Boolean).length;

    if (score < 3) return { score, label: 'Weak', color: 'bg-red-50 dark:bg-red-950/20', width: '25%' };
    if (score < 4) return { score, label: 'Fair', color: 'bg-yellow-50 dark:bg-yellow-950/20', width: '50%' };
    if (score < 5) return { score, label: 'Good', color: 'bg-blue-50 dark:bg-blue-950/20', width: '75%' };
    return { score, label: 'Strong', color: 'bg-green-50 dark:bg-green-950/20', width: '100%' };
  };

  const requirements = [
    { text: 'At least 8 characters', met: password?.length >= 8 },
    { text: 'One uppercase letter', met: /[A-Z]/.test(password || '') },
    { text: 'One lowercase letter', met: /[a-z]/.test(password || '') },
    { text: 'One number', met: /\d/.test(password || '') },
    { text: 'One special character (!@#$%)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password || '') },
  ];

  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-3">
      {/* Strength Meter */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-text-primary">Password Strength:</span>
          <span className={`text-sm font-medium ${
            strength.score < 3 ? 'text-red-600' :
            strength.score < 4 ? 'text-yellow-600' :
            strength.score < 5 ? 'text-blue-600 dark:text-blue-400' : 'text-green-600'
          }`}>
            {strength.label}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${strength.color}`}
            style={{ width: strength.width }}
          />
        </div>
      </div>

      {/* Requirements */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-text-primary mb-2">Requirements:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center gap-2">
              {req.met ? (
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              <span className={`text-xs ${req.met ? 'text-green-700' : 'text-gray-600 dark:text-text-secondary'}`}>
                {req.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Tips for a strong password:</p>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Avoid common words, use a passphrase like "MyDog&Loves2Play!" or combine unrelated words with numbers and symbols.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordStrengthMeter;
