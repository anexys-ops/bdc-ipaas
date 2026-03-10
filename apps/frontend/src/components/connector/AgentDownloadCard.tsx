import { Download, Monitor, Apple } from 'lucide-react';

const AGENT_CONNECTORS = ['ebp-sdk', 'sage-100', 'sage-x3', 'sage-psc'] as const;

export type AgentConnectorId = (typeof AGENT_CONNECTORS)[number];

export function isAgentConnector(id: string): id is AgentConnectorId {
  return AGENT_CONNECTORS.includes(id as AgentConnectorId);
}

interface AgentDownloadCardProps {
  connectorName: string;
  connectorId: string;
  version: string;
  /** Lien ou nom de fichier pour Windows (bidon si non fourni) */
  windowsFile?: string;
  /** Lien ou nom de fichier pour Mac (bidon si non fourni) */
  macFile?: string;
}

/** Fichiers bidon : pas de vrai téléchargement, design SaaS pour PC/Mac */
const PLACEHOLDER_DOWNLOAD = '#';

export function AgentDownloadCard({
  connectorName,
  connectorId,
  version,
  windowsFile = `agent-${connectorId}-${version}-win.exe`,
  macFile = `agent-${connectorId}-${version}-mac.dmg`,
}: AgentDownloadCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 via-white to-primary-50/30 shadow-lg">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-200/20 rounded-full -translate-y-1/2 translate-x-1/2" aria-hidden />
      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold border border-primary-200">
                <Download className="w-4 h-4" />
                Agent à installer
              </span>
              <span className="inline-flex px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium border border-slate-200">
                v{version}
              </span>
            </div>
            <h2 className="mt-4 text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Téléchargez l’agent {connectorName}
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base max-w-xl leading-relaxed">
              Pour connecter votre poste à la plateforme, installez l’agent sur votre ordinateur (Windows ou Mac).
              Une fois installé, associez-le à votre compte depuis la page de configuration du connecteur pour
              activer la synchronisation des données.
            </p>
          </div>
          <div className="flex flex-col gap-3 shrink-0 sm:min-w-[200px]">
            <a
              href={PLACEHOLDER_DOWNLOAD}
              className="inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-semibold text-sm bg-slate-800 text-white hover:bg-slate-700 border-2 border-slate-700 shadow-sm transition-colors"
              download={windowsFile}
            >
              <Monitor className="w-5 h-5" />
              PC (Windows)
            </a>
            <a
              href={PLACEHOLDER_DOWNLOAD}
              className="inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-semibold text-sm bg-slate-100 text-slate-800 hover:bg-slate-200 border-2 border-slate-200 shadow-sm transition-colors"
              download={macFile}
            >
              <Apple className="w-5 h-5" />
              Mac
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
