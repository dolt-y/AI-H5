<template>
  <div class="chat-container">
    <!--背景渐变-->
    <div class="page-background">
      <div class="bg-gradient"></div>
      <div class="bg-glow-left"></div>
      <div class="bg-glow-right"></div>
      <div class="bg-noise"></div>
    </div>
    <!--聊天窗口-->
    <div class="chat-body">
      <div class="message-scroll">
        <div class="message-feed">
          <div v-if="messages.length <= 1" class="welcome-card">
            <span class="welcome-title">准备好开始了吗？</span>
            <p class="welcome-body">
              输入你的目标、受众和期望格式，我会帮你拆解任务并给出高质量输出建议。
            </p>
            <div class="welcome-tags">
              <div class="tag">写作灵感</div>
              <div class="tag">方案优化</div>
              <div class="tag">学习规划</div>
            </div>
          </div>
        </div>
        <MessageItem v-for="message in messages" :key="message.id" :message="message" :userInfo="userInfo"
          @regenerate="handleRegenerate" @like="handleLike" />
        <div :id="bottomAnchorId"></div>
      </div>
    </div>
    <!--输入框-->
    <div class="composer-container">
      <InputArea v-model="inputValue" :selected-model="selectedModel" :model-options="modelOptions"
        @send-message="handleSendMessage" @view-history="historySessionsVisible = true" @new-session="handleNewSession"
        @update:selected-model="selectedModel = $event" @settings="handleSettings"
        @stop-recording="handleStartRecording" />
    </div>
    <!--历史会话-->
    <HistroySessions :visible="historySessionsVisible" :active-session-id="sessionId"
      @close="historySessionsVisible = false" @delete-session="handelDelete" @select-session="handleSelectSession" />
    <RecordingIndicator :is-recording="isRecording" :duration="recordingDuration" :is-cancel="isCancel"
      @cancel="handleStopRecording">
    </RecordingIndicator>
  </div>
</template>
<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import InputArea from '@/components/InputArea.vue';
import MessageItem from '@/components/MessageItem.vue';
import HistroySessions from '@/components/HistroySessions.vue';
import RecordingIndicator from './components/RecordingIndicator.vue';
import type { ChatMessage, Session, ModelOption, user, HistoryMessage } from '@/utils/type';
import { nextTick, onMounted, ref } from 'vue';
import { get, post } from '@/utils/request';
import api from '@/utils/api';

import { useChatScroll } from './hook/useChatScroll';
import { useChatStream } from './hook/useChatStream';
import { useChatRecording } from './hook/useChatRecording';
const { scrollToBottom, bottomAnchorId } = useChatScroll();
const { isAssistantTyping, streamAssistantReply } = useChatStream(scrollToBottom);
const { isRecording, recordingDuration, isCancel, handleStartRecording, handleStopRecording } = useChatRecording();

const messages = ref<ChatMessage[]>([]);// 消息列表
const messageIdSeed = ref<number>(0);// 消息ID
const nextMessageId = () => ++messageIdSeed.value;

const inputValue = ref<string>('');// 输入框内容
const conversationStartedAt = ref<number>(Date.now());// 会话开始时间
const sessionId = ref<number | string>();

const historySessionsVisible = ref<boolean>(false);
const lastUserMessage = ref<ChatMessage | null>(null);

// 模型选择
const selectedModel = ref<string>('deepseek-chat');
const modelOptions = ref<ModelOption[]>([
  { value: "deepseek-chat", text: "快速问答" },
  { value: 'deepseek-reasoner', text: "深度思考" }
]);

const userInfo = ref<user>({
  openid: '',
  nickname: '',
  avatarUrl: ''
});
const token = ref<string>();

onMounted(() => {
  token.value = getQueryParam('token');
  localStorage.setItem('token', token.value);
  userInfo.value.nickname = getQueryParam('nickname');
  userInfo.value.avatarUrl = getQueryParam('avatarUrl');
})
// 获取 URL 参数
function getQueryParam(name: string) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || '';
}
// 初始化会话
const initializeConversation = () => {
  messageIdSeed.value = 0;
  conversationStartedAt.value = Date.now();
  messages.value = [createAssistantGreeting()];
  scrollToBottom();
};

initializeConversation();

function createAssistantGreeting(): ChatMessage {
  return {
    id: nextMessageId(),
    role: 'assistant',
    type: 'text',
    content: '你好，我是你的 AI 助手小梦。随时告诉我你的想法，我会帮你整理、发散并给出下一步建议。',
    status: 'success',
    timestamp: Date.now(),
    quoted: null
  };
}
// 发送消息
async function handleSendMessage(rawContent?: string) {
  const content = (rawContent ?? inputValue.value).trim();
  if (!content) {
    return;
  }
  if (isAssistantTyping.value) {
    return;
  }

  const userMessage: ChatMessage = {
    id: nextMessageId(),
    role: 'user',
    type: 'text',
    content,
    status: 'pending',
    timestamp: Date.now(),
    quoted: null
  };

  messages.value.push(userMessage);
  lastUserMessage.value = userMessage;
  inputValue.value = '';
  scrollToBottom(`message-${userMessage.id}`);

  // 更新用户消息状态为成功（消息已发送）
  userMessage.status = 'success';
  const userIndex = messages.value.findIndex(m => m.id === userMessage.id);
  if (userIndex !== -1) {
    messages.value[userIndex] = { ...userMessage };
  }

  await streamAssistantReply(
    messages.value,
    nextMessageId,
    content,
    sessionId.value,
    selectedModel.value
  );
}

// 新建会话
async function handleNewSession() {
  // 如果正在输入，不允许新建会话
  if (isAssistantTyping.value) {
    return;
  }
  sessionId.value = undefined;
  initializeConversation();
}

// 选择历史会话
async function applyHistoryMessages(rawMessages: HistoryMessage[]) {
  if (!rawMessages.length) {
    initializeConversation();
    return;
  }

  messageIdSeed.value = 0;
  const parsedMessages = rawMessages.map((item) => ({
    id: nextMessageId(),
    role: item.role,
    type: 'text' as const,
    content: item.content,
    reasoning_content: item.reasoning_content,
    status: 'success' as const,
    timestamp: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
    quoted: null
  }));

  messages.value = [...parsedMessages];
  console.log(messages.value);
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  const chatBody = document.querySelector('.chat-body') as HTMLElement | null;
  if (chatBody) {
    chatBody.scrollTop = chatBody.scrollHeight;
  } else {
    scrollToBottom();
  }
}

// 加载历史会话
async function handleSelectSession(session: Session) {
  if (!session?.id) {
    ElMessage.error('没有找到该会话');
    // console.warn('无法识别该会话');
    return;
  }
  if (isAssistantTyping.value) {
    ElMessage.info('AI正在回复，请稍后再切换会话');
    // console.warn('AI正在回复，请稍后再切换会话');
    return;
  }
  try {
    const res: any = await get(api.selectSession(session.id));
    const historyMessages = Array.isArray(res?.messages) ? res.messages : [];
    applyHistoryMessages(historyMessages);
    sessionId.value = typeof session.id === 'string' ? session.id : Number(session.id);
    historySessionsVisible.value = false;
  } catch (error) {
    ElMessage.error('加载历史会话失败');
    // console.error('加载历史会话失败', error);
  }
}

// 处理重新生成
function handleRegenerate(messageId: number) {
  // 找到该消息和它之前的用户消息
  const assistantMsgIndex = messages.value.findIndex(m => m.id === messageId);
  if (assistantMsgIndex === -1) return;
  // 找到之前的用户消息
  const userMsgIndex = assistantMsgIndex - 1;
  if (userMsgIndex < 0 || messages.value[userMsgIndex].role !== 'user') return;
  const userMsg = messages.value[userMsgIndex];
  // 删除当前助手消息
  messages.value.splice(assistantMsgIndex, 1);
  streamAssistantReply(messages.value, nextMessageId, userMsg.content, sessionId.value, selectedModel.value);
}

// 处理点赞
function handleLike(data: { messageId: number; liked: boolean }) {
  console.log('消息点赞:', data);
  const res: any = post(api.like(data.messageId));
  console.log('点赞结果:', res);
}


// 处理设置
function handleSettings() {
  console.log('打开设置');
  // 这里可以添加设置弹窗
}
function handelDelete(sessionIdValue: number | string) {
  ElMessage.success('会话已删除');
  // 如果删除的是当前会话，重置聊天
  if (sessionId.value === sessionIdValue) {
    initializeConversation();
    sessionId.value = undefined;
    historySessionsVisible.value = false;
  }
}
</script>
<style scoped lang="scss">
.chat-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .page-background {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;

    .bg-gradient {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, var(--color-bg-primary) 0%, var(--color-bg-card) 60%, var(--color-bg-primary) 100%);
    }

    .bg-glow-left {
      position: absolute;
      top: -120px;
      left: -80px;
      width: 360px;
      height: 360px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, transparent 70%);
    }

    .bg-glow-right {
      position: absolute;
      bottom: 120px;
      right: -120px;
      width: 380px;
      height: 380px;
      background: radial-gradient(circle, rgba(236, 72, 153, 0.16) 0%, transparent 70%);
    }

    .bg-noise {
      position: absolute;
      inset: 0;
      opacity: 0.06;
      background-image: linear-gradient(90deg, rgba(99, 102, 241, 0.12) 1px, transparent 0), linear-gradient(rgba(129, 140, 248, 0.12) 1px, transparent 0);
      background-size: 24px 24px;
      mix-blend-mode: soft-light;
    }
  }

  .chat-body {
    height: 70vh;
    // width: 30rem;
    width: 95vw;
    overflow-y: auto;
    z-index: 1;
    display: flex;
    flex-direction: column;
    padding: 2rem 0.1rem 1rem;
    gap: 2rem;
    box-sizing: border-box;

    .message-scroll {
      flex: 1;
      padding: 0rem 1rem;
      box-sizing: border-box;

      .message-feed {
        display: flex;
        flex-direction: column;
      }

      .welcome-card {
        display: flex;
        flex-direction: column;
        padding: 1rem 1rem;
        border-radius: 12px;
        background: var(--color-bg-soft);
        border: 1px solid var(--color-border-soft);
        box-shadow: var(--shadow-soft);
      }

      .welcome-title {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--color-text-primary);
        letter-spacing: 0.8px;
      }

      .welcome-body {
        font-size: 1rem;
        color: var(--color-text-secondary);
      }

      .welcome-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .welcome-tags .tag {
        padding: 0.3rem 0.6rem;
        border-radius: 999px;
        background: rgba(99, 102, 241, 0.12);
        color: var(--color-text-primary);
        font-size: 0.9rem;
        letter-spacing: 0.6px;
      }
    }
  }

  .composer-container {
    position: fixed;
    bottom: 0;
    padding: 0 2rem 2.5rem;
    background: linear-gradient(180deg, transparent 0%, var(--color-bg-primary) 60%, var(--color-bg-card) 100%);
    backdrop-filter: blur(1.2rem);
    -webkit-backdrop-filter: blur(1.2rem);
    z-index: 2;
  }
}
</style>