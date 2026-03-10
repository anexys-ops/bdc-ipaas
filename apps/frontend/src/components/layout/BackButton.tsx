import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';

interface BackButtonProps {
  to?: string;
  children?: React.ReactNode;
  className?: string;
}

export function BackButton({ to, children = 'Retour', className }: BackButtonProps) {
  const navigate = useNavigate();

  const content = (
    <>
      <ArrowLeft className="w-4 h-4 shrink-0" />
      {children}
    </>
  );

  const baseClass =
    'inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors';

  if (to) {
    return (
      <Link to={to} className={clsx(baseClass, className)}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => navigate(-1)} className={clsx(baseClass, className)}>
      {content}
    </button>
  );
}
