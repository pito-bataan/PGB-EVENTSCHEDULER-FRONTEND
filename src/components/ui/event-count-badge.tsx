import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CalendarDays } from 'lucide-react';

interface EventCountBadgeProps {
  count: number;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
  position?: 'top-right' | 'inline';
}

const EventCountBadge: React.FC<EventCountBadgeProps> = ({
  count,
  variant = 'default',
  size = 'sm',
  showIcon = false,
  className = '',
  position = 'top-right'
}) => {
  // Don't render if count is 0
  if (count === 0) return null;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-5 min-w-5 text-xs px-1.5';
      case 'md':
        return 'h-6 min-w-6 text-sm px-2';
      case 'lg':
        return 'h-7 min-w-7 text-sm px-2.5';
      default:
        return 'h-5 min-w-5 text-xs px-1.5';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'default':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'secondary':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'destructive':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'outline':
        return 'bg-white text-gray-700 border-gray-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'absolute -top-1 -right-1 z-10';
      case 'inline':
        return 'inline-flex';
      default:
        return 'absolute -top-1 -right-1 z-10';
    }
  };

  const badgeContent = (
    <>
      {showIcon && <CalendarDays className="w-3 h-3 mr-1" />}
      {count > 99 ? '99+' : count}
    </>
  );

  return (
    <Badge
      className={`
        ${getSizeClasses()}
        ${getVariantClasses()}
        ${getPositionClasses()}
        font-medium
        rounded-full
        flex items-center justify-center
        border
        shadow-sm
        ${className}
      `}
      title={`${count} event${count !== 1 ? 's' : ''}`}
    >
      {badgeContent}
    </Badge>
  );
};

export default EventCountBadge;
