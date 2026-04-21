import { apiClient } from './client';

export type EdifactMessageType = 'ORDERS' | 'HANMOV' | 'INVOIC' | 'PRICAT' | 'DESADV' | 'ORDRSP' | string;
export type EdifactDirection = 'INBOUND' | 'OUTBOUND';

export interface EdifactMessage {
  id: string;
  type: EdifactMessageType;
  direction: EdifactDirection;
  reference?: string | null;
  partnerId?: string | null;
  status: string;
  createdAt: string;
  sentAt?: string | null;
}

export interface EdifactMessagesParams {
  type?: EdifactMessageType;
  direction?: EdifactDirection;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface EdifactMessagesResponse {
  messages: EdifactMessage[];
  total: number;
}

export interface SendEdifactDto {
  type: EdifactMessageType;
  payload: Record<string, unknown>;
  partnerId?: string;
  reference?: string;
}

export const edifactApi = {
  getMessages(params?: EdifactMessagesParams): Promise<EdifactMessagesResponse> {
    const search = new URLSearchParams();
    if (params?.type) search.set('type', params.type);
    if (params?.direction) search.set('direction', params.direction);
    if (params?.from) search.set('from', params.from);
    if (params?.to) search.set('to', params.to);
    if (params?.limit != null) search.set('limit', String(params.limit));
    if (params?.offset != null) search.set('offset', String(params.offset));
    const qs = search.toString();
    return apiClient.get<EdifactMessagesResponse>(`/edifact/messages${qs ? `?${qs}` : ''}`);
  },

  send(data: SendEdifactDto): Promise<EdifactMessage> {
    return apiClient.post<EdifactMessage>('/edifact/send', data);
  },
};
