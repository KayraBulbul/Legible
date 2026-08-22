import { authedFetchWithRetry } from './api-client.js';

export async function analyzeImage({ dataUrl, kind, contextText }) {
  return authedFetchWithRetry('/api/v1/image-descriptions', {
    method: 'POST',
    body: JSON.stringify({
      kind,
      dataUrl,
      ...(contextText ? { contextText } : {}),
    }),
  });
}
