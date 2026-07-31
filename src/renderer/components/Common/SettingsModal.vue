<template>
  <Teleport to="body">
    <div class="settings-overlay" @click.self="$emit('close')">
      <div class="settings-card">
        <div class="settings-header">
          <h2>⚙️ 设置</h2>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>

        <div class="settings-body">
          <!-- Profile -->
          <div class="settings-section">
            <h3 class="section-title">个人资料</h3>
            <div class="profile-row">
              <div class="profile-avatar" @click="changeAvatar" title="点击更换头像">
                <img v-if="form.avatarUrl" :src="form.avatarUrl" class="profile-avatar-img" />
                <span v-else class="profile-avatar-text">{{ form.displayName.charAt(0) || '管' }}</span>
                <div class="profile-avatar-edit">📷</div>
              </div>
              <div class="form-group" style="flex:1">
                <label>显示名称</label>
                <input v-model="form.displayName" type="text" class="form-input" placeholder="数字员工" />
              </div>
            </div>
            <input
              ref="avatarFileInput"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              class="file-input-hidden"
              @change="onAvatarFileSelected"
            />
          </div>

          <!-- API Configuration -->
          <div class="settings-section">
            <h3 class="section-title">API 配置</h3>
            <p class="section-desc">配置大模型 API Key 以启用 Agent 功能</p>

            <div class="form-group">
              <label>API 服务商</label>
              <select v-model="form.baseUrl" class="form-input">
                <option value="https://api.deepseek.com">DeepSeek</option>
                <option value="https://api.openai.com/v1">OpenAI</option>
                <option value="">自定义</option>
              </select>
            </div>

            <div class="form-group">
              <label>API Base URL</label>
              <input
                v-model="form.baseUrl"
                type="text"
                class="form-input"
                placeholder="https://api.deepseek.com"
              />
            </div>

            <div class="form-group">
              <label>API Key</label>
              <div class="api-key-row">
                <input
                  v-model="form.apiKey"
                  :type="showKey ? 'text' : 'password'"
                  class="form-input"
                  placeholder="sk-..."
                />
                <button class="toggle-key-btn" @click="showKey = !showKey">
                  {{ showKey ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>模型</label>
              <input
                v-model="form.model"
                type="text"
                class="form-input"
                placeholder="deepseek-chat"
              />
            </div>

            <div class="form-group">
              <label>Temperature</label>
              <div class="range-row">
                <input
                  v-model.number="form.temperature"
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  class="range-input"
                />
                <span class="range-value">{{ form.temperature }}</span>
              </div>
            </div>
          </div>

          <!-- About -->
          <div class="settings-section">
            <h3 class="section-title">关于</h3>
            <div class="about-info">
              <div class="about-row">
                <span>版本</span>
                <span class="about-value">1.0.0</span>
              </div>
              <div class="about-row">
                <span>技术栈</span>
                <span class="about-value">Electron + Vue 3 + TypeScript</span>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-footer">
          <button class="btn btn-secondary" @click="$emit('close')">取消</button>
          <button class="btn btn-primary" :class="{ saved }" :disabled="saved" @click="handleSave">{{ saved ? '✓ 已保存' : '保存设置' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

const emit = defineEmits<{
  close: []
}>()

const showKey = ref(false)
const avatarFileInput = ref<HTMLInputElement>()
const saved = ref(false)

const form = reactive({
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  temperature: 0.7,
  avatarUrl: '',
  displayName: '数字员工'
})

async function loadConfig(): Promise<void> {
  if (window.electronAPI) {
    const apiKey = await window.electronAPI.configGet('apiKey') as string || ''
    const baseUrl = await window.electronAPI.configGet('baseUrl') as string || 'https://api.deepseek.com'
    const model = await window.electronAPI.configGet('model') as string || 'deepseek-chat'
    const temperature = await window.electronAPI.configGet('temperature') as number || 0.7
    const avatarUrl = await window.electronAPI.configGet('avatarUrl') as string || ''
    const displayName = await window.electronAPI.configGet('displayName') as string || '数字员工'
    form.apiKey = apiKey
    form.baseUrl = baseUrl
    form.model = model
    form.temperature = temperature
    form.avatarUrl = avatarUrl
    form.displayName = displayName
  }
}

function changeAvatar(): void {
  avatarFileInput.value?.click()
}

function onAvatarFileSelected(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    form.avatarUrl = reader.result as string
  }
  reader.readAsDataURL(file)
  input.value = ''
}

async function handleSave(): Promise<void> {
  if (window.electronAPI) {
    await window.electronAPI.configSet('apiKey', form.apiKey)
    await window.electronAPI.configSet('baseUrl', form.baseUrl)
    await window.electronAPI.configSet('model', form.model)
    await window.electronAPI.configSet('temperature', form.temperature)
    await window.electronAPI.configSet('avatarUrl', form.avatarUrl)
    await window.electronAPI.configSet('displayName', form.displayName)
  }
  saved.value = true
  setTimeout(() => {
    emit('close')
  }, 600)
}

onMounted(loadConfig)
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.settings-card {
  background: var(--bg-content);
  border-radius: 18px;
  width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.settings-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: transparent;
  font-size: 22px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--bg-hover);
}

.settings-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: -8px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-input {
  padding: 9px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-input);
  transition: border-color var(--transition-fast);
}

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

select.form-input {
  cursor: pointer;
}

.api-key-row {
  display: flex;
  gap: 8px;
}

.api-key-row .form-input {
  flex: 1;
}

.toggle-key-btn {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-hover);
  font-size: 16px;
  flex-shrink: 0;
}

.toggle-key-btn:hover {
  background: var(--border-color);
}

.range-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-input {
  flex: 1;
  height: 4px;
  accent-color: var(--color-primary);
}

.range-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  min-width: 28px;
  text-align: center;
}

.about-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--bg-hover);
  border-radius: 10px;
}

.about-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}

.about-value {
  color: var(--text-primary);
  font-weight: 500;
}

.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.btn {
  padding: 9px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-primary.saved {
  background: var(--color-success);
  pointer-events: none;
}

.btn-secondary {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--border-color);
}

/* Profile section */
.profile-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
  flex-shrink: 0;
  position: relative;
  cursor: pointer;
  overflow: hidden;
}

.profile-avatar:hover .profile-avatar-edit {
  opacity: 1;
}

.profile-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.profile-avatar-text {
  pointer-events: none;
}

.profile-avatar-edit {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.file-input-hidden {
  display: none;
}
</style>
