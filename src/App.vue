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
          <div class="welcome-card">
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
      <InputArea v-model="inputValue" :is-recording="isRecording" :recording-duration="recordingDuration"
        :selected-model="selectedModel" :model-options="modelOptions"
        @send-message="handleSendMessage" @view-history="handleViewHistory" @new-session="handleNewSession"
        @update:selected-model="selectedModel = $event" @start-recording="handleStartRecording"
        @stop-recording="handleStopRecording" @settings="handleSettings" />
    </div>
    <HistroySessions :visible="historySessionsVisible" :active-session-id="sessionId"
      @close="historySessionsVisible = false" @select-session="handleSelectSession" />
  </div>
</template>
<script lang="ts" setup>
import InputArea from '@/components/InputArea.vue';
import MessageItem from '@/components/MessageItem.vue';
import HistroySessions from '@/components/HistroySessions.vue';
import type { ChatMessage, Session, ModelOption, user, ToastExpose, HistoryMessage } from '@/utils/type';
import { nextTick, onMounted, ref, watch } from 'vue';
import { get, post } from '@/utils/request';
import { streamFetch } from '@/utils/streamRequest';
import { renderMarkdown } from '@/utils/markdown';

const messages = ref<ChatMessage[]>([]);// 消息列表
const messageIdSeed = ref<number>(0);// 消息ID
const bottomAnchorId = 'chat-bottom-anchor';
const typingAnchorId = 'chat-typing-anchor';
const isAssistantTyping = ref<boolean>(false);// AI正在输入

const isRecording = ref<boolean>(false);// 是否正在录音
const recordingDuration = ref<number>(0);// 录音时长
const inputValue = ref<string>('');// 输入框内容
const recordingCancel = ref<boolean>(false);// 录音是否取消
const conversationStartedAt = ref<number>(Date.now());// 会话开始时间
const scrollTargetId = ref<string>('');// 滚动目标ID
const sessionId = ref<number | string>();

const historySessionsVisible = ref<boolean>(false);
const lastUserMessage = ref<ChatMessage | null>(null);

const assistantMessageContent = ref(''); // 用于流式文本拼接

// 模型选择
const selectedModel = ref<string>('gpt-3.5-turbo');
const modelOptions = ref<ModelOption[]>([
  { value: 'gpt-3.5-turbo', text: 'GPT-3.5' },
  { value: 'gpt-4', text: 'GPT-4' },
  { value: 'gpt-4-turbo', text: 'GPT-4 Turbo' }
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
  // localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
  // console.log(localStorage.getItem('token'), localStorage.getItem('userInfo'));
})
function getQueryParam(name: string) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || '';
}

const initializeConversation = () => {
  messageIdSeed.value = 0;
  conversationStartedAt.value = Date.now();
  messages.value = [createAssistantGreeting()];
  scrollToBottom();
};

initializeConversation();

function nextMessageId(): number {
  messageIdSeed.value += 1;
  return messageIdSeed.value;
}
function scrollToBottom(targetId?: string) {
  nextTick(() => {
    const id = targetId ?? bottomAnchorId;
    scrollTargetId.value = id;
    
    // 实际执行滚动
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else {
      // 如果没有找到元素，滚动到聊天窗口底部
      const chatBody = document.querySelector('.chat-body');
      if (chatBody) {
        chatBody.scrollTop = chatBody.scrollHeight;
      }
    }
  });
}
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
  let id = sessionId?.value;
  
  // 更新用户消息状态为成功（消息已发送）
  userMessage.status = 'success';
  const userIndex = messages.value.findIndex(m => m.id === userMessage.id);
  if (userIndex !== -1) {
    messages.value[userIndex] = { ...userMessage };
  }
  
  await streamAssistantReply(userMessage, content, id);
}
function streamAssistantReply(userMessage: ChatMessage, originalText: string, sessionId: string | number | undefined) {
  isAssistantTyping.value = true;

  const assistantMessage: ChatMessage = {
    id: nextMessageId(),
    role: 'assistant',
    type: 'text',
    content: '',
    status: 'pending',
    timestamp: Date.now(),
    quoted: {
      id: userMessage.id,
      role: 'user',
      content: originalText
    }
  };

  messages.value.push(assistantMessage);
  scrollToBottom(`message-${assistantMessage.id}`);

  assistantMessageContent.value = '';

  return new Promise<void>((resolve) => {
    let updateTimer: number | null = null;
    
    streamFetch({
      url: 'http://localhost:3000/api/ai/chat',
      data: {
        messages: [{ role: 'user', content: originalText }],
        sessionId,
        stream: true,
        model: selectedModel.value,
      },
      onMessage(chunk: string) {
        // 拼接完整文本（保持markdown格式）
        assistantMessageContent.value += chunk;

        // 立即更新，不使用防抖，确保实时渲染
        const index = messages.value.findIndex(m => m.id === assistantMessage.id);
        if (index !== -1) {
          // 直接保存markdown文本，让MessageItem组件的computed属性来实时渲染
          assistantMessage.content = assistantMessageContent.value;
          // 使用Vue的响应式更新
          messages.value[index] = { ...assistantMessage };
          
          // 使用nextTick确保DOM更新后再滚动
          nextTick(() => {
            scrollToBottom(`message-${assistantMessage.id}`);
          });
        }
      },
      onDone() {
        // 确保最后一次更新
        if (updateTimer) {
          clearTimeout(updateTimer);
        }
        
        // 保存markdown文本，让computed属性来渲染
        assistantMessage.content = assistantMessageContent.value;
        assistantMessage.status = 'success';
        
        const index = messages.value.findIndex(m => m.id === assistantMessage.id);
        if (index !== -1) {
          messages.value[index] = { ...assistantMessage };
        }
        
        isAssistantTyping.value = false;
        scrollToBottom(`message-${assistantMessage.id}`);
        resolve();
      },
      onError(err: any) {
        if (updateTimer) {
          clearTimeout(updateTimer);
        }
        assistantMessage.status = 'error';
        const index = messages.value.findIndex(m => m.id === assistantMessage.id);
        if (index !== -1) {
          messages.value[index] = { ...assistantMessage };
        }
        isAssistantTyping.value = false;
        console.error('流式请求出错:', err);
        resolve();
      }
    });
  });
}

// 打开历史会话弹窗
function handleViewHistory() {
  historySessionsVisible.value = true;
}

// 新建会话
async function handleNewSession() {
  // 如果正在输入，不允许新建会话
  if (isAssistantTyping.value) {
    return;
  }
  
  try {
    // 创建新会话
    const res: any = await post('http://localhost:3000/api/ai/sessions', {
      title: '新会话',
      summary: ''
    });
    
    if (res?.session?.id) {
      sessionId.value = res.session.id;
      initializeConversation();
      console.log('新会话已创建');
    } else {
      // 如果返回格式不符合预期，也初始化本地会话
      sessionId.value = undefined;
      initializeConversation();
    }
  } catch (error) {
    console.error('创建新会话失败', error);
    // 即使创建失败，也初始化一个新会话（本地）
    sessionId.value = undefined;
    initializeConversation();
  }
}
// 选择历史会话
function applyHistoryMessages(rawMessages: HistoryMessage[]) {
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
    status: 'success' as const,
    timestamp: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
    quoted: null
  }));

  messages.value = [...parsedMessages];
  console.log(messages.value);
  // conversationStartedAt.value = parsedMessages[0].timestamp;
  // lastUserMessage.value = [...parsedMessages].reverse().find((msg) => msg.role === 'user') ?? null;
  // isAssistantTyping.value = false;
  // inputValue.value = '';
  // scrollToBottom();
}
// 处理重新生成
function handleRegenerate(messageId: number) {
  // 找到该消息和它之前的用户消息
  const assistantMsgIndex = messages.value.findIndex(m => m.id === messageId);
  if (assistantMsgIndex === -1) return;
  
  const assistantMsg = messages.value[assistantMsgIndex];
  // 找到之前的用户消息
  const userMsgIndex = assistantMsgIndex - 1;
  if (userMsgIndex < 0 || messages.value[userMsgIndex].role !== 'user') return;
  
  const userMsg = messages.value[userMsgIndex];
  
  // 删除当前助手消息
  messages.value.splice(assistantMsgIndex, 1);
  
  // 重新生成回复
  streamAssistantReply(userMsg, userMsg.content, sessionId.value);
}

// 处理点赞
function handleLike(data: { messageId: number; liked: boolean }) {
  console.log('消息点赞:', data);
  // 这里可以添加点赞的API调用
}

// 处理录音
let recordingTimer: number | null = null;
function handleStartRecording() {
  isRecording.value = true;
  recordingDuration.value = 0;
  recordingTimer = window.setInterval(() => {
    recordingDuration.value += 1;
  }, 1000);
}

function handleStopRecording() {
  isRecording.value = false;
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
  // 这里可以添加语音转文字的API调用
  // 暂时清空录音时长
  recordingDuration.value = 0;
}

// 处理设置
function handleSettings() {
  console.log('打开设置');
  // 这里可以添加设置弹窗
}

async function handleSelectSession(session: Session) {
  if (!session?.id) {
    console.warn('无法识别该会话');
    return;
  }

  // 如果正在输入，不允许切换会话
  if (isAssistantTyping.value) {
    console.warn('AI正在回复，请稍后再切换会话');
    return;
  }

  try {
    const res: any = await get(`http://localhost:3000/api/ai/sessions/${session.id}/messages`);
    const historyMessages = Array.isArray(res?.messages) ? res.messages : [];
    applyHistoryMessages(historyMessages);
    sessionId.value = typeof session.id === 'string' ? session.id : Number(session.id);
    historySessionsVisible.value = false;
    // 滚动到底部
    nextTick(() => {
      scrollToBottom();
    });
  } catch (error) {
    console.error('加载历史会话失败', error);
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
    height: 65vh;
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