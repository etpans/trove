import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
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

@Injectable()
export class S3AttachmentStorageService {
  private readonly s3: S3Client;
  private readonly bucket?: string;
  private readonly publicBaseUrl?: string;
  private readonly region: string;

  constructor(private readonly config: ConfigService) {
    this.region = this.config.get<string>('AWS_REGION') ?? 'us-east-1';
    this.bucket = this.config.get<string>('AWS_S3_BUCKET');
    this.publicBaseUrl = this.config.get<string>('AWS_S3_PUBLIC_BASE_URL');
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
