import { cn, getInitials } from '../../utils/helpers';

const sizes = {
  xs:  'w-6 h-6 text-xs',
  sm:  'w-8 h-8 text-sm',
  md:  'w-10 h-10 text-sm',
  lg:  'w-12 h-12 text-base',
  xl:  'w-16 h-16 text-lg',
};

const Avatar = ({ name = '', color, src, size = 'md', className, showRing = false }) => {
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold shrink-0 overflow-hidden',
        sizes[size],
        showRing && 'ring-2 ring-white ring-offset-1',
        className
      )}
      style={{ backgroundColor: color || '#6366f1', color: '#fff' }}
      title={name}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
};

export default Avatar;
