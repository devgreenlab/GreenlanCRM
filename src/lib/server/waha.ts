// src/lib/server/waha.ts
import { getAdminServices } from "@/lib/firebase/server-app";
import type { IntegrationSettings } from "../firestore/types";

// Helper function to get the WAHA base URL. Non-secret.
// It prioritizes the value from Firestore, then falls back to ENV.
async function getWahaBaseUrl(): Promise<string> {
    try {
        const { firestore } = getAdminServices();
        const settingsDoc = await firestore.collection('integrations').doc('settings').get();
        if (settingsDoc.exists) {
            const data = settingsDoc.data() as IntegrationSettings;
            if (data.wahaBaseUrl) {
                return data.wahaBaseUrl;
            }
        }
    } catch (error) {
        console.warn("Could not fetch wahaBaseUrl from Firestore, falling back to ENV.", error);
    }

    const baseUrlFromEnv = process.env.WAHA_BASE_URL;
    if (baseUrlFromEnv) {
        return baseUrlFromEnv;
    }
    
    return "";
}


/**
 * A centralized fetch function for making requests to the WAHA API.
 * It automatically retrieves configuration and applies auth headers.
 * Base URL is from Firestore (or ENV fallback). API Key is ENV-only.
 * @param endpoint - The WAHA API endpoint to call (e.g., '/api/sessions').
 * @param options - Standard fetch options.
 * @returns {Promise<Response>} The fetch Response object.
 * @throws {Error} if required environment variables are not configured.
 */
export async function wahaFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const baseUrl = await getWahaBaseUrl();
    const apiKey = process.env.WAHA_API_KEY;

    if (!baseUrl || !apiKey) {
        console.error('[wahaFetch] WAHA environment variables (WAHA_BASE_URL, WAHA_API_KEY) are not fully configured.');
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
