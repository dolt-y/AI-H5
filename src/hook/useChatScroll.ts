// src/hooks/chat/useChatScroll.ts
// 聊天滚动部分的hook逻辑
import { nextTick } from "vue";

export type ScrollToBottomFn = (targetId?: string) => Promise<void>;

export function useChatScroll() {
    const bottomAnchorId = "chat-bottom-anchor";

    async function scrollToBottom(targetId?: string) {
        await nextTick();
        const id = targetId ?? bottomAnchorId;

        await new Promise((r) => requestAnimationFrame(() => r(null)));
        await new Promise((r) => requestAnimationFrame(() => r(null)));

        const el = document.getElementById(id);
        const chatBody = document.querySelector(".chat-body") as HTMLElement;

        if (!chatBody) return;

        if (el && chatBody.contains(el)) {
            // 计算目标元素底部对容器的 scrollTop 值，然后平滑滚动
            const target = el.offsetTop + el.offsetHeight - chatBody.clientHeight;
            chatBody.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
            return;
        }
        // 如果找不到指定元素，直接滚动到容器底部
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    }

    return {
        scrollToBottom,
        bottomAnchorId,
    };
}
