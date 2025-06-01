import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { multerOptions } from './multer.config';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
      }

      // Get folder dynamically from mimetype
      let folder = 'others';
      if (file.mimetype.startsWith('image/')) folder = 'images';
      else if (file.mimetype.startsWith('video/')) folder = 'videos';

      const url = await this.uploadService.getFileUrl(folder, file.filename);
      return { success: true, url };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
