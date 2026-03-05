import { EdifactMessageType, ParsedOrder, ParsedInvoice } from './types';

const SEGMENT_TERMINATOR = "'";
const ELEMENT_SEPARATOR = '+';
const COMPONENT_SEPARATOR = ':';

export class EdifactGenerator {
  private sender = '';
  private receiver = '';
  private messageCounter = 0;

  constructor(sender: string, receiver: string) {
    this.sender = sender;
    this.receiver = receiver;
  }

  generateOrder(order: ParsedOrder): string {
    this.messageCounter++;
    const segments: string[] = [];
    const msgRef = `MSG${this.messageCounter.toString().padStart(6, '0')}`;
    const intRef = `INT${Date.now()}`;
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toISOString().slice(11, 15).replace(/:/g, '');

    segments.push(`UNA${COMPONENT_SEPARATOR}${ELEMENT_SEPARATOR}.? ${SEGMENT_TERMINATOR}`);
    segments.push(`UNB+UNOC:3+${this.sender}:14+${this.receiver}:14+${date}:${time}+${intRef}'`);
    segments.push(`UNH+${msgRef}+ORDERS:D:96A:UN'`);
    segments.push(`BGM+220+${order.orderNumber}+9'`);
    segments.push(`DTM+137:${order.orderDate.replace(/-/g, '')}:102'`);
    if (order.deliveryDate) segments.push(`DTM+2:${order.deliveryDate.replace(/-/g, '')}:102'`);
    segments.push(`NAD+BY+${order.buyerCode}::9${order.buyerName ? `+++${order.buyerName}` : ''}'`);
    segments.push(`NAD+SU+${order.sellerCode}::9${order.sellerName ? `+++${order.sellerName}` : ''}'`);

    order.lines.forEach((line, idx) => {
      segments.push(`LIN+${line.lineNumber || (idx + 1)}++${line.productCode}:EN'`);
      if (line.productDescription) segments.push(`IMD+F++:::${line.productDescription}'`);
      segments.push(`QTY+21:${line.quantity}:${line.unit || 'PCE'}'`);
      if (line.unitPrice !== undefined) segments.push(`PRI+AAA:${line.unitPrice.toFixed(2)}'`);
    });

    if (order.totalAmount !== undefined) segments.push(`MOA+86:${order.totalAmount.toFixed(2)}:${order.currency || 'EUR'}'`);
    
    const segmentCount = segments.filter(s => !s.startsWith('UNA') && !s.startsWith('UNB') && !s.startsWith('UNZ')).length + 1;
    segments.push(`UNT+${segmentCount}+${msgRef}'`);
    segments.push(`UNZ+1+${intRef}'`);

    return segments.join('\n');
  }

  generateInvoice(invoice: ParsedInvoice): string {
    this.messageCounter++;
    const segments: string[] = [];
    const msgRef = `MSG${this.messageCounter.toString().padStart(6, '0')}`;
    const intRef = `INT${Date.now()}`;
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toISOString().slice(11, 15).replace(/:/g, '');

    segments.push(`UNA${COMPONENT_SEPARATOR}${ELEMENT_SEPARATOR}.? ${SEGMENT_TERMINATOR}`);
    segments.push(`UNB+UNOC:3+${this.sender}:14+${this.receiver}:14+${date}:${time}+${intRef}'`);
    segments.push(`UNH+${msgRef}+INVOIC:D:96A:UN'`);
    segments.push(`BGM+380+${invoice.invoiceNumber}+9'`);
    segments.push(`DTM+137:${invoice.invoiceDate.replace(/-/g, '')}:102'`);
    if (invoice.dueDate) segments.push(`DTM+13:${invoice.dueDate.replace(/-/g, '')}:102'`);
    segments.push(`NAD+BY+${invoice.buyerCode}::9'`);
    segments.push(`NAD+SE+${invoice.sellerCode}::9'`);

    invoice.lines.forEach((line, idx) => {
      segments.push(`LIN+${line.lineNumber || (idx + 1)}++${line.productCode}:EN'`);
      if (line.description) segments.push(`IMD+F++:::${line.description}'`);
      segments.push(`QTY+47:${line.quantity}:${line.unit}'`);
      segments.push(`PRI+AAA:${line.unitPrice.toFixed(2)}'`);
      if (line.vatRate !== undefined) segments.push(`TAX+7+VAT+++:::${line.vatRate}'`);
      segments.push(`MOA+203:${line.totalPrice.toFixed(2)}:${invoice.currency}'`);
    });

    segments.push(`MOA+125:${invoice.subtotal.toFixed(2)}:${invoice.currency}'`);
    segments.push(`MOA+176:${invoice.vatAmount.toFixed(2)}:${invoice.currency}'`);
    segments.push(`MOA+86:${invoice.totalAmount.toFixed(2)}:${invoice.currency}'`);

    const segmentCount = segments.filter(s => !s.startsWith('UNA') && !s.startsWith('UNB') && !s.startsWith('UNZ')).length + 1;
    segments.push(`UNT+${segmentCount}+${msgRef}'`);
    segments.push(`UNZ+1+${intRef}'`);

    return segments.join('\n');
  }

  generateDesadv(data: { despatchNumber: string; orderNumber: string; shipDate: string; items: Array<{ productCode: string; quantity: number; sscc?: string }> }): string {
    this.messageCounter++;
    const segments: string[] = [];
    const msgRef = `MSG${this.messageCounter.toString().padStart(6, '0')}`;
    const intRef = `INT${Date.now()}`;
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toISOString().slice(11, 15).replace(/:/g, '');

    segments.push(`UNA${COMPONENT_SEPARATOR}${ELEMENT_SEPARATOR}.? ${SEGMENT_TERMINATOR}`);
    segments.push(`UNB+UNOC:3+${this.sender}:14+${this.receiver}:14+${date}:${time}+${intRef}'`);
    segments.push(`UNH+${msgRef}+DESADV:D:96A:UN'`);
    segments.push(`BGM+351+${data.despatchNumber}+9'`);
    segments.push(`DTM+11:${data.shipDate.replace(/-/g, '')}:102'`);
    segments.push(`RFF+ON:${data.orderNumber}'`);

    data.items.forEach((item, idx) => {
      segments.push(`CPS+${idx + 1}'`);
      if (item.sscc) segments.push(`PAC+1++CT'`);
      segments.push(`LIN+${idx + 1}++${item.productCode}:EN'`);
      segments.push(`QTY+12:${item.quantity}:PCE'`);
      if (item.sscc) segments.push(`GIN+BJ+${item.sscc}'`);
    });

    const segmentCount = segments.filter(s => !s.startsWith('UNA') && !s.startsWith('UNB') && !s.startsWith('UNZ')).length + 1;
    segments.push(`UNT+${segmentCount}+${msgRef}'`);
    segments.push(`UNZ+1+${intRef}'`);

    return segments.join('\n');
  }
}

export function createEdifactGenerator(sender: string, receiver: string): EdifactGenerator {
  return new EdifactGenerator(sender, receiver);
}
