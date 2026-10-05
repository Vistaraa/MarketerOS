/** Upload allowlist. SVG is deliberately excluded: it can carry script. */
export const ALLOWED_MEDIA_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "application/pdf": "pdf"
};

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 25 * 1024 * 1024);

const startsWith = (buf: Buffer, bytes: number[], offset = 0) => bytes.every((b, i) => buf[offset + i] === b);

/** Checks the file's leading bytes match its declared type, so e.g. an HTML file can't be uploaded as "image/png". */
export function contentMatchesType(buf: Buffer, mimeType: string) {
  switch (mimeType) {
    case "image/png": return startsWith(buf, [0x89, 0x50, 0x4e, 0x47]);
    case "image/jpeg": return startsWith(buf, [0xff, 0xd8, 0xff]);
    case "image/gif": return buf.subarray(0, 4).toString("ascii") === "GIF8";
    case "image/webp": return buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
    case "application/pdf": return buf.subarray(0, 5).toString("ascii") === "%PDF-";
    case "video/mp4":
    case "video/quicktime": return buf.subarray(4, 8).toString("ascii") === "ftyp" || ["moov", "mdat", "wide", "free"].includes(buf.subarray(4, 8).toString("ascii"));
    case "video/webm": return startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3]);
    default: return false;
  }
}
