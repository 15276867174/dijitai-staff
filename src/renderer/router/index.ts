import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/workbench'
    },
    {
      path: '/workbench',
      name: 'Workbench',
      component: () => import('@/views/Workbench.vue'),
      meta: { title: '工作台', icon: '💬' }
    },
    {
      path: '/tasks',
      name: 'Tasks',
      component: () => import('@/views/Tasks.vue'),
      meta: { title: '任务', icon: '📋' }
    },
    {
      path: '/wps',
      name: 'WPS',
      component: () => import('@/views/WPS.vue'),
      meta: { title: 'WPS', icon: '📁' }
    }
  ]
})

export default router
