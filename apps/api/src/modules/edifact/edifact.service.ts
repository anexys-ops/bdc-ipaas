import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '../../generated/tenant';
import { readFile } from 'fs/promises';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { TenantsService } from '../tenants/tenants.service';
import type { GenerateEdifactDto, EdifactMessageTypeDto } from './dto';

const DIRECTION_INBOUND = 'INBOUND';
const STATUS_RECEIVED = 'RECEIVED';
const STATUS_ERROR = 'ERROR';

type EdifactMessageType = 'ORDERS' | 'INVOIC' | 'DESADV' | 'PRICAT' | 'RECADV' | 'UNKNOWN';

interface EdifactParsedMessage {
  type: EdifactMessageType;
  reference: string;
  data?: Record<string, unknown>;
}

interface EdifactInterchange {
  sender: string;
  receiver: string;
  messages: EdifactParsedMessage[];
}

interface ParsedOrder {
  orderNumber: string;
  orderDate: string;
  buyerCode: string;
  sellerCode: string;
  lines: Array<{ productCode: string; quantity: number; unitPrice?: number }>;
}

interface ParsedInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  buyerCode: string;
  sellerCode: string;
  lines: Array<{ productCode: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
}

interface ValidationResult {
  valid: boolean;
  errors: Array<{ segment: string; position: number; message: string; severity: string }>;
  warnings: Array<{ segment: string; position: number; message: string; severity: string }>;
}

function parseEdifact(content: string): EdifactInterchange {
  if (!content.includes('UNH+')) {
    throw new Error('Message EDIFACT invalide: segment UNH manquant');
  }
  const senderMatch = content.match(/UNB\+[^+]*\+([^+']+)/);
  const receiverMatch = content.match(/UNB\+[^+]*\+[^+']+\+([^+']+)/);
  const messageTypeMatch = content.match(/UNH\+[^+]*\+([A-Z0-9]+)/);
  const referenceMatch = content.match(/BGM\+[^+]*\+([^+']+)/);
  const type = (messageTypeMatch?.[1] ?? 'UNKNOWN') as EdifactMessageType;
  return {
    sender: senderMatch?.[1] ?? '',
    receiver: receiverMatch?.[1] ?? '',
    messages: [
      {
        type,
        reference: referenceMatch?.[1] ?? '',
        data: {},
      },
    ],
  };
}

function validateEdifact(content: string): ValidationResult {
  const errors: Array<{ segment: string; position: number; message: string; severity: string }> = [];
  if (!content.includes('UNB+')) {
    errors.push({ segment: 'UNB', position: 0, message: 'Segment UNB manquant', severity: 'error' });
  }
  if (!content.includes('UNH+')) {
    errors.push({ segment: 'UNH', position: 0, message: 'Segment UNH manquant', severity: 'error' });
  }
  if (!content.includes('UNT+')) {
    errors.push({ segment: 'UNT', position: 0, message: 'Segment UNT manquant', severity: 'error' });
  }
  if (!content.includes('UNZ+')) {
    errors.push({ segment: 'UNZ', position: 0, message: 'Segment UNZ manquant', severity: 'error' });
  }
  return { valid: errors.length === 0, errors, warnings: [] };
}

function createEdifactGenerator(sender: string, receiver: string): {
  generateOrder: (order: ParsedOrder) => string;
  generateInvoice: (invoice: ParsedInvoice) => string;
  generateDesadv: (desadv: {
    despatchNumber: string;
    orderNumber: string;
    shipDate: string;
    items: Array<{ productCode: string; quantity: number; sscc?: string }>;
  }) => string;
} {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const interchangeRef = `${y}${m}${d}${hh}${mm}`;
  const header = `UNB+UNOC:3+${sender}+${receiver}+${y}${m}${d}:${hh}${mm}+${interchangeRef}'`;
  const trailer = `UNZ+1+${interchangeRef}'`;
  return {
    generateOrder: (order) =>
      [
        header,
        `UNH+1+ORDERS:D:96A:UN'`,
        `BGM+220+${order.orderNumber}+9'`,
        `DTM+137:${order.orderDate}:102'`,
        `NAD+BY+${order.buyerCode}::9'`,
        `NAD+SU+${order.sellerCode}::9'`,
        `UNT+6+1'`,
        trailer,
      ].join('\n'),
    generateInvoice: (invoice) =>
      [
        header,
        `UNH+1+INVOIC:D:96A:UN'`,
        `BGM+380+${invoice.invoiceNumber}+9'`,
        `DTM+137:${invoice.invoiceDate}:102'`,
        `NAD+BY+${invoice.buyerCode}::9'`,
        `NAD+SU+${invoice.sellerCode}::9'`,
        `MOA+77:${invoice.totalAmount}'`,
        `UNT+7+1'`,
        trailer,
      ].join('\n'),
    generateDesadv: (desadv) =>
      [
        header,
        `UNH+1+DESADV:D:96A:UN'`,
        `BGM+351+${desadv.despatchNumber}+9'`,
        `RFF+ON:${desadv.orderNumber}'`,
        `DTM+137:${desadv.shipDate}:102'`,
        `UNT+5+1'`,
        trailer,
      ].join('\n'),
  };
}

@Injectable()
export class EdifactService {
  private readonly logger = new Logger(EdifactService.name);

  constructor(
    private readonly tenantDbService: TenantDatabaseService,
    private readonly tenantsService: TenantsService,
  ) {}

  private async getTenantClient(tenantId: string): Promise<PrismaClient> {
    const tenant = await this.tenantsService.getTenantWithHash(tenantId);
    return this.tenantDbService.getClient(tenantId, tenant.dbConnectionHash);
  }

  /**
   * Réception d'un message EDIFACT brut : parse et enregistre en base.
   */
  async receive(
    tenantId: string,
    rawContent: string,
  ): Promise<{ message: EdifactMessageResponse; parsed: ParsedReceiveResult }> {
    const content = rawContent.trim();
    if (!content) {
      throw new BadRequestException('Contenu EDIFACT vide');
    }

    let interchange: EdifactInterchange;
    try {
      interchange = parseEdifact(content);
    } catch (err) {
      this.logger.warn(`Parse EDIFACT failed: ${(err as Error).message}`);
      const prisma = await this.getTenantClient(tenantId);
      const created = await prisma.edifactMessage.create({
        data: {
          type: 'UNKNOWN',
          direction: DIRECTION_INBOUND,
          sender: '',
          receiver: '',
          rawContent: content,
          status: STATUS_ERROR,
          errorMessage: (err as Error).message,
        },
      });
      return {
        message: this.toResponse(created),
        parsed: {
          sender: '',
          receiver: '',
          type: 'UNKNOWN',
          reference: '',
        },
      };
    }

    if (interchange.messages.length === 0) {
      throw new BadRequestException('Aucun message trouvé dans l\'interchange');
    }

    const msg = interchange.messages[0];
    const prisma = await this.getTenantClient(tenantId);
    const created = await prisma.edifactMessage.create({
      data: {
        type: msg.type,
        direction: DIRECTION_INBOUND,
        sender: interchange.sender,
        receiver: interchange.receiver,
        rawContent: content,
        parsedData: msg as unknown as Prisma.InputJsonValue,
        reference: msg.reference ?? null,
        status: STATUS_RECEIVED,
      },
    });

    return {
      message: this.toResponse(created),
      parsed: {
        sender: interchange.sender,
        receiver: interchange.receiver,
        type: msg.type,
        reference: msg.reference,
        data: msg as unknown as Record<string, unknown>,
      },
    };
  }

  /**
   * Réception via AS2 (sans JWT). Nécessite l'identification du tenant (ex: header X-Tenant-Id).
   */
  async receiveAs2(
    tenantId: string,
    rawContent: string,
    _headers: { as2From?: string; as2To?: string; messageId?: string },
  ): Promise<{ message: EdifactMessageResponse; parsed: ParsedReceiveResult }> {
    return this.receive(tenantId, rawContent);
  }

  /**
   * Traitement d'un fichier reçu via SFTP : lecture du fichier puis réception.
   */
  async receiveSftp(
    tenantId: string,
    filePath: string,
    _senderCode: string,
  ): Promise<{ message: EdifactMessageResponse; parsed: ParsedReceiveResult }> {
    let content: string;
    try {
      content = await readFile(filePath, 'utf-8');
    } catch (err) {
      throw new BadRequestException(
        `Impossible de lire le fichier: ${(err as Error).message}`,
      );
    }
    return this.receive(tenantId, content);
  }

  /**
   * Génère un message EDIFACT à partir d'un objet JSON.
   */
  async generate(
    _tenantId: string,
    dto: GenerateEdifactDto,
  ): Promise<{ raw: string }> {
    const generator = createEdifactGenerator(dto.sender, dto.receiver);
    const type = dto.type as EdifactMessageTypeDto;
    const data = dto.data as Record<string, unknown> | undefined;

    switch (type) {
      case 'ORDERS': {
        const order = data as unknown as ParsedOrder;
        if (!order?.orderNumber || !order?.orderDate || !order?.buyerCode || !order?.sellerCode || !order?.lines) {
          throw new BadRequestException(
            'Pour ORDERS, data doit contenir orderNumber, orderDate, buyerCode, sellerCode, lines',
          );
        }
        const raw = generator.generateOrder(order);
        return { raw };
      }
      case 'INVOIC': {
        const invoice = data as unknown as ParsedInvoice;
        if (
          !invoice?.invoiceNumber ||
          !invoice?.invoiceDate ||
          !invoice?.buyerCode ||
          !invoice?.sellerCode ||
          !invoice?.lines ||
          invoice?.subtotal == null ||
          invoice?.vatAmount == null ||
          invoice?.totalAmount == null
        ) {
          throw new BadRequestException(
            'Pour INVOIC, data doit contenir invoiceNumber, invoiceDate, buyerCode, sellerCode, lines, subtotal, vatAmount, totalAmount',
          );
        }
        const raw = generator.generateInvoice(invoice);
        return { raw };
      }
      case 'DESADV': {
        const desadv = data as {
          despatchNumber?: string;
          orderNumber?: string;
          shipDate?: string;
          items?: Array<{ productCode: string; quantity: number; sscc?: string }>;
        };
        if (
          !desadv?.despatchNumber ||
          !desadv?.orderNumber ||
          !desadv?.shipDate ||
          !Array.isArray(desadv?.items)
        ) {
          throw new BadRequestException(
            'Pour DESADV, data doit contenir despatchNumber, orderNumber, shipDate, items',
          );
        }
        const raw = generator.generateDesadv({
          despatchNumber: desadv.despatchNumber,
          orderNumber: desadv.orderNumber,
          shipDate: desadv.shipDate,
          items: desadv.items,
        });
        return { raw };
      }
      case 'PRICAT':
      case 'RECADV':
        throw new BadRequestException(
          `Génération non implémentée pour le type ${type}`,
        );
      default: {
        const exhaustive: never = type;
        throw new BadRequestException(`Type de message inconnu: ${String(exhaustive)}`);
      }
    }
  }

  /**
   * Valide un message EDIFACT brut.
   */
  validate(rawContent: string): ValidationResult {
    const content = rawContent.trim();
    if (!content) {
      throw new BadRequestException('Contenu EDIFACT vide');
    }
    return validateEdifact(content);
  }

  /**
   * Liste des messages reçus (paginé, filtrable par type).
   */
  async findMessages(
    tenantId: string,
    options: { type?: string; page?: number; pageSize?: number } = {},
  ): Promise<{ items: EdifactMessageResponse[]; total: number; page: number; pageSize: number }> {
    const prisma = await this.getTenantClient(tenantId);
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
    const skip = (page - 1) * pageSize;
    const where = options.type ? { type: options.type } : {};

    const [items, total] = await Promise.all([
      prisma.edifactMessage.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.edifactMessage.count({ where }),
    ]);

    return {
      items: items.map((m) => this.toResponse(m)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Détail d'un message par ID.
   */
  async findOne(tenantId: string, id: string): Promise<EdifactMessageResponse> {
    const prisma = await this.getTenantClient(tenantId);
    const message = await prisma.edifactMessage.findFirst({
      where: { id },
    });
    if (!message) {
      throw new NotFoundException(`Message EDIFACT ${id} introuvable`);
    }
    return this.toResponse(message);
  }

  private toResponse(
    m: Awaited<ReturnType<PrismaClient['edifactMessage']['create']>>,
  ): EdifactMessageResponse {
    return {
      id: m.id,
      type: m.type,
      direction: m.direction,
      sender: m.sender,
      receiver: m.receiver,
      rawContent: m.rawContent,
      parsedData: m.parsedData as unknown,
      reference: m.reference,
      receivedAt: m.receivedAt,
      processedAt: m.processedAt,
      status: m.status,
      errorMessage: m.errorMessage,
    };
  }
}

export interface EdifactMessageResponse {
  id: string;
  type: string;
  direction: string;
  sender: string;
  receiver: string;
  rawContent: string;
  parsedData?: unknown;
  reference?: string | null;
  receivedAt: Date;
  processedAt?: Date | null;
  status: string;
  errorMessage?: string | null;
}

export interface ParsedReceiveResult {
  sender: string;
  receiver: string;
  type: string;
  reference: string;
  data?: unknown;
}
