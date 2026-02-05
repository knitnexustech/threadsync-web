// Session persistence utility for "Remember Me" functionality

const SESSION_KEY = 'kramiz_session';

export interface SessionData {
    user: any; // User object
    timestamp: number;
    rememberMe: boolean;
}

/**
 * Save user session to storage
 * @param user - User object to save
 * @param rememberMe - If true, uses localStorage (persistent). If false, uses sessionStorage (session-only)
 */
export const saveSession = (user: any, rememberMe: boolean): void => {
    const sessionData: SessionData = {
        user,
        timestamp: Date.now(),
        rememberMe
    };

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(SESSION_KEY, JSON.stringify(sessionData));

    // Clear from the other storage to avoid conflicts
    const otherStorage = rememberMe ? sessionStorage : localStorage;
    otherStorage.removeItem(SESSION_KEY);
};

/**
 * Load user session from storage
 * @returns User object if valid session exists, null otherwise
 */
export const loadSession = (): any | null => {
    // Check localStorage first (persistent sessions)
    let sessionData = loadFromStorage(localStorage);

    // If not found, check sessionStorage (session-only)
    if (!sessionData) {
        sessionData = loadFromStorage(sessionStorage);
    }

    if (!sessionData) {
        return null;
    }

    // Check if session is expired (30 days for persistent, no limit for session-only)
    if (sessionData.rememberMe) {
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const isExpired = Date.now() - sessionData.timestamp > thirtyDaysInMs;

        if (isExpired) {
            clearSession();
            return null;
        }
    }

    return sessionData.user;
};

/**
 * Helper to load and parse session data from a specific storage
 */
const loadFromStorage = (storage: Storage): SessionData | null => {
    try {
        const data = storage.getItem(SESSION_KEY);
        if (!data) return null;

        return JSON.parse(data) as SessionData;
    } catch (error) {
        console.error('Error loading session:', error);
        return null;
    }
};

/**
 * Clear user session from all storage
 */
export const clearSession = (): void => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
};

/**
 * Check if a valid session exists
 */
export const hasValidSession = (): boolean => {
    return loadSession() !== null;
};
