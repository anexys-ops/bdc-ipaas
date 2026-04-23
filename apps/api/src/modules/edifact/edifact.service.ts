import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '../../generated/tenant';
import { readFile } from 'fs/promises';
import { enrichEdifactContent, type EdifactEnrichedMessage } from '@anexys/edi-core';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { TenantsService } from '../tenants/tenants.service';
import type { GenerateEdifactDto, EdifactMessageTypeDto } from './dto';

const DIRECTION_INBOUND = 'INBOUND';
const DIRECTION_OUTBOUND = 'OUTBOUND';
const STATUS_RECEIVED = 'RECEIVED';
const STATUS_ERROR = 'ERROR';

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

function fallbackUnbAndBgm(content: string): {
  type: string;
  reference: string;
  sender: string;
  receiver: string;
} {
  const messageTypeMatch = content.match(/UNH\+[^+']*\+([A-Z0-9]+)/);
  const referenceMatch = content.match(/BGM\+[^+']*\+([^+']+)/);
  const m = content.match(
    /UNB\+[^+]+\+([^+']+)(?:\+[^+]*)*\+([^+']+)(?:\+[^+']*\+[^+']*)*'/,
  );
  let sender = m?.[1] ?? '';
  let receiver = m?.[2] ?? '';
  if (!sender) {
    const a = content.match(/UNB\+UNOC:3\+([^+']+)\+([^+']+)/);
    if (a) {
      sender = a[1] ?? '';
      receiver = a[2] ?? '';
    }
  }
  return {
    type: messageTypeMatch?.[1] ?? 'UNKNOWN',
    reference: referenceMatch?.[1] ?? '',
    sender,
    receiver,
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

    const prisma = await this.getTenantClient(tenantId);
    const enrich = enrichEdifactContent(content);

    if (enrich.ok && enrich.enriched) {
      const e = enrich.enriched;
      let documentDate: Date | null = null;
      if (e.documentDate) {
        const dt = new Date(e.documentDate);
        if (!Number.isNaN(dt.getTime())) documentDate = dt;
      }
      const totalAmount =
        e.totalAmount != null ? new Prisma.Decimal(e.totalAmount) : null;
      const created = await prisma.edifactMessage.create({
        data: {
          type: e.unhType || 'UNKNOWN',
          direction: DIRECTION_INBOUND,
          sender: e.interchange.sender,
          receiver: e.interchange.receiver,
          rawContent: content,
          parsedData: e as unknown as Prisma.InputJsonValue,
          reference: e.bgm.messageNumber || null,
          bgmCode: e.bgm.documentNameCode || null,
          documentDate,
          totalAmount,
          currency: e.currency,
          status: STATUS_RECEIVED,
        },
      });
      return {
        message: this.toResponse(created, { includeEnrichment: true }),
        parsed: {
          sender: e.interchange.sender,
          receiver: e.interchange.receiver,
          type: e.unhType,
          reference: e.bgm.messageNumber,
          data: e,
        },
      };
    }

    this.logger.warn(
      `Enrich EDIFACT partiel: ${enrich.errorMessage ?? 'inconnu'}`,
    );
    const fallback = fallbackUnbAndBgm(content);
    const created = await prisma.edifactMessage.create({
      data: {
        type: fallback.type || 'UNKNOWN',
        direction: DIRECTION_INBOUND,
        sender: fallback.sender,
        receiver: fallback.receiver,
        rawContent: content,
        parsedData: { enrichError: enrich.errorMessage, fallback } as unknown as Prisma.InputJsonValue,
        reference: fallback.reference || null,
        status: /UNH\+/i.test(content) ? STATUS_RECEIVED : STATUS_ERROR,
        errorMessage: enrich.errorMessage,
      },
    });
    return {
      message: this.toResponse(created, { includeEnrichment: true }),
      parsed: {
        sender: fallback.sender,
        receiver: fallback.receiver,
        type: fallback.type,
        reference: fallback.reference,
        data: { enrichError: enrich.errorMessage, fallback },
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
    let fileContent: string;
    try {
      fileContent = await readFile(filePath, 'utf-8');
    } catch (err) {
      throw new BadRequestException(
        `Impossible de lire le fichier: ${(err as Error).message}`,
      );
    }
    return this.receive(tenantId, fileContent);
  }

  /**
   * Génère un message EDIFACT à partir d'un objet JSON.
   */
  async generate(
    tenantId: string,
    dto: GenerateEdifactDto,
  ): Promise<{ raw: string; message: EdifactMessageResponse }> {
    const generator = createEdifactGenerator(dto.sender, dto.receiver);
    const type = dto.type as EdifactMessageTypeDto;
    const data = dto.data as Record<string, unknown> | undefined;

    let raw: string;
    switch (type) {
      case 'ORDERS': {
        const order = data as unknown as ParsedOrder;
        if (
          !order?.orderNumber ||
          !order?.orderDate ||
          !order?.buyerCode ||
          !order?.sellerCode ||
          !order?.lines
        ) {
          throw new BadRequestException(
            'Pour ORDERS, data doit contenir orderNumber, orderDate, buyerCode, sellerCode, lines',
          );
        }
        raw = generator.generateOrder(order);
        break;
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
        raw = generator.generateInvoice(invoice);
        break;
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
        raw = generator.generateDesadv({
          despatchNumber: desadv.despatchNumber,
          orderNumber: desadv.orderNumber,
          shipDate: desadv.shipDate,
          items: desadv.items,
        });
        break;
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

    const enrich = enrichEdifactContent(raw);
    const prisma = await this.getTenantClient(tenantId);
    if (!enrich.ok || !enrich.enriched) {
      const created = await prisma.edifactMessage.create({
        data: {
          type: dto.type,
          direction: DIRECTION_OUTBOUND,
          sender: dto.sender,
          receiver: dto.receiver,
          rawContent: raw,
          status: STATUS_RECEIVED,
        },
      });
      return { raw, message: this.toResponse(created, { includeEnrichment: true }) };
    }
    const e = enrich.enriched;
    let documentDate: Date | null = null;
    if (e.documentDate) {
      const dt = new Date(e.documentDate);
      if (!Number.isNaN(dt.getTime())) documentDate = dt;
    }
    const totalAmount = e.totalAmount != null ? new Prisma.Decimal(e.totalAmount) : null;
    const created = await prisma.edifactMessage.create({
      data: {
        type: e.unhType,
        direction: DIRECTION_OUTBOUND,
        sender: e.interchange.sender,
        receiver: e.interchange.receiver,
        rawContent: raw,
        parsedData: e as unknown as Prisma.InputJsonValue,
        reference: e.bgm.messageNumber || null,
        bgmCode: e.bgm.documentNameCode || null,
        documentDate,
        totalAmount,
        currency: e.currency,
        status: STATUS_RECEIVED,
      },
    });
    return { raw, message: this.toResponse(created, { includeEnrichment: true }) };
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
   * Liste des messages (paginé, filtres direction, type, période réception, facturation).
   */
  async findMessages(
    tenantId: string,
    options: {
      type?: string;
      direction?: string;
      billed?: boolean;
      page?: number;
      pageSize?: number;
      /** Période sur receivedAt (alias: from, to) */
      receivedFrom?: string;
      receivedTo?: string;
      from?: string;
      to?: string;
      documentFrom?: string;
      documentTo?: string;
      includeRaw?: boolean;
    } = {},
  ): Promise<{ items: EdifactMessageResponse[]; total: number; page: number; pageSize: number; messages: EdifactMessageResponse[] }> {
    const prisma = await this.getTenantClient(tenantId);
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
    const skip = (page - 1) * pageSize;
    const where: Prisma.EdifactMessageWhereInput = {};
    if (options.type) {
      where.type = options.type;
    }
    if (options.direction) {
      where.direction = options.direction;
    }
    if (options.billed !== undefined) {
      where.billed = options.billed;
    }
    const rFrom = options.receivedFrom ?? options.from;
    const rTo = options.receivedTo ?? options.to;
    if (rFrom || rTo) {
      const ra: { gte?: Date; lte?: Date } = {};
      if (rFrom) ra.gte = new Date(rFrom);
      if (rTo) {
        const t = new Date(rTo);
        t.setUTCHours(23, 59, 59, 999);
        ra.lte = t;
      }
      where.receivedAt = ra;
    }
    if (options.documentFrom || options.documentTo) {
      const dd: { gte?: Date; lte?: Date } = {};
      if (options.documentFrom) dd.gte = new Date(options.documentFrom);
      if (options.documentTo) {
        const t = new Date(options.documentTo);
        t.setUTCHours(23, 59, 59, 999);
        dd.lte = t;
      }
      where.documentDate = dd;
    }

    const [rows, total] = await Promise.all([
      prisma.edifactMessage.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.edifactMessage.count({ where }),
    ]);

    const includeRaw = options.includeRaw === true;
    const items = rows.map((m) => this.toResponse(m, { includeRaw, includeEnrichment: false }));
    return { items, total, page, pageSize, messages: items };
  }

  /**
   * Détail d'un message par ID (aperçu structuré + brut).
   */
  async findOne(tenantId: string, id: string): Promise<EdifactMessageResponse> {
    const prisma = await this.getTenantClient(tenantId);
    const message = await prisma.edifactMessage.findFirst({
      where: { id },
    });
    if (!message) {
      throw new NotFoundException(`Message EDIFACT ${id} introuvable`);
    }
    return this.toResponse(message, { includeRaw: true, includeEnrichment: true });
  }

  /**
   * Marque un message pour la facturation support.
   */
  async setBilled(
    tenantId: string,
    id: string,
    billed: boolean,
  ): Promise<EdifactMessageResponse> {
    const prisma = await this.getTenantClient(tenantId);
    try {
      const updated = await prisma.edifactMessage.update({
        where: { id },
        data: {
          billed,
          billedAt: billed ? new Date() : null,
        },
      });
      return this.toResponse(updated, { includeRaw: true, includeEnrichment: true });
    } catch {
      throw new NotFoundException(`Message EDIFACT ${id} introuvable`);
    }
  }

  private toResponse(
    m: Awaited<ReturnType<PrismaClient['edifactMessage']['create']>>,
    options: { includeRaw?: boolean; includeEnrichment?: boolean } = {},
  ): EdifactMessageResponse {
    const includeRaw = options.includeRaw !== false;
    const includeEnrichment = options.includeEnrichment === true;
    const res: EdifactMessageResponse = {
      id: m.id,
      type: m.type,
      direction: m.direction,
      sender: m.sender,
      receiver: m.receiver,
      reference: m.reference,
      bgmCode: m.bgmCode,
      documentDate: m.documentDate ? m.documentDate.toISOString() : null,
      totalAmount: m.totalAmount != null ? Number(m.totalAmount) : null,
      currency: m.currency,
      billed: m.billed ?? false,
      billedAt: m.billedAt ? m.billedAt.toISOString() : null,
      receivedAt: m.receivedAt,
      processedAt: m.processedAt,
      status: m.status,
      errorMessage: m.errorMessage,
      parsedData: m.parsedData as unknown,
    };
    if (includeRaw) {
      res.rawContent = m.rawContent;
    }
    if (includeEnrichment) {
      const e = enrichEdifactContent(m.rawContent);
      if (e.ok && e.enriched) {
        res.enrichment = e.enriched;
      } else {
        res.enrichError = e.errorMessage;
      }
    }
    return res;
  }
}

export interface EdifactMessageResponse {
  id: string;
  type: string;
  direction: string;
  sender: string;
  receiver: string;
  rawContent?: string;
  parsedData?: unknown;
  reference?: string | null;
  bgmCode?: string | null;
  documentDate?: string | null;
  totalAmount?: number | null;
  currency?: string | null;
  billed: boolean;
  billedAt?: string | null;
  receivedAt: Date;
  processedAt?: Date | null;
  status: string;
  errorMessage?: string | null;
  enrichment?: EdifactEnrichedMessage;
  enrichError?: string;
}

export interface ParsedReceiveResult {
  sender: string;
  receiver: string;
  type: string;
  reference: string;
  data?: unknown;
}
