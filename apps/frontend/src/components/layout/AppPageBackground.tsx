/**
 * Fond décoratif (dégradé + orbes) aligné sur les pages d’authentification,
 * réutilisable sous le contenu principal de toutes les zones shell.
 */
export function AppPageBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden page-bg-mesh min-h-full"
      aria-hidden
    >
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary-200/50 rounded-full blur-3xl animate-float" />
      <div
        className="absolute bottom-1/4 -right-20 w-96 h-96 bg-pastel-lavender/60 rounded-full blur-3xl animate-float"
        style={{ animationDelay: '-3s' }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] max-w-[100vw] max-h-[100vh] bg-pastel-mint/40 rounded-full blur-3xl" />
    </div>
  );
}
