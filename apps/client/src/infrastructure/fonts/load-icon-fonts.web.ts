import { loadAsync } from 'expo-font';

import { logger } from '@/infrastructure/logging/logger';

import { GENERATED_ICON_FONT_BASE64 } from './generated-icon-font-data';

const registeredFontBlobUrls: string[] = [];

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function revokeRegisteredFontBlobUrls(): void {
  for (const fontBlobUrl of registeredFontBlobUrls) {
    URL.revokeObjectURL(fontBlobUrl);
  }

  registeredFontBlobUrls.length = 0;
}

async function registerEmbeddedWebIconFont(fontFamily: string, base64: string): Promise<void> {
  const fontBuffer = base64ToArrayBuffer(base64);
  const fontFace = new FontFace(fontFamily, fontBuffer, {
    style: 'normal',
    weight: 'normal',
    display: 'block',
  });

  document.fonts.add(fontFace);

  try {
    await fontFace.load();
  } catch (error: unknown) {
    logger.error('Browser FontFace.load failed for embedded icon font', error);
  }

  // Keep expo-font's loaded cache in sync so @expo/vector-icons / Paper render glyphs.
  const fontBlobUrl = URL.createObjectURL(new Blob([fontBuffer], { type: 'font/ttf' }));
  registeredFontBlobUrls.push(fontBlobUrl);
  await loadAsync({
    [fontFamily]: { uri: fontBlobUrl },
  });
}

/**
 * Packaged desktop WebView cannot reliably load `@expo/vector-icons` fonts from
 * `assets/__node_modules/.pnpm/@expo+...` URLs. Embed the two icon fonts used by
 * Nestra and register them from raw bytes before any icon mounts.
 */
export async function loadIconFonts(): Promise<void> {
  try {
    revokeRegisteredFontBlobUrls();

    for (const [fontFamily, base64] of Object.entries(GENERATED_ICON_FONT_BASE64)) {
      await registerEmbeddedWebIconFont(fontFamily, base64);
    }
  } catch (error: unknown) {
    logger.error('Icon font loading failed', error);
  }
}
