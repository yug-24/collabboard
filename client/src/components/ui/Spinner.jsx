import { cn } from '../../utils/helpers';

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
  xl: 'w-12 h-12 border-4',
};

const Spinner = ({ size = 'md', className, color = 'brand' }) => {
  const colorClass =
    color === 'brand'
      ? 'border-brand-200 border-t-brand-600'
      : 'border-white/30 border-t-white';

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'rounded-full animate-spin',
        sizes[size],
        colorClass,
        className
      )}
    />
  );
};

export default Spinner;
