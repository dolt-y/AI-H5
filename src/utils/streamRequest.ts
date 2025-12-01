interface StreamOptions {
    url: string;
    data: any;
    onMessage: (chunk: string) => void;
    onDone?: () => void;
    onError?: (err: any) => void;
}

const token = localStorage.getItem('token');

export async function streamFetch({ url, data, onMessage, onDone, onError }: StreamOptions) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(data),
        });

        if (!res.body) throw new Error('No response body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');

        let buffer = ''; // 缓存未完整的事件
        let done = false;

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (!value) continue;

            buffer += decoder.decode(value, { stream: true });

            let index: number;
            while ((index = buffer.indexOf('\n\n')) >= 0) {
                const rawEvent = buffer.slice(0, index).trim();
                buffer = buffer.slice(index + 2);

                if (!rawEvent) continue;

                // SSE 格式通常是 "data: ..."
                if (rawEvent.startsWith('data:')) {
                    const dataStr = rawEvent.replace(/^data:\s*/, '');
                    if (dataStr === '[DONE]') {
                        onDone?.();
                        return;
                    }
                    onMessage(dataStr);
                }
            }
        }

        // 如果流结束时 buffer 还有残余
        if (buffer.trim()) {
            onMessage(buffer.trim());
        }

        onDone?.();
    } catch (err) {
        onError?.(err);
    }
}
