export interface LocalDownloadInput {
  content: BlobPart;
  mimeType: string;
  fileName: string;
}

export function downloadLocalReport({
  content,
  mimeType,
  fileName,
}: LocalDownloadInput): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
