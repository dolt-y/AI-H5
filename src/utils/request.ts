// request.ts
type Method = 'GET' | 'POST';

interface RequestOptions {
    method?: Method;
    data?: any;
    params?: Record<string, any>;
}
const token = localStorage.getItem('token')
function buildURL(url: string, params?: Record<string, any>) {
    if (!params) return url;
    const query = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
    return query ? `${url}?${query}` : url;
}

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', data, params } = options;

    const fullURL = buildURL(url, params);

    const res = await fetch(fullURL, {
        method,
        headers: {
            'Cache-Control': 'no-cache',
            'content-type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})

        },
        body: method === 'POST' && data ? JSON.stringify(data) : undefined,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    return res.json() as Promise<T>;
}


export const get = <T>(url: string, params?: Record<string, any>) => request<T>(url, { method: 'GET', params });
export const post = <T>(url: string, data?: any) => request<T>(url, { method: 'POST', data });
