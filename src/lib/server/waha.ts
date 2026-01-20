// src/lib/server/waha.ts
import { getAdminServices } from '@/lib/firebase/server-app';
import type { IntegrationSettings } from '@/lib/firestore/types';

/**
 * Fetches the WAHA configuration (URL and API key) from server-side storage.
 * @returns {Promise<{baseUrl: string, apiKey: string}>}
 * @throws {Error} if configuration is missing.
 */
export async function getWahaConfig() {
    const { firestore: db } = getAdminServices();
    
    const settingsRef = db.collection('integrations').doc('settings');
    const secretRef = db.collection('integrations_secrets').doc('waha');

    const [settingsDoc, secretDoc] = await Promise.all([settingsRef.get(), secretRef.get()]);

    const settings = settingsDoc.data() as IntegrationSettings | undefined;
    const secret = secretDoc.data();

    if (!settings?.wahaBaseUrl) {
        throw new Error('WAHA Base URL not configured.');
    }

    if (!secret?.apiKey) {
        throw new Error('WAHA API Key not set.');
    }
    
    // Normalize URL by trimming and removing any trailing slash
    const normalizedUrl = settings.wahaBaseUrl.trim().replace(/\/$/, '');

    return { 
        baseUrl: normalizedUrl,
        apiKey: secret.apiKey,
    };
}


/**
 * A centralized fetch function for making requests to the WAHA API.
 * It automatically retrieves the configuration and applies the X-Api-Key auth header.
 * @param endpoint - The WAHA API endpoint to call (e.g., '/api/sessions').
 * @param options - Standard fetch options.
 * @returns {Promise<Response>} The fetch Response object.
 */
export async function wahaFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const { baseUrl, apiKey } = await getWahaConfig();

    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const headers = new Headers(options.headers || {});
    
    // Force X-Api-Key as per FASE 1
    headers.set('X-Api-Key', apiKey);
    
    if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
    }

    headers.set('Accept', 'application/json');

    console.log(`[wahaFetch] Calling: ${options.method || 'GET'} ${url}`);

    return fetch(url, {
        ...options,
        headers,
    });
}
