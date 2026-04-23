import { parseEdifact } from './parser';
import type { EdifactMessage, EdifactSegment } from './types';

/**
 * Noms de documents (UN/EDIFACT 1001 — sous-ensemble fréquent).
 * @see https://service.unece.org/trade/untdid/d20a/tred/tred1001.htm
 */
export const BGM_DOCUMENT_NAME_LABELS: Record<string, string> = {
  '1': 'Mandat',
  '2': 'Bon de commande (ancien code)',
  '6': 'Partie d\'inventaire',
  '7': 'Bulletin d\'inventaire',
  '8': 'Bon de comptage d\'inventaire',
  '9': 'Bon de virement',
  '10': 'Facture d\'hôpital',
  '29': 'Accusé de réception',
  '50': 'État des entrées d\'hôpital',
  '61': 'Crédit',
  '200': 'Document d\'enlèvement',
  '201': 'Document d\'enlèvement d\'hôpital',
  '202': 'Document d\'enlèvement d\'hôpital 2',
  '203': 'Facture d\'hôpital 2',
  '204': 'Avis d\'enlèvement d\'hôpital',
  '220': 'Commande',
  '221': 'Achat',
  '222': 'Avis d\'enlèvement d\'hôpital 2',
  '240': 'Bon de retour d\'hôpital',
  '265': 'Fichier de prix (PRICAT)',
  '300': 'Avoir',
  '310': 'Demande d\'ouverture de compte bancaire',
  '350': 'Bon de comptage',
  '351': 'Avis d\'expédition (DESADV)',
  '375': 'Facture d\'hôpital 3',
  '380': 'Facture commerciale',
  '381': 'Avoir',
  '390': 'Facture de transport',
  '500': 'Demande d\'enlèvement d\'hôpital',
  '501': 'Avis d\'enlèvement d\'hôpital 3',
  '502': 'Avis d\'enlèvement d\'hôpital 4',
  '503': 'Avis d\'enlèvement d\'hôpital 5',
  '504': 'Avis d\'enlèvement d\'hôpital 6',
  '505': 'Avis d\'enlèvement d\'hôpital 7',
  '506': 'Avis d\'enlèvement d\'hôpital 8',
  '527': 'Accusé de commande (ORDRSP partiel)',
  '600': 'Facture d\'hôpital 4',
  '601': 'Facture d\'hôpital 5',
  '700': 'Bulletin d\'hôpital 2',
  '850': 'Bon d\'hôpital 2',
  '875': 'Bon d\'hôpital 3',
  '876': 'Bon d\'hôpital 4',
  '877': 'Bon d\'hôpital 5',
  '920': 'Bon d\'hôpital 6',
  '935': 'Bon d\'hôpital 7',
  '936': 'Bon d\'hôpital 8',
  '960': 'Bon d\'hôpital 9',
};

/** Libellé NAD/EDI courant (DE 3035). */
export const NAD_ROLE_LABELS: Record<string, string> = {
  BY: 'Acheteur (buyer)',
  SE: 'Vendeur (seller / invoicee)',
  SU: 'Fournisseur (supplier)',
  IV: 'Emetteur de la facture',
  DP: 'Point de livraison (deliver to)',
  ST: 'Expédié à (ship to)',
  UC: 'Destinataire final',
  CN: 'Consignataire',
  FW: 'Gestionnaire d\'entrepôt',
  WH: 'Entrepôt',
  SF: 'Expéditeur',
  AB: 'Payeur (buyer) annexe',
  PE: 'Bénéficiaire du paiement',
};

function formatDtmToIso(qual: string, raw: string, format: string | undefined): string {
  if (!raw) return raw;
  if (format === '102' && raw.length >= 8) {
    return `${raw.substring(0, 4)}-${raw.substring(4, 6)}-${raw.substring(6, 8)}`;
  }
  if (format === '203' && raw.length >= 8) {
    return `${raw.substring(0, 4)}-${raw.substring(4, 6)}-${raw.substring(6, 8)}T${raw.substring(8, 10) || '00'}:${raw.substring(10, 12) || '00'}:00.000Z`;
  }
  return raw;
}

function buildSegmentLine(seg: EdifactSegment, elemSep: string, compSep: string): string {
  if (seg.elements.length === 0) {
    return seg.tag;
  }
  const data = seg.elements
    .map((comps) => (comps && comps.length ? comps.join(compSep) : ''))
    .join(elemSep);
  return data ? seg.tag + elemSep + data : seg.tag;
}

function parseMoaAmount(
  seg: EdifactSegment,
): { qualifier: string; amount: number; currency?: string } | null {
  // MOA+79:1000.50:EUR:4+1:12'
  const c0 = seg.elements[0];
  if (!c0 || !c0[0]) return null;
  const qualifier = c0[0];
  const rawAmt = c0[1];
  if (!rawAmt) return { qualifier, amount: 0, currency: c0[2] };
  const amount = parseFloat(String(rawAmt).replace(',', '.'));
  if (Number.isNaN(amount)) return { qualifier, amount: 0, currency: c0[2] };
  return { qualifier, amount, currency: c0[2] };
}

/**
 * Aperçu structuré d\'un message EDIFACT (1er message UNH–UNT) pour suivi, facturation et affichage.
 */
export interface EdifactEnrichedMessage {
  unhType: string;
  bgm: {
    documentNameCode: string;
    documentNameLabel: string;
    messageNumber: string;
  };
  interchange: {
    sender: string;
    receiver: string;
    unbReference: string;
  };
  dtm: Array<{ qualifier: string; value: string; format?: string; dateIso: string }>;
  /** Date document (priorité DTM 137, 194, 182, 106…). */
  documentDate: string | null;
  nads: Array<{
    role: string;
    roleLabel: string;
    partyId: string;
    name?: string;
  }>;
  rff: Array<{ qualifier: string; reference: string }>;
  moa: Array<{ qualifier: string; amount: number; currency?: string }>;
  totalAmount: number | null;
  currency: string | null;
  segmentLines: Array<{ position: number; tag: string; line: string }>;
}

function extractFromMessage(
  message: EdifactMessage,
  interchange: { sender: string; receiver: string; unbReference: string },
  elemSep: string,
  compSep: string,
): EdifactEnrichedMessage {
  const segs = message.segments;
  const segmentLines: Array<{ position: number; tag: string; line: string }> = [];
  let pos = 0;
  for (const seg of segs) {
    pos += 1;
    segmentLines.push({
      position: pos,
      tag: seg.tag,
      line: buildSegmentLine(seg, elemSep, compSep) + "'",
    });
  }

  let bgmCode = '';
  let bgmNum = '';
  for (const seg of segs) {
    if (seg.tag === 'BGM') {
      bgmCode = seg.elements[0]?.[0] ?? '';
      bgmNum = seg.elements[1]?.[0] ?? '';
      break;
    }
  }
  if (!bgmCode) {
    bgmCode = message.type === 'INVOIC' ? '380' : message.type === 'ORDERS' ? '220' : '';
  }

  const dtm: EdifactEnrichedMessage['dtm'] = [];
  for (const seg of segs) {
    if (seg.tag === 'DTM' && seg.elements[0]) {
      const c = seg.elements[0];
      const q = c[0] ?? '';
      const v = c[1] ?? '';
      const f = c[2];
      dtm.push({ qualifier: q, value: v, format: f, dateIso: formatDtmToIso(q, v, f) });
    }
  }

  let documentDate: string | null = null;
  for (const q of ['137', '194', '106', '182', '4']) {
    const row = dtm.find((d) => d.qualifier === q);
    if (row) {
      documentDate = row.dateIso || row.value;
      break;
    }
  }

  const nads: EdifactEnrichedMessage['nads'] = [];
  for (const seg of segs) {
    if (seg.tag !== 'NAD') continue;
    const role = seg.elements[0]?.[0] ?? '';
    const partyId = seg.elements[1]?.[0] ?? '';
    const name = seg.elements[2]?.[0] || seg.elements[3]?.[0] || seg.elements[3]?.[3] || seg.elements[4]?.[0];
    nads.push({
      role,
      roleLabel: NAD_ROLE_LABELS[role] ?? role,
      partyId,
      name: name || undefined,
    });
  }

  const rff: EdifactEnrichedMessage['rff'] = [];
  for (const seg of segs) {
    if (seg.tag === 'RFF' && seg.elements[0]) {
      rff.push({
        qualifier: seg.elements[0][0] ?? '',
        reference: seg.elements[0][1] ?? '',
      });
    }
  }

  const moa: EdifactEnrichedMessage['moa'] = [];
  for (const seg of segs) {
    if (seg.tag !== 'MOA') continue;
    const p = parseMoaAmount(seg);
    if (p) moa.push(p);
  }

  let totalAmount: number | null = null;
  let currency: string | null = null;
  for (const q of ['86', '77', '79', '9', '176']) {
    const m = moa.find((x) => x.qualifier === q);
    if (m) {
      totalAmount = m.amount;
      if (m.currency) currency = m.currency;
      break;
    }
  }
  if (totalAmount == null) {
    for (const m of moa) {
      if (m.amount) {
        totalAmount = m.amount;
        if (m.currency) currency = m.currency;
        break;
      }
    }
  }
  for (const m of moa) {
    if (m.currency) {
      currency = m.currency;
      break;
    }
  }

  return {
    unhType: message.type,
    bgm: {
      documentNameCode: bgmCode,
      documentNameLabel: BGM_DOCUMENT_NAME_LABELS[bgmCode] ?? `Code ${bgmCode || '—'}`,
      messageNumber: bgmNum,
    },
    interchange: {
      sender: interchange.sender,
      receiver: interchange.receiver,
      unbReference: interchange.unbReference,
    },
    dtm,
    documentDate,
    nads,
    rff,
    moa,
    totalAmount,
    currency,
    segmentLines,
  };
}

export interface EnrichResult {
  ok: boolean;
  errorMessage?: string;
  enriched?: EdifactEnrichedMessage;
}

/**
 * Extrait aperçu (BGM, NAD, DTM, MOA, lignes de segments) du contenu EDIFACT.
 */
export function enrichEdifactContent(raw: string): EnrichResult {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) {
    return { ok: false, errorMessage: 'Contenu vide' };
  }
  try {
    const interchange = parseEdifact(trimmed);
    if (!interchange.messages || interchange.messages.length === 0) {
      return { ok: false, errorMessage: 'Aucun message (UNH–UNT) trouvé' };
    }
    const first = interchange.messages[0]!;
    const unb = trimmerToSeparators(trimmed);
    const enriched = extractFromMessage(
      first,
      {
        sender: interchange.sender,
        receiver: interchange.receiver,
        unbReference: interchange.reference,
      },
      unb.elemSep,
      unb.compSep,
    );
    return { ok: true, enriched };
  } catch (e) {
    return { ok: false, errorMessage: (e as Error).message };
  }
}

/** Même logique que EdifactParser.parseServiceStringAdvice (UNA). */
function trimmerToSeparators(data: string): { elemSep: string; compSep: string } {
  if (data.startsWith('UNA') && data.length >= 9) {
    return {
      compSep: data[3] ?? ':',
      elemSep: data[4] ?? '+',
    };
  }
  return { elemSep: '+', compSep: ':' };
}
