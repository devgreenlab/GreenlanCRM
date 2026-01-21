// src/lib/server/waha.ts

/**
 * A centralized fetch function for making requests to the WAHA API.
 * It automatically retrieves configuration from environment variables and applies auth headers.
 * @param endpoint - The WAHA API endpoint to call (e.g., '/api/sessions').
 * @param options - Standard fetch options.
 * @returns {Promise<Response>} The fetch Response object.
 * @throws {Error} if required environment variables are not configured.
 */
export async function wahaFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const baseUrl = process.env.WAHA_BASE_URL;
    const apiKey = process.env.WAHA_API_KEY;

    if (!baseUrl || !apiKey) {
        console.error('[wahaFetch] WAHA environment variables (WAHA_BASE_URL, WAHA_API_KEY) are not fully configured on the server.');
        // Throw a generic error to avoid leaking configuration details.
        throw new Error('WAHA env missing');
    }

    const url = `${baseUrl.trim().replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const headers = new Headers(options.headers || {});
    
    headers.set('X-Api-Key', apiKey);
    
    if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
    }

    headers.set('Accept', 'application/json');

    return fetch(url, {
        ...options,
        headers,
    });
}
