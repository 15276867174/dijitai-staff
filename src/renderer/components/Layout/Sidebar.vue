<template>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="brand-icon">
        <img :src="gztIcon" alt="" class="brand-icon-img" />
      </div>
      <div class="brand-text">
        <span class="brand-name">数字员工</span>
        <span class="brand-subtitle">Digital Assistant</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
      >
        <span class="nav-icon">
          <img :src="item.icon" alt="" class="nav-icon-img" />
        </span>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <div class="footer-info">
        <span class="version">v1.0.0</span>
        <span class="status-dot"></span>
        <span class="status-text">本地运行</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

import gztIcon from '@/assets/icons/gzt.png'
import rwglIcon from '@/assets/icons/rwgl.png'
import wpsIcon from '@/assets/icons/WPS.png'

const navItems = [
  { path: '/workbench', label: '工作台', icon: gztIcon },
  { path: '/tasks', label: '任务管理', icon: rwglIcon },
  { path: '/wps', label: 'WPS 文件', icon: wpsIcon }
]

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  height: 100%;
  background: var(--bg-sidebar);
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  user-select: none;
}

.sidebar-brand {
  padding: 20px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border-light);
}

.brand-icon {
  width: 38px;
  height: 38px;
  background: var(--color-primary-bg);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-icon-img {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

.brand-subtitle {
  font-size: 11px;
  color: var(--text-tertiary);
}

.sidebar-nav {
  flex: 1;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 18px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
}

.nav-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(79, 110, 247, 0.2);
}

.nav-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-icon-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  display: block;
}

.nav-label {
  white-space: nowrap;
}

.sidebar-footer {
  padding: 14px 18px;
  border-top: 1px solid var(--border-light);
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
}

.status-text {
  color: var(--text-secondary);
}
</style>
