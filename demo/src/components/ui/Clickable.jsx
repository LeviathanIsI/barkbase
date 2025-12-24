import { forwardRef } from 'react';

/**
 * Accessible clickable wrapper component.
 * Adds proper keyboard support and ARIA attributes to make any element accessible.
 */
export const Clickable = forwardRef(function Clickable(props, ref) {
  const {
    as = 'div',
    onClick,
    disabled = false,
    className = '',
    children,
    role = 'button',
    ...restProps
  } = props;

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e);
    }
  };

  const handleClick = (e) => {
    if (disabled) return;
    onClick?.(e);
  };

  const Element = as;

  return (
    <Element
      ref={ref}
      role={role}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled || undefined}
      className={`${className} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      {...restProps}
    >
      {children}
    </Element>
  );
});

export default Clickable;
