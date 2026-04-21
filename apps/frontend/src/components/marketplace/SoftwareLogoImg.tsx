import { useState } from 'react';
import { Zap } from 'lucide-react';
import { clsx } from 'clsx';

type LogoSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeClass: Record<LogoSize, string> = {
  '2xs': 'w-5 h-5 min-w-[1.25rem] min-h-[1.25rem]',
  xs: 'w-6 h-6 min-w-[1.5rem] min-h-[1.5rem]',
  sm: 'w-8 h-8 min-w-[2rem] min-h-[2rem]',
  md: 'w-10 h-10 min-w-[2.5rem] min-h-[2.5rem]',
  lg: 'w-12 h-12 min-w-[3rem] min-h-[3rem]',
  xl: 'w-16 h-16 min-w-[4rem] min-h-[4rem]',
};

export type SoftwareLogoImgProps = {
  src: string;
  alt?: string;
  size?: LogoSize;
  className?: string;
  imgClassName?: string;
  rounded?: 'lg' | 'xl' | '2xl';
};

const roundedClass = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
};

/**
 * Cadre homogène pour les logos logiciels (marketplace, home, listes).
 */
export function SoftwareLogoImg({
  src,
  alt = '',
  size = 'md',
  className,
  imgClassName,
  rounded = 'xl',
}: SoftwareLogoImgProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={clsx(
          sizeClass[size],
          roundedClass[rounded],
          'bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0',
          className,
        )}
        aria-hidden
      >
        <Zap className="w-2/5 h-2/5 text-primary-500" />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        sizeClass[size],
        roundedClass[rounded],
        'bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-sm',
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        className={clsx('max-w-full max-h-full w-auto h-auto object-contain', imgClassName)}
        onError={() => setFailed(true)}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
