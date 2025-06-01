import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadService {
  async getFileUrl(folder: string, filename: string): Promise<string> {
    return `/uploads/${folder}/${filename}`;
  }
}
