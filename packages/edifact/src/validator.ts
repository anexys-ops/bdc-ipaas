import { EdifactSegment, ValidationResult, ValidationError, EdifactMessageType } from './types';
import { EdifactParser } from './parser';

const MANDATORY_SEGMENTS: Record<EdifactMessageType, string[]> = {
  ORDERS: ['UNH', 'BGM', 'DTM', 'NAD', 'LIN', 'QTY', 'UNT'],
  INVOIC: ['UNH', 'BGM', 'DTM', 'NAD', 'LIN', 'MOA', 'UNT'],
  DESADV: ['UNH', 'BGM', 'DTM', 'CPS', 'LIN', 'QTY', 'UNT'],
  PRICAT: ['UNH', 'BGM', 'DTM', 'NAD', 'LIN', 'PRI', 'UNT'],
  RECADV: ['UNH', 'BGM', 'DTM', 'NAD', 'LIN', 'QTY', 'UNT'],
};

export class EdifactValidator {
  private parser = new EdifactParser();

  validate(edifactData: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      const interchange = this.parser.parse(edifactData);
      
      if (!interchange.sender) {
        errors.push({ segment: 'UNB', position: 0, message: 'Expéditeur manquant dans UNB', severity: 'error' });
      }
      if (!interchange.receiver) {
        errors.push({ segment: 'UNB', position: 0, message: 'Destinataire manquant dans UNB', severity: 'error' });
      }

      for (const message of interchange.messages) {
        const messageErrors = this.validateMessage(message.type, message.segments);
        errors.push(...messageErrors.filter(e => e.severity === 'error'));
        warnings.push(...messageErrors.filter(e => e.severity === 'warning'));
      }

    } catch (err) {
      errors.push({ segment: 'PARSE', position: 0, message: `Erreur de parsing: ${(err as Error).message}`, severity: 'error' });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  validateMessage(messageType: EdifactMessageType, segments: EdifactSegment[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const segmentTags = segments.map(s => s.tag);
    const mandatory = MANDATORY_SEGMENTS[messageType] || [];

    for (const mandatorySeg of mandatory) {
      if (!segmentTags.includes(mandatorySeg)) {
        errors.push({ segment: mandatorySeg, position: 0, message: `Segment obligatoire manquant: ${mandatorySeg}`, severity: 'error' });
      }
    }

    const unhSegment = segments.find(s => s.tag === 'UNH');
    const untSegment = segments.find(s => s.tag === 'UNT');

    if (unhSegment && untSegment) {
      const declaredCount = parseInt(untSegment.elements[0]?.[0] || '0', 10);
      const actualCount = segments.length;
      if (declaredCount !== actualCount) {
        errors.push({ segment: 'UNT', position: segments.length - 1, message: `Compteur de segments incorrect: déclaré ${declaredCount}, réel ${actualCount}`, severity: 'warning' });
      }
    }

    segments.forEach((seg, idx) => {
      if (seg.tag === 'DTM') {
        const dateValue = seg.elements[0]?.[1];
        if (dateValue && !this.isValidDate(dateValue)) {
          errors.push({ segment: 'DTM', position: idx, message: `Format de date invalide: ${dateValue}`, severity: 'error' });
        }
      }

      if (seg.tag === 'QTY') {
        const qtyValue = seg.elements[0]?.[1];
        if (qtyValue && isNaN(parseFloat(qtyValue))) {
          errors.push({ segment: 'QTY', position: idx, message: `Quantité invalide: ${qtyValue}`, severity: 'error' });
        }
      }

      if (seg.tag === 'MOA') {
        const amount = seg.elements[0]?.[1];
        if (amount && isNaN(parseFloat(amount))) {
          errors.push({ segment: 'MOA', position: idx, message: `Montant invalide: ${amount}`, severity: 'error' });
        }
      }
    });

    return errors;
  }

  private isValidDate(date: string): boolean {
    if (date.length !== 8) return false;
    const year = parseInt(date.substring(0, 4), 10);
    const month = parseInt(date.substring(4, 6), 10);
    const day = parseInt(date.substring(6, 8), 10);
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    return true;
  }
}

export function validateEdifact(data: string): ValidationResult {
  return new EdifactValidator().validate(data);
}
