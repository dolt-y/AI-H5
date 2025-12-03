interface StreamOptions {
  url: string;
  data: any;
  onMessage: (chunk: string) => void;
  onDone?: (sessionId?: string) => void;
  onError?: (err: any) => void;
}

const token = localStorage.getItem('token');

export async function streamFetch({
  url,
  data,
  onMessage,
  onDone,
  onError
}: StreamOptions) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    });

    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    const processEventBlock = (block: string) => {
      const lines = block.split(/\r?\n/);
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith('data:')) {
          dataLines.push(line.replace(/^data:\s*/, ''));
        }
      }

      if (dataLines.length === 0) return;
      const dataStr = dataLines.join('').trim();

      try {
        const obj = JSON.parse(dataStr);
        if (obj?.type === 'delta' && typeof obj.text === 'string') {
          onMessage(obj.text);
        } else if (obj?.type === 'done') {
          // 提取 sessionId 并传递给 onDone
          onDone?.(obj.sessionId);
        }
      } catch (e) {
        onMessage(dataStr);
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: true });
      }

      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const trimmed = rawEvent.trim();
        if (trimmed) processEventBlock(trimmed);
      }

      if (done) {
        buffer += decoder.decode();
        if (buffer.trim()) {
          const parts = buffer.split(/\n\n/);
          for (const part of parts) {
            const t = part.trim();
            if (t) processEventBlock(t);
          }
        }
        break;
      }
    }
  } catch (err) {
    onError?.(err);
  }
}