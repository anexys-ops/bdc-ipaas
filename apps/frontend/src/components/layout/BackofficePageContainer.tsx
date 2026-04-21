interface BackofficePageContainerProps {
  children: React.ReactNode;
}

export function BackofficePageContainer({ children }: BackofficePageContainerProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {children}
    </div>
  );
}
