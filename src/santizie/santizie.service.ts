// src/sanitize/sanitize.service.ts
import { Injectable } from '@nestjs/common';
import * as DOMPurify from 'dompurify';

@Injectable()
export class SanitizeService {
  sanitizeHtml(input: string): string {
    // Sanitize the input HTML content using DOMPurify
    try{
      const e = DOMPurify.sanitize(input);
      return e
    }catch(error){
      return input
    }
  }
}
