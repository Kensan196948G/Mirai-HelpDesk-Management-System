import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from './errorHandler';
import { fromFile } from 'file-type';

// アップロードディレクトリの作成
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 許可されたファイル拡張子
const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.zip',
  '.txt',
  '.log',
];

// 許可されたMIMEタイプ
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/x-log',
];

// ファイルサイズ制限（10MB）
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ストレージ設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // UUIDを使用してユニークなファイル名を生成
    const uuid = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${uuid}${ext}`);
  },
});

// ファイルフィルター（基本的な検証のみ、マジックバイトは後で検証）
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // 拡張子チェック
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new AppError(
        `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
        400,
        'INVALID_FILE_TYPE'
      )
    );
  }

  // MIMEタイプチェック（基本検証）
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new AppError(
        'Invalid file MIME type',
        400,
        'INVALID_MIME_TYPE'
      )
    );
  }

  cb(null, true);
};

/**
 * マジックバイト検証（ファイルの実際の内容を検証）
 * アップロード後に呼び出す必要があります
 */
export const validateFileMagicBytes = async (filePath: string): Promise<void> => {
  const fileTypeResult = await fromFile(filePath);

  if (!fileTypeResult) {
    // ファイルタイプが検出できない場合（テキストファイル等）
    // 拡張子で判断
    const ext = path.extname(filePath).toLowerCase();
    if (!['.txt', '.log'].includes(ext)) {
      throw new AppError(
        'Unable to verify file type',
        400,
        'FILE_TYPE_VERIFICATION_FAILED'
      );
    }
    return;
  }

  // マジックバイトから検出されたMIMEタイプが許可リストに含まれているか確認
  if (!ALLOWED_MIME_TYPES.includes(fileTypeResult.mime)) {
    throw new AppError(
      `File content does not match allowed types. Detected: ${fileTypeResult.mime}`,
      400,
      'INVALID_FILE_CONTENT'
    );
  }
};

// Multer設定
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // 1回のリクエストで最大10ファイル
  },
  fileFilter,
});

// SHA-256ハッシュを計算
export const calculateFileHash = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (error) => reject(error));
  });
};

// ファイル情報の取得（マジックバイト検証を含む）
export const getFileInfo = async (file: Express.Multer.File) => {
  const filePath = file.path;

  // マジックバイト検証を実行
  await validateFileMagicBytes(filePath);

  const hash = await calculateFileHash(filePath);
  const stats = fs.statSync(filePath);

  return {
    originalName: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: stats.size,
    hash,
    storagePath: filePath,
  };
};

// ファイル削除ヘルパー
export const deleteFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

// 単一ファイルアップロード用
export const uploadSingle = uploadMiddleware.single('file');

// 複数ファイルアップロード用
export const uploadMultiple = uploadMiddleware.array('files', 10);
