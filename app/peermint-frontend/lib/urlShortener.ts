// URL shortening using TinyURL with localStorage caching

export async function shortenUrl(url: string): Promise<string> {
  try {
    const response = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to shorten URL');
    }
    
    const shortUrl = await response.text();
    const trimmedUrl = shortUrl.trim();
    
    // Store the mapping for future reference
    localStorage.setItem(`url_mapping_${trimmedUrl}`, url);
    console.log("Shortened URL:", trimmedUrl);
    
    return trimmedUrl;
  } catch (error) {
    console.error("URL shortening failed:", error);
    throw error;
  }
}

export async function expandUrl(shortUrl: string): Promise<string> {
  // First check localStorage cache
  const cached = localStorage.getItem(`url_mapping_${shortUrl}`);
  if (cached) {
    console.log("Found cached original URL");
    return cached;
  }
  
  // If not cached, use unshorten.me API to get the original URL
  try {
    console.log("Expanding shortened URL via API...");
    const response = await fetch(`https://unshorten.me/json/${encodeURIComponent(shortUrl)}`);
    
    if (!response.ok) {
      throw new Error('Failed to expand URL');
    }
    
    const data = await response.json();
    const originalUrl = data.resolved_url || data.url || shortUrl;
    
    // Cache it for next time
    localStorage.setItem(`url_mapping_${shortUrl}`, originalUrl);
    console.log("Expanded URL:", originalUrl);
    
    return originalUrl;
  } catch (error) {
    console.error("URL expansion failed:", error);
    // Fallback: return the short URL itself
    return shortUrl;
  }
}

