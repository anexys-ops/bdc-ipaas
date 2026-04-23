import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { Request } from 'express';
import { EdifactService, type EdifactMessageResponse } from './edifact.service';
import {
  ReceiveEdifactDto,
  ReceiveSftpEdifactDto,
  GenerateEdifactDto,
  EdifactMessageResponseDto,
  EdifactReceiveResultDto,
  EdifactValidateResultDto,
  EdifactMessagesListDto,
  PatchEdifactBillingDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentTenant, Public } from '../../common/decorators';

@ApiTags('EDIFACT')
@Controller('edifact')
export class EdifactController {
  constructor(private readonly edifactService: EdifactService) {}

  @Post('receive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réception d\'un message EDIFACT brut (parse et enregistrement)' })
  @ApiResponse({ status: 200, description: 'Message reçu et parsé', type: EdifactReceiveResultDto })
  @ApiResponse({ status: 400, description: 'Contenu invalide' })
  async receive(
    @CurrentTenant() tenant: { id: string },
    @Body() body: ReceiveEdifactDto | { content?: string },
    @Req() req: Request,
  ): Promise<EdifactReceiveResultDto> {
    const content = this.getRawContent(body, req);
    return this.edifactService.receive(tenant.id, content);
  }

  @Post('receive/as2')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réception via AS2 (sans JWT)' })
  @ApiHeader({ name: 'AS2-From', required: true })
  @ApiHeader({ name: 'AS2-To', required: true })
  @ApiHeader({ name: 'Message-ID', required: true })
  @ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'ID du tenant (résolution depuis AS2-To ou config)' })
  @ApiResponse({ status: 200, description: 'Message reçu', type: EdifactReceiveResultDto })
  @ApiResponse({ status: 400, description: 'Tenant manquant ou contenu invalide' })
  async receiveAs2(
    @Body() body: string | { content?: string },
    @Req() req: Request,
  ): Promise<EdifactReceiveResultDto> {
    const tenantId = (req.headers['x-tenant-id'] as string)?.trim();
    if (!tenantId) {
      throw new BadRequestException('Header X-Tenant-Id requis pour la réception AS2');
    }
    const as2From = req.headers['as2-from'] as string | undefined;
    const as2To = req.headers['as2-to'] as string | undefined;
    const messageId = req.headers['message-id'] as string | undefined;
    const content = this.getRawContent(body, req);
    return this.edifactService.receiveAs2(tenantId, content, {
      as2From,
      as2To,
      messageId,
    });
  }

  @Post('receive/sftp')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Traitement d\'un fichier reçu via SFTP' })
  @ApiResponse({ status: 200, description: 'Fichier traité', type: EdifactReceiveResultDto })
  @ApiResponse({ status: 400, description: 'Fichier introuvable ou invalide' })
  async receiveSftp(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: ReceiveSftpEdifactDto,
  ): Promise<EdifactReceiveResultDto> {
    return this.edifactService.receiveSftp(tenant.id, dto.filePath, dto.senderCode);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Génère un message EDIFACT, enregistre en sortie (OUTBOUND) et retourne le brut + fiche' })
  @ApiResponse({ status: 200, description: 'Message généré et enregistré' })
  @ApiResponse({ status: 400, description: 'Données invalides ou type non supporté' })
  async generate(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: GenerateEdifactDto,
  ): Promise<{ raw: string; message: EdifactMessageResponse }> {
    return this.edifactService.generate(tenant.id, dto);
  }

  @Post('validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valide un message EDIFACT brut' })
  @ApiResponse({ status: 200, description: 'Résultat de validation', type: EdifactValidateResultDto })
  @ApiResponse({ status: 400, description: 'Contenu vide' })
  async validate(
    @Body() body: { content?: string } | string,
    @Req() req: Request,
  ): Promise<EdifactValidateResultDto> {
    const content = this.getRawContent(body, req);
    return this.edifactService.validate(content);
  }

  @Get('messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des messages EDIFACT (paginé, filtres direction, type, dates, facturé)' })
  @ApiQuery({ name: 'type', required: false, description: 'Type UNH (ORDERS, INVOIC, …)' })
  @ApiQuery({ name: 'direction', required: false, enum: ['INBOUND', 'OUTBOUND'] })
  @ApiQuery({ name: 'billed', required: false, description: 'true | false' })
  @ApiQuery({ name: 'from', required: false, description: 'Date min réception (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'Date max réception' })
  @ApiQuery({ name: 'documentFrom', required: false, description: 'Filtre date document' })
  @ApiQuery({ name: 'documentTo', required: false })
  @ApiQuery({ name: 'includeRaw', required: false, description: 'Inclure le fichier brut (défaut: false)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Liste paginée', type: EdifactMessagesListDto })
  async getMessages(
    @CurrentTenant() tenant: { id: string },
    @Query('type') type?: string,
    @Query('direction') direction?: string,
    @Query('billed') billed?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('documentFrom') documentFrom?: string,
    @Query('documentTo') documentTo?: string,
    @Query('includeRaw') includeRaw?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<EdifactMessagesListDto> {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;
    const pageFromOffset = limitNum != null && limitNum > 0 && offsetNum != null
      ? Math.floor(offsetNum / limitNum) + 1
      : undefined;
    const billedBool =
      billed === 'true' ? true : billed === 'false' ? false : undefined;
    return this.edifactService.findMessages(tenant.id, {
      type: type || undefined,
      direction: direction || undefined,
      billed: billedBool,
      from: from || undefined,
      to: to || undefined,
      documentFrom: documentFrom || undefined,
      documentTo: documentTo || undefined,
      includeRaw: includeRaw === 'true' || includeRaw === '1',
      page: page ? parseInt(page, 10) : pageFromOffset,
      pageSize: pageSize ? parseInt(pageSize, 10) : limitNum,
    });
  }

  @Get('messages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail d\'un message EDIFACT (fichier brut, NAD, BGM, segments, MOA…)' })
  @ApiResponse({ status: 200, description: 'Message', type: EdifactMessageResponseDto })
  @ApiResponse({ status: 404, description: 'Message introuvable' })
  async getMessage(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EdifactMessageResponseDto> {
    return this.edifactService.findOne(tenant.id, id) as Promise<EdifactMessageResponseDto>;
  }

  @Patch('messages/:id/billing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marque un message pour la facturation support (ou retirer le marquage)' })
  @ApiResponse({ status: 200, type: EdifactMessageResponseDto })
  async setMessageBilling(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchEdifactBillingDto,
  ): Promise<EdifactMessageResponseDto> {
    return this.edifactService.setBilled(tenant.id, id, dto.billed) as Promise<EdifactMessageResponseDto>;
  }

  /**
   * Récupère le contenu brut EDIFACT depuis le body (JSON { content } ou body text/plain).
   */
  private getRawContent(
    body: ReceiveEdifactDto | { content?: string } | string,
    req: Request,
  ): string {
    if (typeof body === 'string' && body.length > 0) {
      return body;
    }
    const content = typeof body === 'object' && body !== null && 'content' in body
      ? (body as { content?: string }).content
      : (req.body as string | undefined);
    if (typeof content === 'string' && content.length > 0) {
      return content;
    }
    throw new BadRequestException('Contenu EDIFACT manquant (body text/plain ou JSON avec "content")');
  }
}
