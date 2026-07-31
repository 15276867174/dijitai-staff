import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Task {
  id: string
  title: string
  date: string
  startTime?: string
  endTime?: string
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'doing' | 'done'
  description?: string
  createdAt: string
  updatedAt: string
}

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const currentMonth = ref(new Date())
  const viewMode = ref<'month' | 'week'>('month')
  const selectedDate = ref<string>('')

  const tasksByDate = computed(() => {
    const map: Record<string, Task[]> = {}
    for (const task of tasks.value) {
      if (!map[task.date]) {
        map[task.date] = []
      }
      map[task.date].push(task)
    }
    return map
  })

  function getTasksForDate(date: string): Task[] {
    return tasksByDate.value[date] || []
  }

  async function loadTasks(): Promise<void> {
    if (window.electronAPI) {
      const result = await window.electronAPI.taskList()
      tasks.value = result as Task[]
    }
  }

  async function addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (window.electronAPI) {
      const created = await window.electronAPI.taskCreate(task as unknown as Record<string, unknown>)
      tasks.value.push(created as Task)
    } else {
      const newTask: Task = {
        ...task,
        id: `task_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      tasks.value.push(newTask)
    }
  }

  async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.taskUpdate(id, updates as Record<string, unknown>)
    }
    const index = tasks.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...updates, updatedAt: new Date().toISOString() }
    }
  }

  async function deleteTask(id: string): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.taskDelete(id)
    }
    tasks.value = tasks.value.filter((t) => t.id !== id)
  }

  function prevMonth(): void {
    const d = new Date(currentMonth.value)
    d.setMonth(d.getMonth() - 1)
    currentMonth.value = d
  }

  function nextMonth(): void {
    const d = new Date(currentMonth.value)
    d.setMonth(d.getMonth() + 1)
    currentMonth.value = d
  }

  return {
    tasks,
    currentMonth,
    viewMode,
    selectedDate,
    tasksByDate,
    getTasksForDate,
    loadTasks,
    addTask,
    updateTask,
    deleteTask,
    prevMonth,
    nextMonth
  }
})
