export type EdifactMessageType = 'ORDERS' | 'INVOIC' | 'DESADV' | 'PRICAT' | 'RECADV';

export interface EdifactSegment {
  tag: string;
  elements: string[][];
}

export interface EdifactInterchange {
  sender: string;
  receiver: string;
  date: string;
  time: string;
  reference: string;
  messages: EdifactMessage[];
}

export interface EdifactMessage {
  /** Type issu du UNH (ex. ORDERS, INVOIC, HANMOV). */
  type: string;
  reference: string;
  segments: EdifactSegment[];
  data?: Record<string, unknown>;
}

export interface OrderLine {
  lineNumber: string;
  productCode: string;
  productDescription?: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
}

export interface ParsedOrder {
  orderNumber: string;
  orderDate: string;
  buyerCode: string;
  buyerName?: string;
  sellerCode: string;
  sellerName?: string;
  deliveryDate?: string;
  deliveryAddress?: { street?: string; city?: string; postalCode?: string; country?: string };
  lines: OrderLine[];
  totalAmount?: number;
  currency?: string;
}

export interface ParsedInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  buyerCode: string;
  sellerCode: string;
  lines: Array<{ lineNumber: string; productCode: string; description?: string; quantity: number; unit: string; unitPrice: number; vatRate?: number; totalPrice: number }>;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
}

export interface ValidationError {
  segment: string;
  position: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}
