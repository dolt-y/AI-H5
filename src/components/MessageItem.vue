<template>
    <div class="message-item"
        :class="{ 'ai-message': message.role === 'assistant', 'user-message': message.role === 'user' }"
        :id="`message-${message.id}`">
        <div class="avatar">
            <img class="avatar-img" :src="message.role === 'assistant' ? logo : userInfo.avatarUrl" alt="头像">
        </div>
        <div class="message-wrapper">
            <div class="message-header">
                <div v-if="message.role === 'assistant'" class="message-name">喜多川海梦</div>
                <div v-else class="message-name">{{ userInfo.nickname }}</div>
                <text class="message-time">{{ formatTime(message.timestamp) }}</text>
            </div>

            <div class="message-bubble">
                <div v-if="message.type === 'text'" class="message-content markdown-content">
                    <!-- AI消息 pending 状态下显示 thinking loading -->
                    <div v-if="message.role === 'assistant' && message.status === 'pending'" class="thinking-indicator">
                        <img src="../assets/thinking-icon.svg" alt="思考中" class="thinking-icon" />
                        <span class="thinking-text">思考中</span>
                    </div>
                    <div v-else v-html="renderedHtml" class="markdown-content"></div>
                </div>
                <div v-else-if="message.type === 'image'" class="message-image" @click="predivImage(message.content)">
                    <image :src="message.content" mode="aspectFill"></image>
                    <div class="image-overlay"></div>
                </div>
                <!-- <div v-if="message.quoted" class="quoted-message">
                    <text class="quoted-label">{{ message.quoted.role === 'assistant' ? '小梦' : '我' }}：</text>
                    <text>{{ truncateText(message.quoted.content, 50) }}</text>
                </div> -->
            </div>
            <div class="message-footer">
                <div class="message-actions"
                    v-if="message.type === 'text' && message.status !== 'pending' && message.role === 'assistant'">
                    <div class="actions-left">
                        <div class="action-btn copy-btn" @click="handleCopy" :class="{ 'copied': isCopied }" title="复制">
                            <img src="../assets/copy-icon.svg" alt="复制" />
                        </div>
                        <div class="action-btn like-btn" @click="handleLike" :class="{ 'liked': isLiked }" title="点赞">
                            <img src="../assets/like-icon.svg" alt="点赞" />
                        </div>
                        <div class="action-btn regenerate-btn" @click="handleRegenerate" title="重新生成">
                            <img src="../assets/regenerate-icon.svg" alt="重新生成" />
                        </div>
                    </div>
                </div>

                <div v-if="showStatus" class="status-pill" :class="statusClass">
                    <div v-if="message.status === 'pending'" class="status-spinner"></div>
                    <text class="status-text">{{ statusText }}</text>
                </div>
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { ref, computed, defineEmits, defineProps, watch, onBeforeUnmount } from 'vue';
import logo from '@/assets/logo1.png';
import "highlight.js/styles/github.css";
import { renderMarkdown } from '@/utils/markdown';
const props = defineProps({
    message: {
        type: Object,
        required: true
    },
    userInfo: {
        type: Object,
        required: true
    }
});
const isCopied = ref(false);
const isLiked = ref(false);
const emit = defineEmits(['preview-image', 'regenerate', 'quote', 'share', 'like']);

function handleCopy() {
    // 获取渲染后的文本
    const bubble = document.getElementById(`message-${props.message.id}`);
    if (!bubble) return;

    const text = bubble.querySelector('.message-content')?.textContent || '';
    if (!text) return;

    navigator.clipboard.writeText(text)
        .then(() => {
            isCopied.value = true;
            setTimeout(() => isCopied.value = false, 1500);
        })
        .catch(err => console.error('复制失败', err));
}

function handleLike() {
    isLiked.value = !isLiked.value;
    emit('like', { messageId: props.message.id, liked: isLiked.value });
}

function handleRegenerate() {
    emit('regenerate', props.message.id);
}
function formatTime(timestamp: string | number | Date) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function predivImage(imageUrl: any) {
    emit('preview-image', imageUrl);
}

function getStatusText(status: string) {
    if (status === 'pending') return '发送中';
    if (status === 'error') return '发送失败';
    return '已送达';
}
const renderedHtml = ref('');
let latestContent = '';
let renderFrame: number | null = null;

function scheduleRender() {
    if (renderFrame !== null) return;
    renderFrame = requestAnimationFrame(() => {
        renderFrame = null;
        renderedHtml.value = renderMarkdown(latestContent);
    });
}

watch(() => props.message.content, (newContent) => {
    latestContent = newContent || '';
    scheduleRender();
}, { immediate: true });

onBeforeUnmount(() => {
    if (renderFrame !== null) {
        cancelAnimationFrame(renderFrame);
    }
});

const showStatus = computed(() => props.message.role === 'user');
const statusText = computed(() => getStatusText(props.message.status));
const statusClass = computed(() => props.message.status || 'success');
</script>
<style lang="scss" scoped>
.message-item {
    display: flex;
    gap: 0.5rem;
    padding: 1rem 0;
    animation: messageSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);

    .avatar {
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        flex-shrink: 0;
        overflow: hidden;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        border: 3px solid rgba(255, 255, 255, 0.8);

        .avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    .message-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: calc(100% - 64px);
    }

    .message-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0 4px;

        .message-name {
            font-size: 1rem;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .message-time {
            color: rgba(0, 0, 0, 0.45);
            letter-spacing: 0.3px;
        }
    }

    .message-bubble {
        display: flex;
        justify-items: center;
        align-items: center;
        justify-content: center;
        padding: 0rem 1rem;
        border-radius: 20px 20px 20px 4px;
        word-wrap: break-word;
        word-break: break-word;
        white-space: normal;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        overflow-x: auto;

        &:active {
            transform: translateY(2px);
        }
    }

    &.user-message {
        flex-direction: row-reverse;

        .message-wrapper {
            align-items: flex-end;
        }

        .message-header {
            flex-direction: row-reverse;

            .message-time {
                color: rgba(0, 0, 0, 0.5);
            }
        }

        .message-bubble {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            border-radius: 20px 20px 4px 20px;
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
        }

        .avatar {
            border-color: rgba(102, 126, 234, 0.3);
        }

        .message-footer {
            flex-direction: row-reverse;
        }
    }

    &.ai-message {
        .message-bubble {
            background: #ffffff;
            color: #1f2937;
            border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .avatar {
            border-color: rgba(99, 102, 241, 0.3);
        }
    }

    .message-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 0 4px;
    }

    .message-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 16px;

        .actions-left {
            display: flex;
            gap: 16px;
            align-items: center;
        }

        .actions-right {
            display: flex;
            gap: 16px;
            align-items: center;
            margin-left: auto;
        }

        .action-btn {
            width: 2rem;
            height: 2rem;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--color-bg-soft);
            border: 1px solid var(--color-border-soft);
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            flex-shrink: 0;
            box-shadow: var(--shadow-soft);

            img {
                width: 1rem;
                height: 1rem;
                opacity: 0.7;
                transition: opacity 0.2s ease;
            }

            &:hover {
                background: var(--color-bg-elevated);
                border-color: var(--color-accent);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);

                img {
                    opacity: 1;
                }
            }

            &:active {
                transform: scale(0.92);
            }

            &.copy-btn {
                &.copied {
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.2) 100%);
                    border-color: rgba(16, 185, 129, 0.3);
                    animation: successPulse 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);

                    img {
                        opacity: 1;
                    }
                }
            }

            &.like-btn {
                &.liked {
                    background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(219, 39, 119, 0.2) 100%);
                    border-color: rgba(236, 72, 153, 0.3);

                    img {
                        opacity: 1;
                        filter: drop-shadow(0 0 4px rgba(236, 72, 153, 0.4));
                    }
                }
            }

            &.regenerate-btn {
                &:active {
                    animation: rotate360 0.6s ease-out;
                }
            }
        }
    }

    .status-pill {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0.3rem 0.6rem;
        border-radius: 24px;
        font-weight: 500;
        white-space: nowrap;
        flex-shrink: 0;
        margin-top: 4px;

        &.pending {
            background: rgba(99, 102, 241, 0.12);
            color: #6366f1;
        }

        &.success {
            background: rgba(16, 185, 129, 0.12);
            color: #059669;
        }

        &.error {
            background: rgba(239, 68, 68, 0.12);
            color: #dc2626;
        }

        .status-text {
            font-size: 0.6rem;
            letter-spacing: 0.5px;
        }
    }

    .status-spinner {
        width: 1rem;
        height: 1rem;
        border-radius: 50%;
        border: 3px solid currentColor;
        border-top-color: transparent;
        animation: spinner 0.8s linear infinite;
    }

    .markdown-content {
        width: 100%;
        line-height: 1.8;
        color: inherit;

        // :deep(p) {
        //     margin-bottom: 16px;

        //     &:last-child {
        //         margin-bottom: 0;
        //     }
        // }

        // :deep(code) {
        //     font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
        //     background: rgba(0, 0, 0, 0.06);
        //     padding: 4px 10px;
        //     border-radius: 8px;
        //     font-size: 26px;
        // }

        :deep(pre) {
            background: #1e293b;
            color: #e2e8f0;
            padding: 24px;
            border-radius: 16px;
            overflow: auto;
            margin: 16px 0;

            code {
                background: none;
                padding: 0;
            }
        }

        :deep(ul),
        :deep(ol) {
            margin: 16px 0;
            padding-left: 32px;
        }

        :deep(li) {
            margin-bottom: 8px;
        }

        :deep(blockquote) {
            border-left: 4px solid rgba(99, 102, 241, 0.5);
            padding-left: 20px;
            color: rgba(0, 0, 0, 0.6);
            margin: 16px 0;
            font-style: italic;
        }

        :deep(a) {
            color: #6366f1;
            text-decoration: underline;
        }

        :deep(table) {
            border: 1px solid #e2e8f0;
        }

        :deep(th) {
            background-color: #f5f5f5;
            border: 1px solid #e2e8f0;
            // padding: 0.1rem;
            font-weight: 500;
            text-align: left;
            // font-size: 0.6rem;
        }

        :deep(td) {
            border: 1px solid #e2e8f0;
            //    padding: 0.1rem;
            text-align: left;
        }

    }
}

.thinking-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 1rem 0;

    .thinking-icon {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
    }

    .thinking-text {
        font-size: 0.95rem;
        letter-spacing: 0.5px;
        color: var(--color-text-secondary);
        font-weight: 400;
    }
}

.message-image {
    max-width: 100%;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    position: relative;

    image {
        width: 100%;
        display: block;
    }

    .image-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent 60%, rgba(0, 0, 0, 0.3));
        pointer-events: none;
    }
}

@keyframes messageSlideIn {
    from {
        opacity: 0;
        transform: translateY(2.5rem) scale(0.95);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes spinner {
    to {
        transform: rotate(360deg);
    }
}

@keyframes successPulse {

    0%,
    100% {
        transform: scale(1);
    }

    50% {
        transform: scale(1.15);
    }
}

@keyframes rotate360 {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}
</style>