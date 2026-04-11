import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  delay = 300,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      setIsOpen(true);
    }, delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsOpen(false);
  };

  const sidePositions = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  const arrowPositions = {
    top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-gray-800 border-l-4 border-r-4 border-l-transparent border-r-transparent',
    bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-b-gray-800 border-l-4 border-r-4 border-l-transparent border-r-transparent',
    left: 'right-[-4px] top-1/2 -translate-y-1/2 border-l-gray-800 border-t-4 border-b-4 border-t-transparent border-b-transparent',
    right: 'left-[-4px] top-1/2 -translate-y-1/2 border-r-gray-800 border-t-4 border-b-4 border-t-transparent border-b-transparent',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isOpen && (
        <div
          className={`
            absolute z-50 ${sidePositions[side]}
            px-3 py-2 text-xs text-white rounded-md
            bg-gray-800 whitespace-nowrap shadow-lg
            pointer-events-none transition-opacity duration-200
          `}
        >
          {content}
          <div className={`absolute border-4 ${arrowPositions[side]}`} />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
