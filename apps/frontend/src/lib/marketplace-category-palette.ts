/**
 * Couleurs pastel par catégorie marketplace (tuiles + onglets), lisibles sans être trop saturées.
 */

export type MarketplaceCategoryPalette = {
  cardBg: string;
  cardBorder: string;
  cardBorderHover: string;
  iconWrap: string;
  endpointsBadge: string;
  endpointsIcon: string;
  categoryTag: string;
  tabSurface: string;
  tabSurfaceActive: string;
  tabRing: string;
};

const PALETTES: MarketplaceCategoryPalette[] = [
  {
    cardBg: 'bg-sky-50/85',
    cardBorder: 'border-sky-200/65',
    cardBorderHover: 'hover:border-sky-300/90',
    iconWrap: 'bg-sky-100/80 border-sky-200/60',
    endpointsBadge: 'bg-sky-100/90 border-sky-200/70 text-sky-900',
    endpointsIcon: 'text-sky-700',
    categoryTag: 'bg-sky-100/90 text-sky-800 border-sky-200/70',
    tabSurface: 'bg-sky-50/60 border-sky-200/50',
    tabSurfaceActive: 'bg-sky-100/90 border-sky-300/80',
    tabRing: 'ring-sky-400/35',
  },
  {
    cardBg: 'bg-violet-50/85',
    cardBorder: 'border-violet-200/60',
    cardBorderHover: 'hover:border-violet-300/85',
    iconWrap: 'bg-violet-100/75 border-violet-200/55',
    endpointsBadge: 'bg-violet-100/90 border-violet-200/65 text-violet-900',
    endpointsIcon: 'text-violet-700',
    categoryTag: 'bg-violet-100/90 text-violet-800 border-violet-200/65',
    tabSurface: 'bg-violet-50/55 border-violet-200/45',
    tabSurfaceActive: 'bg-violet-100/85 border-violet-300/75',
    tabRing: 'ring-violet-400/35',
  },
  {
    cardBg: 'bg-emerald-50/85',
    cardBorder: 'border-emerald-200/60',
    cardBorderHover: 'hover:border-emerald-300/85',
    iconWrap: 'bg-emerald-100/75 border-emerald-200/55',
    endpointsBadge: 'bg-emerald-100/90 border-emerald-200/65 text-emerald-900',
    endpointsIcon: 'text-emerald-700',
    categoryTag: 'bg-emerald-100/90 text-emerald-800 border-emerald-200/65',
    tabSurface: 'bg-emerald-50/55 border-emerald-200/45',
    tabSurfaceActive: 'bg-emerald-100/85 border-emerald-300/75',
    tabRing: 'ring-emerald-400/35',
  },
  {
    cardBg: 'bg-amber-50/88',
    cardBorder: 'border-amber-200/55',
    cardBorderHover: 'hover:border-amber-300/80',
    iconWrap: 'bg-amber-100/75 border-amber-200/50',
    endpointsBadge: 'bg-amber-100/90 border-amber-200/60 text-amber-950',
    endpointsIcon: 'text-amber-800',
    categoryTag: 'bg-amber-100/90 text-amber-900 border-amber-200/60',
    tabSurface: 'bg-amber-50/55 border-amber-200/40',
    tabSurfaceActive: 'bg-amber-100/85 border-amber-300/70',
    tabRing: 'ring-amber-400/40',
  },
  {
    cardBg: 'bg-rose-50/85',
    cardBorder: 'border-rose-200/58',
    cardBorderHover: 'hover:border-rose-300/82',
    iconWrap: 'bg-rose-100/75 border-rose-200/52',
    endpointsBadge: 'bg-rose-100/90 border-rose-200/62 text-rose-900',
    endpointsIcon: 'text-rose-700',
    categoryTag: 'bg-rose-100/90 text-rose-800 border-rose-200/62',
    tabSurface: 'bg-rose-50/52 border-rose-200/42',
    tabSurfaceActive: 'bg-rose-100/82 border-rose-300/72',
    tabRing: 'ring-rose-400/35',
  },
  {
    cardBg: 'bg-indigo-50/85',
    cardBorder: 'border-indigo-200/58',
    cardBorderHover: 'hover:border-indigo-300/82',
    iconWrap: 'bg-indigo-100/75 border-indigo-200/52',
    endpointsBadge: 'bg-indigo-100/90 border-indigo-200/62 text-indigo-900',
    endpointsIcon: 'text-indigo-700',
    categoryTag: 'bg-indigo-100/90 text-indigo-800 border-indigo-200/62',
    tabSurface: 'bg-indigo-50/52 border-indigo-200/42',
    tabSurfaceActive: 'bg-indigo-100/82 border-indigo-300/72',
    tabRing: 'ring-indigo-400/35',
  },
  {
    cardBg: 'bg-teal-50/85',
    cardBorder: 'border-teal-200/58',
    cardBorderHover: 'hover:border-teal-300/82',
    iconWrap: 'bg-teal-100/75 border-teal-200/52',
    endpointsBadge: 'bg-teal-100/90 border-teal-200/62 text-teal-900',
    endpointsIcon: 'text-teal-700',
    categoryTag: 'bg-teal-100/90 text-teal-800 border-teal-200/62',
    tabSurface: 'bg-teal-50/52 border-teal-200/42',
    tabSurfaceActive: 'bg-teal-100/82 border-teal-300/72',
    tabRing: 'ring-teal-400/35',
  },
  {
    cardBg: 'bg-orange-50/88',
    cardBorder: 'border-orange-200/55',
    cardBorderHover: 'hover:border-orange-300/80',
    iconWrap: 'bg-orange-100/75 border-orange-200/50',
    endpointsBadge: 'bg-orange-100/90 border-orange-200/60 text-orange-950',
    endpointsIcon: 'text-orange-800',
    categoryTag: 'bg-orange-100/90 text-orange-900 border-orange-200/60',
    tabSurface: 'bg-orange-50/52 border-orange-200/40',
    tabSurfaceActive: 'bg-orange-100/82 border-orange-300/70',
    tabRing: 'ring-orange-400/38',
  },
];

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function normalizeCategory(name: string): string {
  return name.toLowerCase().trim();
}

/** Libellé affiché (PA = libellé long). */
export function formatMarketplaceCategoryLabel(name: string): string {
  return name === 'PA' ? "Plateformes d'agrément (PA)" : name;
}

/**
 * Attribue une palette stable par nom de catégorie, avec quelques correspondances sémantiques.
 */
export function getMarketplaceCategoryPalette(categoryName: string): MarketplaceCategoryPalette {
  const n = normalizeCategory(categoryName);

  if (n === 'pa' || n.includes('plateforme')) return PALETTES[5];
  if (n.includes('e-commerce') || n.includes('ecommerce') || n.includes('shop')) return PALETTES[3];
  if (
    n.includes('compta') ||
    n.includes('accounting') ||
    n === 'comptabilité' ||
    n.includes('erp')
  )
    return PALETTES[2];
  if (n.includes('crm') || n.includes('vente')) return PALETTES[4];
  if (n.includes('fichier') || n.includes('edi') || n.includes('as2')) return PALETTES[0];
  if (n.includes('paiement') || n.includes('payment') || n.includes('stripe')) return PALETTES[7];
  if (n.includes('pos') || n.includes('pms') || n.includes('horeca')) return PALETTES[7];
  if (n.includes('messagerie') || n.includes('slack')) return PALETTES[1];
  if (n.includes('projet') || n.includes('project') || n.includes('tâche')) return PALETTES[6];

  return PALETTES[simpleHash(categoryName) % PALETTES.length];
}

export const ALL_TAB_PALETTE: Pick<
  MarketplaceCategoryPalette,
  'tabSurface' | 'tabSurfaceActive' | 'tabRing' | 'categoryTag'
> = {
  tabSurface: 'bg-white/70 border-slate-200/70',
  tabSurfaceActive: 'bg-slate-100/90 border-slate-300/80',
  tabRing: 'ring-slate-400/30',
  categoryTag: 'bg-slate-100 text-slate-700 border-slate-200/80',
};
