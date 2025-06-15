import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const uploadPath = process.env.UPLOAD_PATH || 'uploads';

export const multerOptions = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, join('..', uploadPath, 'images'));
      } else if (file.mimetype.startsWith('video/')) {
        cb(null, join('..', uploadPath, 'videos'));
      } else {
        cb(null, join('..', uploadPath, 'others'));
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1 GB
  },
};
