import React, { useState } from 'react';
import { Landmark } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EFE6D5] via-[#E5D7BE] to-[#D7C3A1] text-[#5C3D28] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Landmark className="w-8 h-8 text-[#8B261D]/70 mb-2" strokeWidth={1.5} />
        <span className="font-serif text-sm font-medium text-[#2C1D14]">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
