<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main">
      <Header />
      <div class="app-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </div>

    <!-- Settings Modal -->
    <SettingsModal v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from '@/components/Layout/Sidebar.vue'
import Header from '@/components/Layout/Header.vue'
import SettingsModal from '@/components/Common/SettingsModal.vue'
import { provide } from 'vue'

const showSettings = ref(false)

provide('openSettings', () => {
  showSettings.value = true
})
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg-main);
  padding: 8px;
  gap: 8px;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border-radius: 18px;
  background: var(--bg-content);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}

.app-content {
  flex: 1;
  overflow: hidden;
  background: var(--bg-main);
  border-radius: 0 0 18px 18px;
}
</style>
