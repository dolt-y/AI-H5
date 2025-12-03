interface StreamOptions {
  url: string;
  data: any;
  onMessage: (chunk: string) => void;
  onDone?: () => void;
  onError?: (err: any) => void;
  signal?: AbortSignal; // 可选：用于取消请求
}

const token = localStorage.getItem('token');

export async function streamFetch({
  url,
  data,
  onMessage,
  onDone,
  onError,
  signal
}: StreamOptions) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data),
      signal
    });

    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let buffer = ''; // 存放已解码但未完整解析的 SSE 文本

    // 辅助：处理单个 SSE event block（可能包含多行 data:）
    const processEventBlock = (block: string) => {
      // 将多行中所有以 data: 开头的行抽出并拼接（SSE 规范允许多 data 行）
      const lines = block.split(/\r?\n/);
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith('data:')) {
          dataLines.push(line.replace(/^data:\s*/, ''));
        }
        // 可扩展：处理 event:, id: 等字段
      }
      if (dataLines.length === 0) return;

      const dataStr = dataLines.join('\n').trim();

      // 兼容老格式 [DONE]
      if (dataStr === '[DONE]') {
        onDone?.();
        return;
      }

      // 期望后端发送 JSON 字符串，如 {type:'delta',text: '...'} 或 {type:'done'}
      try {
        const obj = JSON.parse(dataStr);
        if (obj && obj.type === 'delta' && typeof obj.text === 'string') {
          onMessage(obj.text);
        } else if (obj && obj.type === 'done') {
          onDone?.();
        } else {
          // 如果不是期望结构，也把原始 dataStr 当作一段文本传出
          onMessage(dataStr);
        }
      } catch (e) {
        // 非 JSON，直接把 dataStr 当作文本传递
        onMessage(dataStr);
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (value) {
        // 增量解码（stream:true），避免多字节字符被截断
        buffer += decoder.decode(value, { stream: true });
      }

      // 找到完整的 SSE 事件分隔符 \n\n 并逐个处理
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const trimmed = rawEvent.trim();
        if (!trimmed) continue;
        processEventBlock(trimmed);
      }

      if (done) {
        // 流结束时 flush decoder 剩余字节
        buffer += decoder.decode(); // flush
        // 处理剩余内容（如果存在）
        if (buffer.trim()) {
          // 可能最后一块没有以双换行结束，先按同样方式处理一次
          // 可能存在多个事件，按 \n\n 再次分割
          const parts = buffer.split(/\n\n/);
          for (const part of parts) {
            const t = part.trim();
            if (t) processEventBlock(t);
          }
        }
        onDone?.();
        break;
      }
    }
  } catch (err) {
    onError?.(err);
  }
}