<template>
  <div class="message-list" ref="listRef">
    <div class="messages-container">
      <!-- Empty state -->
      <div v-if="messages.length === 0 && !isStreaming" class="empty-state">
        <div class="empty-icon">🤖</div>
        <h2 class="empty-title">你好，我是你的数字员工助手</h2>
        <p class="empty-desc">我可以帮你分析表格、生成报告、管理任务、处理文件，随时开始对话吧</p>

        <div class="quick-commands">
          <button
            v-for="cmd in quickCommands"
            :key="cmd.id"
            class="quick-cmd-btn"
            @click="$emit('quickCommand', cmd.prompt)"
          >
            <span class="cmd-icon">{{ cmd.icon }}</span>
            <span class="cmd-label">{{ cmd.label }}</span>
          </button>
        </div>
      </div>

      <!-- Messages -->
      <template v-for="msg in messages" :key="msg.id">
        <MessageBubble :message="msg" :ai-avatar-url="aiAvatarUrl" :user-avatar-url="userAvatarUrl" :user-initial="userInitial" @action="$emit('action', $event)" />
      </template>

      <!-- Streaming message -->
      <div v-if="isStreaming && streamingContent" class="message-bubble role-assistant">
        <div class="bubble-avatar">
          <img :src="aiAvatarUrl" class="avatar-img" />
        </div>
        <div class="bubble-body">
          <div class="bubble-content streaming">
            <div class="bubble-text" v-text="streamingContent"></div>
            <span class="cursor-blink">|</span>
          </div>
        </div>
      </div>

      <!-- Loading indicator -->
      <div v-if="isStreaming && !streamingContent" class="message-bubble role-assistant">
        <div class="bubble-avatar">
          <img :src="aiAvatarUrl" class="avatar-img" />
        </div>
        <div class="bubble-body">
          <div class="bubble-content">
            <div class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import MessageBubble from './MessageBubble.vue'
import type { ChatMessage, QuickCommand } from '../../../types/chat'
import aiAvatarDefault from '@/assets/icons/icon.png'

const props = withDefaults(defineProps<{
  messages: ChatMessage[]
  isStreaming: boolean
  streamingContent: string
  quickCommands: QuickCommand[]
  aiAvatarUrl?: string
  userAvatarUrl?: string
  userInitial?: string
}>(), {
  aiAvatarUrl: aiAvatarDefault,
  userAvatarUrl: '',
  userInitial: ''
})

defineEmits<{
  quickCommand: [prompt: string]
  action: [action: string]
}>()

const listRef = ref<HTMLElement>()

function scrollToBottom(): void {
  nextTick(() => {
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  })
}

watch(() => props.messages.length, scrollToBottom)
watch(() => props.streamingContent, scrollToBottom)
</script>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
}

.messages-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: var(--text-secondary);
  max-width: 400px;
  line-height: 1.6;
  margin-bottom: 28px;
}

.quick-commands {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.quick-cmd-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-content);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  font-size: 13px;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.quick-cmd-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.cmd-icon {
  font-size: 15px;
}

.cmd-label {
  white-space: nowrap;
}

/* Inline message styles (used in list context, not in bubble component) */
.message-bubble {
  display: flex;
  gap: 10px;
  padding: 6px 0;
  max-width: 80%;
}

.message-bubble.role-assistant {
  align-self: flex-start;
}

.bubble-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bubble-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.bubble-content {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  line-height: 1.75;
  font-size: 15px;
  font-family: var(--font-family);
  background: var(--bg-message-ai);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-bottom-left-radius: 4px;
}

.bubble-content.streaming {
  display: flex;
  align-items: flex-start;
  gap: 2px;
}

.bubble-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 15px;
  line-height: 1.75;
}

.cursor-blink {
  animation: blink 1s step-end infinite;
  color: var(--color-primary);
  font-weight: 300;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-tertiary);
  animation: typing 1.4s ease-in-out infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
}
</style>
