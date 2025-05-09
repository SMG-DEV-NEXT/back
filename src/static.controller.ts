import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import * as fs from 'fs';

@Controller()
export class StaticController {
  @Get()
  getIndex(@Res() res: Response) {
    const htmlPath = join(__dirname, '..', '..', 'public', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.type('text/html').send(html);
  }
}
