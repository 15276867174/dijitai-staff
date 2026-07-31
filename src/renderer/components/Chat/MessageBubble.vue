<template>
  <div class="message-bubble" :class="[`role-${message.role}`, `type-${message.type}`]">
    <div class="bubble-avatar">
      <img v-if="message.role === 'assistant'" :src="aiAvatarUrl" class="avatar-img" />
      <img v-else-if="userAvatarUrl" :src="userAvatarUrl" class="avatar-img" />
      <span v-else class="avatar-text">{{ userInitial }}</span>
    </div>
    <div class="bubble-body">
      <div class="bubble-content">
        <!-- Text message -->
        <div v-if="message.type === 'text'" class="bubble-text" v-text="message.content"></div>

        <!-- Image message -->
        <div v-else-if="message.type === 'image'" class="bubble-image">
          <img :src="message.metadata?.imageUrl" :alt="message.content" />
        </div>

        <!-- File message -->
        <div v-else-if="message.type === 'file'" class="bubble-file">
          <span class="file-icon">📄</span>
          <div class="file-info">
            <span class="file-name">{{ message.metadata?.fileName }}</span>
            <span class="file-size">{{ formatFileSize(message.metadata?.fileSize) }}</span>
          </div>
        </div>

        <!-- Table preview -->
        <div v-else-if="message.type === 'table_preview' && message.metadata?.tableData" class="bubble-table">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th v-for="(header, i) in message.metadata.tableData.headers" :key="i">{{ header }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, ri) in message.metadata.tableData.rows.slice(0, 5)" :key="ri">
                  <td v-for="(cell, ci) in (row as unknown[])" :key="ci">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="message.metadata.tableData.totalRows > 5" class="table-more">
            仅显示前5行，共{{ message.metadata.tableData.totalRows }}行
          </div>
        </div>

        <!-- Progress -->
        <div v-else-if="message.type === 'progress'" class="bubble-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${message.metadata?.progress || 0}%` }"></div>
          </div>
          <span class="progress-text">{{ message.metadata?.progressMessage || '处理中...' }}</span>
        </div>

        <!-- OCR result card -->
        <div v-else-if="message.type === 'ocr_result'" class="bubble-ocr-result">
          <div class="ocr-card">
            <div class="ocr-card-header">
              <span class="ocr-icon">📷</span>
              <span class="ocr-title">图片识别结果</span>
              <span class="ocr-badge" :class="confidenceLevel">{{ confidenceLabel }}</span>
            </div>
            <div class="ocr-card-body">
              <div class="ocr-text-preview">{{ message.metadata?.ocrText?.slice(0, 500) || message.content }}</div>
            </div>
            <div class="ocr-card-footer">
              <span class="ocr-meta">引擎: {{ message.metadata?.ocrStage || 'unknown' }}</span>
              <button
                v-if="message.metadata?.canRetry"
                class="ocr-retry-btn"
                @click="$emit('action', `retryOcr:${message.metadata?.retryImagePath || ''}`)"
              >
                重新识别
              </button>
            </div>
          </div>
        </div>

        <!-- OCR error -->
        <div v-else-if="message.type === 'ocr_error'" class="bubble-ocr-error">
          <div class="ocr-error-card">
            <span class="error-icon">⚠️</span>
            <div class="error-content">
              <span class="error-title">图片识别失败</span>
              <span class="error-detail">{{ message.content || '未能识别出文字，可能是图片过于模糊或倾斜角度过大' }}</span>
              <span class="error-hint">建议：重新拍摄清晰图片，确保文字端正、光线充足</span>
            </div>
            <button
              v-if="message.metadata?.canRetry"
              class="ocr-retry-btn"
              @click="$emit('action', `retryOcr:${message.metadata?.retryImagePath || ''}`)"
            >
              重新识别
            </button>
          </div>
        </div>

        <!-- Action buttons -->
        <div v-if="message.type === 'action_button' && message.metadata?.actions" class="bubble-actions">
          <button
            v-for="action in message.metadata.actions"
            :key="action.action"
            class="action-btn"
            :class="action.variant || 'primary'"
            @click="$emit('action', action.action)"
          >
            {{ action.label }}
          </button>
        </div>
      </div>
      <div class="bubble-time">{{ formatTime(message.timestamp) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage } from '../../../types/chat'
import aiAvatarDefault from '@/assets/icons/icon.png'

const props = withDefaults(defineProps<{
  message: ChatMessage
  aiAvatarUrl?: string
  userAvatarUrl?: string
  userInitial?: string
}>(), {
  aiAvatarUrl: aiAvatarDefault,
  userAvatarUrl: '',
  userInitial: ''
})

defineEmits<{
  action: [action: string]
}>()

const confidenceLevel = computed(() => {
  const conf = props.message.metadata?.ocrConfidence || 0
  if (conf >= 70) return 'high'
  if (conf >= 40) return 'medium'
  return 'low'
})

const confidenceLabel = computed(() => {
  const conf = props.message.metadata?.ocrConfidence
  if (conf == null) return ''
  return `置信度 ${conf}%`
})

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style scoped>
.message-bubble {
  display: flex;
  gap: 10px;
  padding: 6px 0;
  max-width: 80%;
}

.message-bubble.role-user {
  flex-direction: row-reverse;
  align-self: flex-end;
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

.avatar-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.role-user .bubble-avatar {
  background: var(--color-primary-light);
}

.bubble-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bubble-content {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  line-height: 1.75;
  font-size: 15px;
  font-family: var(--font-family);
}

.role-user .bubble-content {
  background: var(--bg-message-user);
  color: var(--text-inverse);
  border-bottom-right-radius: 4px;
}

.role-assistant .bubble-content {
  background: var(--bg-message-ai);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-bottom-left-radius: 4px;
}

.bubble-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 15px;
  line-height: 1.75;
}

.bubble-time {
  font-size: 11px;
  color: var(--text-tertiary);
  padding: 0 4px;
}

.role-user .bubble-time {
  text-align: right;
}

.bubble-image img {
  max-width: 300px;
  max-height: 300px;
  border-radius: var(--radius-sm);
}

.bubble-file {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-icon {
  font-size: 28px;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-weight: 500;
}

.file-size {
  font-size: 12px;
  opacity: 0.7;
}

.bubble-table {
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
  margin-bottom: 8px;
}

.bubble-table table {
  border-collapse: collapse;
  font-size: 13px;
  width: 100%;
}

.bubble-table th,
.bubble-table td {
  border: 1px solid var(--border-color);
  padding: 6px 10px;
  text-align: left;
  white-space: nowrap;
}

.bubble-table th {
  background: var(--bg-hover);
  font-weight: 600;
}

.table-more {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
}

.bubble-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 200px;
}

.progress-bar {
  height: 6px;
  background: var(--bg-hover);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.bubble-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.action-btn {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.action-btn.primary {
  background: var(--color-primary);
  color: white;
}

.action-btn.primary:hover {
  background: var(--color-primary-hover);
}

.action-btn.secondary {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.action-btn.secondary:hover {
  background: var(--border-color);
}

.action-btn.danger {
  background: var(--color-danger);
  color: white;
}

/* OCR result card */
.bubble-ocr-result {
  min-width: 280px;
}

.ocr-card {
  background: var(--bg-content);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.ocr-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-hover);
  border-bottom: 1px solid var(--border-light);
}

.ocr-icon {
  font-size: 18px;
}

.ocr-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.ocr-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.ocr-badge.high {
  background: #dcfce7;
  color: #166534;
}

.ocr-badge.medium {
  background: #fef3c7;
  color: #92400e;
}

.ocr-badge.low {
  background: #fee2e2;
  color: #991b1b;
}

.ocr-card-body {
  padding: 12px 14px;
}

.ocr-text-preview {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.ocr-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-top: 1px solid var(--border-light);
}

.ocr-meta {
  font-size: 11px;
  color: var(--text-tertiary);
}

.ocr-retry-btn {
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  background: var(--color-primary);
  color: white;
  transition: all var(--transition-fast);
}

.ocr-retry-btn:hover {
  background: var(--color-primary-hover);
}

/* OCR error */
.bubble-ocr-error {
  min-width: 260px;
}

.ocr-error-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
}

.error-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.error-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.error-title {
  font-size: 13px;
  font-weight: 600;
  color: #991b1b;
}

.error-detail {
  font-size: 12px;
  color: #b91c1c;
  line-height: 1.5;
}

.error-hint {
  font-size: 11px;
  color: #a1a1aa;
}
</style>
