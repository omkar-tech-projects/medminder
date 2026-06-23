import { Paths, Directory, File } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_WIDTH = 1600;
const QUALITY = 0.82;

function captureDir(): Directory {
  return new Directory(Paths.document, 'rx_capture');
}

export async function processAndStore(sourceUri: string): Promise<string> {
  const processed = await manipulateAsync(
    sourceUri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: QUALITY, format: SaveFormat.JPEG },
  );

  const dir = captureDir();
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }

  const filename = `rx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
  const src = new File(processed.uri);
  const dest = new File(dir, filename);
  await src.copy(dest);

  return dest.uri;
}

export function deletePage(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // file already gone — nothing to do
  }
}

export function clearAllPages(uris: string[]): void {
  uris.forEach(deletePage);
}
