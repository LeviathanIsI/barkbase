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

    if (score < 3) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score < 4) return { score, label: 'Fair', color: 'bg-yellow-500' };
    if (score < 5) return { score, label: 'Good', color: 'bg-blue-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
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
                : 'bg-gray-200'
            )}
          />
        ))}
      </div>
      {password && (
        <p className={cn('text-xs', {
          'text-red-600': strength.score < 3,
          'text-yellow-600': strength.score === 3,
          'text-blue-600': strength.score === 4,
          'text-green-600': strength.score === 5,
        })}>
          Password strength: {strength.label}
        </p>
      )}
    </div>
  );
};

export default PasswordStrength;
