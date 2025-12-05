// src/hooks/chat/useChatStream.ts
// 聊天请求部分的hook逻辑
import { ref, nextTick } from "vue";
import { renderMarkdown } from "@/utils/markdown";
import { streamFetch } from "@/utils/streamRequest";
import api from "@/utils/api";
import type { ChatMessage } from "@/utils/type";
import type { ScrollToBottomFn } from "./useChatScroll";
export function useChatStream(scrollToBottom: ScrollToBottomFn) {
    const isAssistantTyping = ref(false);// ai是否在回复中
    const assistantMessageContent = ref(""); //ai回复的内容

    function createAssistantMessage(id: number): ChatMessage {
        return {
            id,
            role: "assistant",
            type: "text",
            content: "",
            reasoning_content: "",
            status: "pending",
            timestamp: Date.now(),
        };
    }
    /**
     * 
     * @param messages 消息列表
     * @param nextMessageId 获取下一条消息ID的函数
     * @param originalText 用户消息的原始文本
     * @param sessionId 会话ID
     * @param selectedModel 选择的模型
     * @returns 
     */
    async function streamAssistantReply(
        messages: ChatMessage[],
        nextMessageId: () => number,
        originalText: string,
        sessionId: string | number | undefined,
        selectedModel: string
    ) {
        isAssistantTyping.value = true;

        const assistantMsg = createAssistantMessage(nextMessageId());
        messages.push(assistantMsg);
        scrollToBottom(`message-${assistantMsg.id}`);

        assistantMessageContent.value = "";

        // 使用requestAnimationFrame进行帧优化更新
        let renderFrame: number | null = null;
        const scheduleUpdate = () => {
            if (renderFrame) return;
            renderFrame = requestAnimationFrame(() => {
                renderFrame = null;
                assistantMsg.content = renderMarkdown(assistantMessageContent.value);
                const index = messages.findIndex(m => m.id === assistantMsg.id);
                if (index !== -1) {
                    messages[index] = { ...assistantMsg };
                }
            });
        };

        return new Promise<void>((resolve) => {
            let gotFirst = false;
            streamFetch({
                url: api.chat,
                data: {
                    messages: [{ role: "user", content: originalText }],
                    sessionId,
                    stream: true,
                    model: selectedModel,
                },

                onMessage: (chunk: string) => {
                    console.log('流式请求接收到数据:', chunk);
                    const parsedText = chunk;
                    if (!parsedText) return;
                    if (!gotFirst) {
                        gotFirst = true;
                        assistantMsg.status = 'success';
                    }
                    assistantMessageContent.value += parsedText;
                    // 更新消息列表,requestAnimationFrame帧优化
                    assistantMsg.content = assistantMessageContent.value;
                    scheduleUpdate();
                    nextTick(() => {
                        scrollToBottom(`message-${assistantMsg.id}`);
                    });
                },

                onThinking: (thinking) => {
                    if (!gotFirst) {
                        gotFirst = true;
                        assistantMsg.status = 'success';
                    }
                    assistantMsg.reasoning_content += thinking;
                    scheduleUpdate();
                    nextTick(() => {
                        scrollToBottom(`message-${assistantMsg.id}`);
                    });
                },

                onDone: () => {
                    assistantMsg.content = assistantMessageContent.value;
                    assistantMsg.status = "success";
                    const index = messages.findIndex(m => m.id === assistantMsg.id);
                    if (index !== -1) {
                        messages[index] = { ...assistantMsg };
                    }
                    isAssistantTyping.value = false;
                    scrollToBottom(`message-${assistantMsg.id}`);
                    resolve();
                },

                onError: (err) => {
                    assistantMsg.status = "error";
                    const index = messages.findIndex(m => m.id === assistantMsg.id);
                    if (index !== -1) {
                        messages[index] = { ...assistantMsg };
                    }
                    isAssistantTyping.value = false;
                    console.error('流式请求出错:', err);
                    resolve();
                },
            });
        });
    }

    return {
        isAssistantTyping,
        streamAssistantReply,
    };
}
