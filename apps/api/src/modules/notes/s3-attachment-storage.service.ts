import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { extname } from 'path';

type UploadNoteAttachmentOptions = {
  teacherId: string;
  noteId: number;
  file: Express.Multer.File;
};

type UploadedAttachment = {
  fileKey: string;
  fileUrl: string;
};

const encodeS3Key = (key: string) =>
  key.split('/').map(encodeURIComponent).join('/');

const toSignedUrlExpiry = (value?: string) => {
  const expiresIn = Number(value ?? 3600);
  return Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600;
};

@Injectable()
export class S3AttachmentStorageService {
  private readonly s3: S3Client;
  private readonly bucket?: string;
  private readonly publicBaseUrl?: string;
  private readonly region: string;
  private readonly signedUrlExpiresIn: number;

  constructor(private readonly config: ConfigService) {
    this.region = this.config.get<string>('AWS_REGION') ?? 'us-east-1';
    this.bucket = this.config.get<string>('AWS_S3_BUCKET');
    this.publicBaseUrl = this.config.get<string>('AWS_S3_PUBLIC_BASE_URL');
    this.signedUrlExpiresIn = toSignedUrlExpiry(
      this.config.get<string>('AWS_S3_SIGNED_URL_EXPIRES_SECONDS'),
    );
    this.s3 = new S3Client({ region: this.region });
  }

  async uploadNoteAttachment({
    teacherId,
    noteId,
    file,
  }: UploadNoteAttachmentOptions): Promise<UploadedAttachment> {
    const bucket = this.getBucket();
    const fileKey = this.createNoteAttachmentKey(teacherId, noteId, file);

    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      fileKey,
      fileUrl: this.createPublicUrl(fileKey),
    };
  }

  async deleteObject(fileKey?: string | null) {
    if (!fileKey) return;

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.getBucket(),
        Key: fileKey,
      }),
    );
  }

  async getReadableUrl(fileKey?: string | null, fallbackUrl?: string | null) {
    if (!fileKey) {
      return fallbackUrl ?? '';
    }

    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/$/, '')}/${encodeS3Key(fileKey)}`;
    }

    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: fileKey,
      }),
      { expiresIn: this.signedUrlExpiresIn },
    );
  }

  private createNoteAttachmentKey(
    teacherId: string,
    noteId: number,
    file: Express.Multer.File,
  ) {
    return [
      'note-attachments',
      teacherId,
      String(noteId),
      `${randomUUID()}${extname(file.originalname)}`,
    ].join('/');
  }

  private createPublicUrl(fileKey: string) {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/$/, '')}/${encodeS3Key(fileKey)}`;
    }

    return `https://${this.getBucket()}.s3.${this.region}.amazonaws.com/${encodeS3Key(fileKey)}`;
  }

  private getBucket() {
    if (!this.bucket) {
      throw new InternalServerErrorException('AWS_S3_BUCKET is not configured');
    }

    return this.bucket;
  }
}
