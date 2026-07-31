<template>
  <header class="header" @dblclick="handleMaximize">
    <div class="header-left drag-region">
      <h1 class="header-title">{{ pageTitle }}</h1>
    </div>

    <div class="header-center">
      <span class="header-clock">{{ currentTime }}</span>
    </div>

    <div class="header-right no-drag">
      <!-- Avatar + Popover -->
      <div class="user-menu" ref="menuRef">
        <button class="avatar-btn" @click="togglePopover">
          <img v-if="avatarUrl" :src="avatarUrl" class="avatar-img" />
          <span v-else class="avatar-text">{{ avatarInitial }}</span>
        </button>

        <Teleport to="body">
          <div v-if="showPopover" class="popover-overlay" @click="closePopover">
            <div class="popover-card" :style="popoverStyle" @click.stop>
              <div class="popover-user">
                <div class="popover-avatar" @click="changeAvatar" title="点击更换头像">
                  <img v-if="avatarUrl" :src="avatarUrl" class="popover-avatar-img" />
                  <span v-else>{{ avatarInitial }}</span>
                  <div class="avatar-edit-badge">📷</div>
                </div>
                <div class="popover-info">
                  <span class="popover-name">{{ displayName }}</span>
                  <span class="popover-role">管理员</span>
                </div>
              </div>

              <div class="popover-divider"></div>

              <div class="popover-menu">
                <button class="popover-item" @click="changeAvatar">
                  <span class="item-icon">🖼️</span>
                  <span>更换头像</span>
                </button>
                <button class="popover-item" @click="openSettings">
                  <span class="item-icon">⚙️</span>
                  <span>设置</span>
                </button>
                <button class="popover-item" @click="handleLogout">
                  <span class="item-icon">🚪</span>
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          </div>
        </Teleport>
      </div>

      <!-- Window Controls -->
      <div class="window-controls">
        <button class="win-btn win-minimize" @click="handleMinimize" title="最小化">
          <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5" width="12" height="1.5" rx="0.75" fill="currentColor"/></svg>
        </button>
        <button class="win-btn win-maximize" @click="handleMaximize" title="最大化">
          <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
          <svg v-else width="12" height="12" viewBox="0 0 12 12"><rect x="3" y="0" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="1" y="4" width="8" height="8" rx="1.5" fill="var(--bg-header)" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
        <button class="win-btn win-close" @click="handleClose" title="关闭">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>

    <!-- Hidden file input for avatar -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
      class="file-input-hidden"
      @change="onFileSelected"
    />
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const openSettings = inject<() => void>('openSettings', () => {})

const showPopover = ref(false)
const isMaximized = ref(false)
const currentTime = ref('')
let clockTimer: ReturnType<typeof setInterval> | null = null
const menuRef = ref<HTMLElement>()
const fileInputRef = ref<HTMLInputElement>()
const popoverStyle = ref({ top: '0px', right: '0px' })
const avatarUrl = ref<string>('')
const displayName = ref('数字员工')

const pageTitle = computed(() => {
  const meta = route.meta as { title?: string }
  return meta?.title || '数字员工助手'
})

const avatarInitial = computed(() => displayName.value.charAt(0))

function updatePopoverPosition(): void {
  if (menuRef.value) {
    const rect = menuRef.value.getBoundingClientRect()
    popoverStyle.value = {
      top: `${rect.bottom + 8}px`,
      right: `${window.innerWidth - rect.right}px`
    }
  }
}

function togglePopover(): void {
  showPopover.value = !showPopover.value
  if (showPopover.value) updatePopoverPosition()
}

function closePopover(): void {
  showPopover.value = false
}

function changeAvatar(): void {
  fileInputRef.value?.click()
}

function onFileSelected(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = reader.result as string
    avatarUrl.value = dataUrl
    saveAvatar(dataUrl)
  }
  reader.readAsDataURL(file)
  input.value = ''
}

async function saveAvatar(dataUrl: string): Promise<void> {
  if (window.electronAPI) {
    await window.electronAPI.configSet('avatarUrl', dataUrl)
  }
}

async function loadAvatar(): Promise<void> {
  if (window.electronAPI) {
    const saved = await window.electronAPI.configGet('avatarUrl') as string
    if (saved) avatarUrl.value = saved
    const name = await window.electronAPI.configGet('displayName') as string
    if (name) displayName.value = name
  }
}

function handleLogout(): void {
  showPopover.value = false
}

function handleMinimize(): void {
  if (window.electronAPI) window.electronAPI.windowMinimize()
}

function handleMaximize(): void {
  if (window.electronAPI) window.electronAPI.windowMaximize()
}

function handleClose(): void {
  if (window.electronAPI) window.electronAPI.windowClose()
}

function updateClock(): void {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  loadAvatar()
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
  if (window.electronAPI) {
    window.electronAPI.windowIsMaximized().then(max => isMaximized.value = max)
    window.electronAPI.onWindowMaximizeChange((max) => isMaximized.value = max)
  }
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<style scoped>
.header {
  height: var(--header-height);
  background: var(--bg-header);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  border-radius: 18px 18px 0 0;
  position: relative;
}

.header-left {
  flex: 1;
  display: flex;
  align-items: center;
  height: 100%;
}

.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.header-clock {
  font-size: 16px;
  font-weight: 700;
  color: #4f6ef7;
  font-variant-numeric: tabular-nums;
  letter-spacing: 2px;
  user-select: none;
}

.drag-region {
  -webkit-app-region: drag;
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Avatar button in header */
.user-menu {
  position: relative;
}

.avatar-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  transition: all var(--transition-fast);
  overflow: hidden;
  padding: 0;
}

.avatar-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 2px 8px rgba(79, 110, 247, 0.3);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Popover */
.popover-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: transparent;
}

.popover-card {
  position: fixed;
  background: var(--bg-content);
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14), 0 2px 8px rgba(0, 0, 0, 0.06);
  width: 260px;
  padding: 8px;
  z-index: 2001;
  border: 1px solid var(--border-light);
}

.popover-user {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 12px;
}

.popover-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
  position: relative;
  cursor: pointer;
  overflow: hidden;
}

.popover-avatar:hover .avatar-edit-badge {
  opacity: 1;
}

.popover-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-edit-badge {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.popover-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.popover-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.popover-role {
  font-size: 12px;
  color: var(--text-tertiary);
}

.popover-divider {
  height: 1px;
  background: var(--border-light);
  margin: 6px 0;
}

.popover-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.popover-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  transition: all var(--transition-fast);
  width: 100%;
  text-align: left;
}

.popover-item:hover {
  background: var(--bg-hover);
}

.item-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
}

/* File input hidden */
.file-input-hidden {
  display: none;
}

/* Window Controls */
.window-controls {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.win-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  background: transparent;
  transition: all var(--transition-fast);
}

.win-btn:hover {
  background: var(--bg-hover);
}

.win-close:hover {
  background: #ef4444;
  color: white;
}
</style>
