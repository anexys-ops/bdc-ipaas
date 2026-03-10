import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '../../generated/tenant';
import { readFile } from 'fs/promises';
import {
  parseEdifact,
  createEdifactGenerator,
  validateEdifact,
  type EdifactInterchange,
  type ParsedOrder,
  type ParsedInvoice,
  type ValidationResult,
} from '@anexys/edifact';
import { TenantDatabaseService } from '../tenants/tenant-database.service';
import { TenantsService } from '../tenants/tenants.service';
import type { GenerateEdifactDto, EdifactMessageTypeDto } from './dto';

const DIRECTION_INBOUND = 'INBOUND';
const STATUS_RECEIVED = 'RECEIVED';
const STATUS_ERROR = 'ERROR';

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
