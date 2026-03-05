import { EdifactParser, parseEdifact } from './parser';
import { EdifactGenerator, createEdifactGenerator } from './generator';
import { EdifactValidator, validateEdifact } from './validator';

describe('EdifactParser', () => {
  const sampleOrder = `UNA:+.? '
UNB+UNOC:3+SENDER:14+RECEIVER:14+20240115:1030+INT001'
UNH+MSG001+ORDERS:D:96A:UN'
BGM+220+ORD12345+9'
DTM+137:20240115:102'
DTM+2:20240120:102'
NAD+BY+BUYER001::9+++Acheteur SA'
NAD+SU+SELLER001::9+++Vendeur SARL'
LIN+1++PROD001:EN'
IMD+F++:::Produit Test'
QTY+21:10:PCE'
PRI+AAA:25.50'
LIN+2++PROD002:EN'
QTY+21:5:PCE'
PRI+AAA:45.00'
MOA+86:480.00:EUR'
UNT+14+MSG001'
UNZ+1+INT001'`;

  it('should parse EDIFACT interchange', () => {
    const parser = new EdifactParser();
    const interchange = parser.parse(sampleOrder);

    expect(interchange.sender).toBe('SENDER');
    expect(interchange.receiver).toBe('RECEIVER');
    expect(interchange.messages).toHaveLength(1);
    expect(interchange.messages[0].type).toBe('ORDERS');
  });

  it('should extract order data', () => {
    const parser = new EdifactParser();
    const order = parser.parseOrder(sampleOrder);

    expect(order.orderNumber).toBe('ORD12345');
    expect(order.orderDate).toBe('2024-01-15');
    expect(order.buyerCode).toBe('BUYER001');
    expect(order.sellerCode).toBe('SELLER001');
    expect(order.lines).toHaveLength(2);
    expect(order.lines[0].productCode).toBe('PROD001');
    expect(order.lines[0].quantity).toBe(10);
    expect(order.lines[0].unitPrice).toBe(25.50);
  });
});

describe('EdifactGenerator', () => {
  it('should generate valid ORDERS message', () => {
    const generator = createEdifactGenerator('SENDER', 'RECEIVER');
    const edifact = generator.generateOrder({
      orderNumber: 'ORD001',
      orderDate: '2024-01-15',
      buyerCode: 'BUY001',
      sellerCode: 'SEL001',
      lines: [
        { lineNumber: '1', productCode: 'PROD001', quantity: 10, unit: 'PCE', unitPrice: 25.50 },
      ],
      totalAmount: 255.00,
      currency: 'EUR',
    });

    expect(edifact).toContain('ORDERS:D:96A:UN');
    expect(edifact).toContain('BGM+220+ORD001');
    expect(edifact).toContain('PROD001:EN');
    expect(edifact).toContain('QTY+21:10:PCE');
  });

  it('should generate valid INVOIC message', () => {
    const generator = createEdifactGenerator('SENDER', 'RECEIVER');
    const edifact = generator.generateInvoice({
      invoiceNumber: 'INV001',
      invoiceDate: '2024-01-15',
      buyerCode: 'BUY001',
      sellerCode: 'SEL001',
      lines: [{ lineNumber: '1', productCode: 'PROD001', quantity: 10, unit: 'PCE', unitPrice: 25.50, totalPrice: 255.00 }],
      subtotal: 255.00,
      vatAmount: 51.00,
      totalAmount: 306.00,
      currency: 'EUR',
    });

    expect(edifact).toContain('INVOIC:D:96A:UN');
    expect(edifact).toContain('BGM+380+INV001');
  });

  it('should generate valid DESADV message', () => {
    const generator = createEdifactGenerator('SENDER', 'RECEIVER');
    const edifact = generator.generateDesadv({
      despatchNumber: 'DES001',
      orderNumber: 'ORD001',
      shipDate: '2024-01-15',
      items: [{ productCode: 'PROD001', quantity: 10 }],
    });

    expect(edifact).toContain('DESADV:D:96A:UN');
    expect(edifact).toContain('BGM+351+DES001');
  });
});

describe('EdifactValidator', () => {
  it('should validate correct EDIFACT', () => {
    const validEdifact = `UNA:+.? '
UNB+UNOC:3+SENDER:14+RECEIVER:14+20240115:1030+INT001'
UNH+MSG001+ORDERS:D:96A:UN'
BGM+220+ORD001+9'
DTM+137:20240115:102'
NAD+BY+BUY001::9'
NAD+SU+SEL001::9'
LIN+1++PROD001:EN'
QTY+21:10:PCE'
UNT+8+MSG001'
UNZ+1+INT001'`;

    const result = validateEdifact(validEdifact);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing mandatory segments', () => {
    const invalidEdifact = `UNA:+.? '
UNB+UNOC:3+SENDER:14+RECEIVER:14+20240115:1030+INT001'
UNH+MSG001+ORDERS:D:96A:UN'
BGM+220+ORD001+9'
UNT+3+MSG001'
UNZ+1+INT001'`;

    const result = validateEdifact(invalidEdifact);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('DTM'))).toBe(true);
  });

  it('should detect invalid dates', () => {
    const invalidDateEdifact = `UNA:+.? '
UNB+UNOC:3+SENDER:14+RECEIVER:14+20240115:1030+INT001'
UNH+MSG001+ORDERS:D:96A:UN'
BGM+220+ORD001+9'
DTM+137:99999999:102'
NAD+BY+BUY001::9'
LIN+1++PROD001:EN'
QTY+21:10:PCE'
UNT+7+MSG001'
UNZ+1+INT001'`;

    const result = validateEdifact(invalidDateEdifact);
    expect(result.errors.some(e => e.message.includes('date'))).toBe(true);
  });
});
