import { EdifactSegment, EdifactInterchange, EdifactMessage, EdifactMessageType, ParsedOrder, ParsedInvoice, OrderLine } from './types';

const SEGMENT_TERMINATOR = "'";
const ELEMENT_SEPARATOR = '+';
const COMPONENT_SEPARATOR = ':';
const RELEASE_CHARACTER = '?';

export class EdifactParser {
  private componentSeparator = COMPONENT_SEPARATOR;
  private elementSeparator = ELEMENT_SEPARATOR;
  private segmentTerminator = SEGMENT_TERMINATOR;

  parse(edifactData: string): EdifactInterchange {
    const cleaned = this.cleanInput(edifactData);
    this.parseServiceStringAdvice(cleaned);
    const segments = this.parseSegments(cleaned);
    return this.buildInterchange(segments);
  }

  parseMessage(edifactData: string): EdifactMessage {
    const interchange = this.parse(edifactData);
    if (interchange.messages.length === 0) throw new Error('Aucun message trouvé dans l\'interchange');
    return interchange.messages[0];
  }

  parseOrder(edifactData: string): ParsedOrder {
    const message = this.parseMessage(edifactData);
    if (message.type !== 'ORDERS') throw new Error(`Type de message invalide: ${message.type}, attendu: ORDERS`);
    return this.extractOrderData(message.segments);
  }

  parseInvoice(edifactData: string): ParsedInvoice {
    const message = this.parseMessage(edifactData);
    if (message.type !== 'INVOIC') throw new Error(`Type de message invalide: ${message.type}, attendu: INVOIC`);
    return this.extractInvoiceData(message.segments);
  }

  private cleanInput(input: string): string {
    return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '').trim();
  }

  private parseServiceStringAdvice(data: string): void {
    if (data.startsWith('UNA')) {
      this.componentSeparator = data[3];
      this.elementSeparator = data[4];
      this.segmentTerminator = data[8] || SEGMENT_TERMINATOR;
    }
  }

  private parseSegments(data: string): EdifactSegment[] {
    const segments: EdifactSegment[] = [];
    const raw = data.startsWith('UNA') ? data.substring(9) : data;
    const parts = this.splitWithEscape(raw, this.segmentTerminator);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const elements = this.splitWithEscape(trimmed, this.elementSeparator);
      const tag = elements[0];
      const parsedElements = elements.slice(1).map(el => this.splitWithEscape(el, this.componentSeparator));
      segments.push({ tag, elements: parsedElements });
    }
    return segments;
  }

  private splitWithEscape(input: string, separator: string): string[] {
    const result: string[] = [];
    let current = '';
    let i = 0;
    while (i < input.length) {
      if (input[i] === RELEASE_CHARACTER && i + 1 < input.length) {
        current += input[i + 1];
        i += 2;
      } else if (input[i] === separator) {
        result.push(current);
        current = '';
        i++;
      } else {
        current += input[i];
        i++;
      }
    }
    result.push(current);
    return result;
  }

  private buildInterchange(segments: EdifactSegment[]): EdifactInterchange {
    const unbSeg = segments.find(s => s.tag === 'UNB');
    const messages: EdifactMessage[] = [];
    let currentMessage: EdifactSegment[] = [];
    let messageType: EdifactMessageType | null = null;
    let messageRef = '';

    for (const seg of segments) {
      if (seg.tag === 'UNH') {
        currentMessage = [seg];
        messageType = (seg.elements[1]?.[0] as EdifactMessageType) || null;
        messageRef = seg.elements[0]?.[0] || '';
      } else if (seg.tag === 'UNT') {
        if (messageType && currentMessage.length > 0) {
          messages.push({ type: messageType, reference: messageRef, segments: [...currentMessage, seg] });
        }
        currentMessage = [];
        messageType = null;
      } else if (currentMessage.length > 0) {
        currentMessage.push(seg);
      }
    }

    // UNB format: UNB+UNOC:3+SENDER:14+RECEIVER:14+DATE:TIME+REF
    // elements[0] = syntax (UNOC:3), elements[1] = sender (SENDER:14), elements[2] = receiver
    return {
      sender: unbSeg?.elements[1]?.[0] || '',
      receiver: unbSeg?.elements[2]?.[0] || '',
      date: unbSeg?.elements[3]?.[0] || '',
      time: unbSeg?.elements[3]?.[1] || '',
      reference: unbSeg?.elements[4]?.[0] || '',
      messages,
    };
  }

  private extractOrderData(segments: EdifactSegment[]): ParsedOrder {
    const order: ParsedOrder = { orderNumber: '', orderDate: '', buyerCode: '', sellerCode: '', lines: [] };
    let currentLine: Partial<OrderLine> = {};

    for (const seg of segments) {
      switch (seg.tag) {
        case 'BGM': order.orderNumber = seg.elements[1]?.[0] || ''; break;
        case 'DTM':
          const dtmQualifier = seg.elements[0]?.[0];
          const dtmValue = seg.elements[0]?.[1];
          if (dtmQualifier === '137') order.orderDate = this.formatDate(dtmValue);
          else if (dtmQualifier === '2') order.deliveryDate = this.formatDate(dtmValue);
          break;
        case 'NAD':
          const nadQualifier = seg.elements[0]?.[0];
          if (nadQualifier === 'BY') { order.buyerCode = seg.elements[1]?.[0] || ''; order.buyerName = seg.elements[3]?.[0]; }
          else if (nadQualifier === 'SE' || nadQualifier === 'SU') { order.sellerCode = seg.elements[1]?.[0] || ''; order.sellerName = seg.elements[3]?.[0]; }
          break;
        case 'LIN':
          if (currentLine.lineNumber) order.lines.push(currentLine as OrderLine);
          currentLine = { lineNumber: seg.elements[0]?.[0] || '', productCode: seg.elements[2]?.[0] || '' };
          break;
        case 'QTY':
          if (seg.elements[0]?.[0] === '21') {
            currentLine.quantity = parseFloat(seg.elements[0]?.[1] || '0');
            currentLine.unit = seg.elements[0]?.[2] || 'PCE';
          }
          break;
        case 'PRI':
          currentLine.unitPrice = parseFloat(seg.elements[0]?.[1] || '0');
          break;
        case 'IMD':
          currentLine.productDescription = seg.elements[2]?.[3] || seg.elements[2]?.[0];
          break;
        case 'MOA':
          if (seg.elements[0]?.[0] === '86') order.totalAmount = parseFloat(seg.elements[0]?.[1] || '0');
          if (seg.elements[0]?.[2]) order.currency = seg.elements[0]?.[2];
          break;
      }
    }
    if (currentLine.lineNumber) order.lines.push(currentLine as OrderLine);
    return order;
  }

  private extractInvoiceData(segments: EdifactSegment[]): ParsedInvoice {
    const invoice: ParsedInvoice = { invoiceNumber: '', invoiceDate: '', buyerCode: '', sellerCode: '', lines: [], subtotal: 0, vatAmount: 0, totalAmount: 0, currency: 'EUR' };
    let currentLine: Record<string, unknown> = {};

    for (const seg of segments) {
      switch (seg.tag) {
        case 'BGM': invoice.invoiceNumber = seg.elements[1]?.[0] || ''; break;
        case 'DTM':
          if (seg.elements[0]?.[0] === '137') invoice.invoiceDate = this.formatDate(seg.elements[0]?.[1]);
          else if (seg.elements[0]?.[0] === '13') invoice.dueDate = this.formatDate(seg.elements[0]?.[1]);
          break;
        case 'NAD':
          if (seg.elements[0]?.[0] === 'BY') invoice.buyerCode = seg.elements[1]?.[0] || '';
          else if (seg.elements[0]?.[0] === 'SE') invoice.sellerCode = seg.elements[1]?.[0] || '';
          break;
        case 'LIN':
          if (currentLine.lineNumber) invoice.lines.push(currentLine as typeof invoice.lines[0]);
          currentLine = { lineNumber: seg.elements[0]?.[0] || '', productCode: seg.elements[2]?.[0] || '', quantity: 0, unit: 'PCE', unitPrice: 0, totalPrice: 0 };
          break;
        case 'QTY': currentLine.quantity = parseFloat(seg.elements[0]?.[1] || '0'); currentLine.unit = seg.elements[0]?.[2] || 'PCE'; break;
        case 'PRI': currentLine.unitPrice = parseFloat(seg.elements[0]?.[1] || '0'); break;
        case 'TAX': currentLine.vatRate = parseFloat(seg.elements[4]?.[3] || '0'); break;
        case 'MOA':
          const qualifier = seg.elements[0]?.[0];
          const amount = parseFloat(seg.elements[0]?.[1] || '0');
          if (qualifier === '203') currentLine.totalPrice = amount;
          else if (qualifier === '125') invoice.subtotal = amount;
          else if (qualifier === '176') invoice.vatAmount = amount;
          else if (qualifier === '86') invoice.totalAmount = amount;
          if (seg.elements[0]?.[2]) invoice.currency = seg.elements[0]?.[2];
          break;
      }
    }
    if (currentLine.lineNumber) invoice.lines.push(currentLine as typeof invoice.lines[0]);
    return invoice;
  }

  private formatDate(edifactDate?: string): string {
    if (!edifactDate || edifactDate.length < 8) return edifactDate || '';
    return `${edifactDate.substring(0, 4)}-${edifactDate.substring(4, 6)}-${edifactDate.substring(6, 8)}`;
  }

  getElement(segment: EdifactSegment, elementIndex: number, componentIndex = 0): string {
    return segment.elements[elementIndex]?.[componentIndex] || '';
  }
}

export function parseEdifact(data: string): EdifactInterchange {
  return new EdifactParser().parse(data);
}
