import TextRecognition from '@react-native-ml-kit/text-recognition';
import { parsePrescription } from '@/parsers/prescription-parser';
import type { AnalysisResponse } from '@/schemas/analysis-schema';

/**
 * Runs on-device OCR (ML Kit) on each image URI, concatenates the recognised
 * text, then feeds it through the prescription parser.
 *
 * Requires a dev build — does NOT work in Expo Go.
 */
export async function analyseImages(uris: string[]): Promise<AnalysisResponse> {
  const chunks = await Promise.all(
    uris.map(async (uri) => {
      const result = await TextRecognition.recognize(uri);
      return result.text;
    }),
  );

  const fullText = chunks.join('\n').trim();
  if (!fullText) {
    return { medicines: [], overallConfidence: 0, needsReview: true };
  }

  if (fullText.length < 20) {
    throw new Error('Could not read the prescription clearly — please retake in good lighting.');
  }

  return parsePrescription(fullText);
}
