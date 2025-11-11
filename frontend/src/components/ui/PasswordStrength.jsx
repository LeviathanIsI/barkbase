import { cn } from '@/lib/cn';

const PasswordStrength = ({ password, className }) => {
  const getStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' };

    let score = 0;
    const checks = [
      pwd.length >= 8,
      /[a-z]/.test(pwd),
      /[A-Z]/.test(pwd),
      /\d/.test(pwd),
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    ];

    score = checks.filter(Boolean).length;

    if (score < 3) return { score, label: 'Weak', color: 'bg-red-50 dark:bg-red-950/20' };
    if (score < 4) return { score, label: 'Fair', color: 'bg-yellow-50 dark:bg-yellow-950/20' };
    if (score < 5) return { score, label: 'Good', color: 'bg-blue-50 dark:bg-blue-950/20' };
    return { score, label: 'Strong', color: 'bg-green-50 dark:bg-green-950/20' };
  };

  const strength = getStrength(password);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={cn(
              'h-2 flex-1 rounded-full transition-colors',
              level <= strength.score
                ? strength.color
                : 'bg-gray-200 dark:bg-surface-border'
            )}
          />
        ))}
      </div>
      {password && (
        <p className={cn('text-xs', {
          'text-red-600 dark:text-red-400': strength.score < 3,
          'text-yellow-600 dark:text-yellow-400': strength.score === 3,
          'text-blue-600 dark:text-blue-400': strength.score === 4,
          'text-green-600 dark:text-green-400': strength.score === 5,
        })}>
          Password strength: {strength.label}
        </p>
      )}
    </div>
  );
};

export default PasswordStrength;
