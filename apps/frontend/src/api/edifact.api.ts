import { apiClient } from './client';

export type EdifactMessageType = 'ORDERS' | 'HANMOV' | 'INVOIC' | 'PRICAT' | 'DESADV' | 'ORDRSP' | string;
export type EdifactDirection = 'INBOUND' | 'OUTBOUND';

export interface EdifactNad {
  role: string;
  roleLabel: string;
  partyId: string;
  name?: string;
}

export interface EdifactEnrichment {
  unhType: string;
  bgm: { documentNameCode: string; documentNameLabel: string; messageNumber: string };
  interchange: { sender: string; receiver: string; unbReference: string };
  dtm: Array<{ qualifier: string; value: string; format?: string; dateIso: string }>;
  documentDate: string | null;
  nads: EdifactNad[];
  rff: Array<{ qualifier: string; reference: string }>;
  moa: Array<{ qualifier: string; amount: number; currency?: string }>;
  totalAmount: number | null;
  currency: string | null;
  segmentLines: Array<{ position: number; tag: string; line: string }>;
}

export interface EdifactMessage {
  id: string;
  type: EdifactMessageType;
  direction: EdifactDirection;
  reference?: string | null;
  bgmCode?: string | null;
  documentDate?: string | null;
  totalAmount?: number | null;
  currency?: string | null;
  sender?: string;
  receiver?: string;
  status: string;
  billed: boolean;
  billedAt?: string | null;
  rawContent?: string;
  receivedAt: string;
  errorMessage?: string | null;
  enrichment?: EdifactEnrichment;
  enrichError?: string;
}

export interface EdifactMessagesParams {
  type?: EdifactMessageType;
  direction?: EdifactDirection;
  billed?: boolean;
  from?: string;
  to?: string;
  documentFrom?: string;
  documentTo?: string;
  includeRaw?: boolean;
  limit?: number;
  offset?: number;
}

export interface EdifactMessagesResponse {
  messages: EdifactMessage[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface GenerateEdifactRequest {
  type: string;
  sender: string;
  receiver: string;
  data: Record<string, unknown>;
}

export const edifactApi = {
  getMessages(params?: EdifactMessagesParams): Promise<EdifactMessagesResponse> {
    const search = new URLSearchParams();
    if (params?.type) search.set('type', params.type);
    if (params?.direction) search.set('direction', params.direction);
    if (params?.billed != null) search.set('billed', String(params.billed));
    if (params?.from) search.set('from', params.from);
    if (params?.to) search.set('to', params.to);
    if (params?.documentFrom) search.set('documentFrom', params.documentFrom);
    if (params?.documentTo) search.set('documentTo', params.documentTo);
    if (params?.includeRaw) search.set('includeRaw', 'true');
    if (params?.limit != null) search.set('limit', String(params.limit));
    if (params?.offset != null) search.set('offset', String(params.offset));
    const qs = search.toString();
    return apiClient
      .get<{
        items: EdifactMessage[];
        messages?: EdifactMessage[];
        total: number;
        page: number;
        pageSize: number;
      }>(`/edifact/messages${qs ? `?${qs}` : ''}`)
      .then((res) => ({
        messages: res.messages ?? res.items,
        total: res.total,
        page: res.page,
        pageSize: res.pageSize,
      }));
  },

  getMessage(id: string): Promise<EdifactMessage> {
    return apiClient.get<EdifactMessage>(`/edifact/messages/${id}`);
  },

  setBilling(
    id: string,
    body: { billed: boolean },
  ): Promise<EdifactMessage> {
    return apiClient.patch<EdifactMessage>(`/edifact/messages/${id}/billing`, body);
  },

  /** Réception d'un fichier brut côté API (INTÉGRATION) */
  receiveContent(content: string): Promise<unknown> {
    return apiClient.post('/edifact/receive', { content });
  },

  /**
   * Génère un EDIFACT et l’enregistre en base (OUTBOUND).
   * Correspond à `POST /api/v1/edifact/generate` (data = payload métier, pas { payload }).
   */
  generate(data: GenerateEdifactRequest): Promise<{ raw: string; message: EdifactMessage }> {
    return apiClient.post('/edifact/generate', {
      type: data.type,
      sender: data.sender,
      receiver: data.receiver,
      data: data.data,
    });
  },
};
