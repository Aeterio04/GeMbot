// Set EXPO_PUBLIC_API_URL in your .env to your ngrok / local server URL
const BASE = process.env.EXPO_PUBLIC_API_URL!;

/** Fetch with a 45-second timeout so unreachable hosts fail, but LLM requests have time to complete. */
async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000); // 45 seconds
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error(`Request timed out. Is the server reachable at ${BASE}?`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function authSignup(email: string, password: string): Promise<{ user_id: string }> {
  const res = await fetchWithTimeout(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Signup failed');
  return data;
}

export async function authLogin(
  email: string,
  password: string
): Promise<{ access_token: string; user_id: string }> {
  const res = await fetchWithTimeout(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  return data;
}

/** Returns the Supabase OAuth URL for the given provider (e.g. "google"). */
export async function getOAuthUrl(provider: string): Promise<string> {
  const res = await fetchWithTimeout(`${BASE}/auth/oauth/${provider}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'OAuth URL fetch failed');
  return data.url as string;
}

/** Validates an OAuth access_token via the backend and returns user info. */
export async function handleOAuthCallback(
  access_token: string
): Promise<{ user_id: string; email: string; access_token: string }> {
  const res = await fetchWithTimeout(`${BASE}/auth/oauth/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'OAuth callback failed');
  return data;
}


/** Send a single message to the backend. History is managed server-side. */
export async function sendMessage(
  message: string,
  token: string
): Promise<{ reply: string }> {
  const res = await fetchWithTimeout(`${BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `Chat failed: ${res.status}`);
  return data;
}

export async function getChatHistory(userId: string, token: string) {
  const res = await fetch(`${BASE}/history/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('History fetch failed');
  return res.json();
}

export async function clearHistory(userId: string, token: string) {
  const res = await fetch(`${BASE}/history/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Clear failed');
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
