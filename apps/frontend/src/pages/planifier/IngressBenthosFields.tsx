export function IngressBenthosFields({
  ingressViaBenthos,
  onIngressViaBenthos,
  benthosStream,
  onBenthosStream,
  ingestionToken,
  onIngestionToken,
}: {
  ingressViaBenthos: boolean;
  onIngressViaBenthos: (v: boolean) => void;
  benthosStream: string;
  onBenthosStream: (v: string) => void;
  ingestionToken: string;
  onIngestionToken: (v: string) => void;
}) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={ingressViaBenthos}
          onChange={(e) => onIngressViaBenthos(e.target.checked)}
          className="mt-1 text-primary-600 rounded"
        />
        <span>
          <span className="text-sm font-medium text-slate-700">Ingérer via Benthos (Redis Stream)</span>
          <span className="block text-xs text-slate-500 mt-0.5">
            Les messages entrants passent par la file Redis consommée par Benthos avant le moteur (aligné routeur / worker).
          </span>
        </span>
      </label>
      {ingressViaBenthos && (
        <>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Nom du stream Redis</label>
            <input
              type="text"
              value={benthosStream}
              onChange={(e) => onBenthosStream(e.target.value)}
              placeholder="ingress:global"
              className="w-full max-w-lg px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Jeton d’ingestion (optionnel, routeur Redis)</label>
            <input
              type="text"
              value={ingestionToken}
              onChange={(e) => onIngestionToken(e.target.value)}
              placeholder="Synchronisé vers router:tokens si renseigné"
              className="w-full max-w-lg px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono text-sm"
            />
          </div>
        </>
      )}
    </div>
  );
}
