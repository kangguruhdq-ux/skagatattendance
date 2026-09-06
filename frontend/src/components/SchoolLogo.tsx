import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import clsx from 'clsx';

interface SchoolLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showName?: boolean;
}

const SIZES = {
  sm: { img: 'w-8 h-8', icon: 20, text: 'text-sm' },
  md: { img: 'w-12 h-12', icon: 28, text: 'text-base' },
  lg: { img: 'w-16 h-16', icon: 36, text: 'text-lg' },
};

export default function SchoolLogo({ size = 'md', className, showName = false }: SchoolLogoProps) {
  const [imgError, setImgError] = useState(false);
  const s = SIZES[size];

  return (
    <div className={clsx('flex items-center gap-2.5', className)}>
      {!imgError ? (
        <img
          src="/assets/logo-smkn3.png"
          alt="Logo SMKN 3 Yogyakarta"
          className={clsx(s.img, 'object-contain rounded-lg')}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={clsx(s.img, 'rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400')}>
          <GraduationCap size={s.icon} />
        </div>
      )}
      {showName && (
        <div>
          <p className={clsx(s.text, 'font-extrabold text-slate-900 dark:text-white leading-tight')}>SKAGATA</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">SMK Negeri 3 Yogyakarta</p>
        </div>
      )}
    </div>
  );
}
