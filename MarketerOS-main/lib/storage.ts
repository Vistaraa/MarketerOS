export type UploadedAsset = { key: string; url: string; mimeType: string; sizeBytes: number };

export interface ObjectStorage {
  upload(input: { key: string; body: Buffer; mimeType: string }): Promise<UploadedAsset>;
  delete(key: string): Promise<void>;
}

export class LocalObjectStorage implements ObjectStorage {
  async upload(input: { key: string; body: Buffer; mimeType: string }) { return { key: input.key, url: `/api/media/${encodeURIComponent(input.key)}`, mimeType: input.mimeType, sizeBytes: input.body.byteLength }; }
  async delete(_key: string) { return undefined; }
}

export const objectStorage: ObjectStorage = new LocalObjectStorage();
