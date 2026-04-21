interface BackofficePageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function BackofficePageHeader({ title, description, children }: BackofficePageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
        {description && <p className="text-slate-600 mt-1 text-pretty max-w-2xl">{description}</p>}
      </div>
      {children}
    </div>
  );
}
