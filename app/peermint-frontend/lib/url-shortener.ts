import axios from 'axios';

/**
 * Shorten a URL using TinyURL API (no API key required)
 */
export async function shortenUrl(longUrl: string): Promise<string> {
  try {
    const response = await axios.get(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to shorten URL with TinyURL:', error);
    throw error;
  }
}

/**
 * Alternative: Use is.gd API (no API key required)
 */
export async function shortenUrlIsGd(longUrl: string): Promise<string> {
  try {
    const response = await axios.get(
      `https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to shorten URL with is.gd:', error);
    throw error;
  }
}

/**
 * Try multiple URL shorteners in sequence
 */
export async function shortenUrlWithFallback(longUrl: string): Promise<string> {
  // Try TinyURL first
  try {
    return await shortenUrl(longUrl);
  } catch {
    console.log('TinyURL failed, trying is.gd...');
  }

  // Try is.gd as fallback
  try {
    return await shortenUrlIsGd(longUrl);
  } catch {
    console.log('is.gd failed, returning original URL');
  }

  // If all fail, return original (might be rejected by program)
  return longUrl;
}
