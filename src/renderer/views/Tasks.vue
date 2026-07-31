<template>
  <div class="tasks-page">
    <!-- Toolbar -->
    <div class="tasks-toolbar">
      <div class="toolbar-left">
        <button class="nav-btn" @click="taskStore.prevMonth()">
          <span>◀</span>
        </button>
        <h2 class="current-month">{{ monthLabel }}</h2>
        <button class="nav-btn" @click="taskStore.nextMonth()">
          <span>▶</span>
        </button>
        <button class="today-btn" @click="goToToday">今天</button>
      </div>

      <div class="toolbar-center">
        <div class="view-toggle">
          <button
            class="toggle-btn"
            :class="{ active: taskStore.viewMode === 'month' }"
            @click="taskStore.viewMode = 'month'"
          >
            月视图
          </button>
          <button
            class="toggle-btn"
            :class="{ active: taskStore.viewMode === 'week' }"
            @click="taskStore.viewMode = 'week'"
          >
            周视图
          </button>
        </div>
      </div>

      <div class="toolbar-right">
        <button class="add-task-btn" @click="openTaskEditor()">
          <span>+</span> 新建任务
        </button>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="calendar-container">
      <!-- Week day headers -->
      <div class="calendar-header">
        <div v-for="day in weekDays" :key="day" class="header-cell">
          {{ day }}
        </div>
      </div>

      <!-- Month view -->
      <div v-if="taskStore.viewMode === 'month'" class="calendar-grid month-grid">
        <div
          v-for="(day, index) in monthDays"
          :key="index"
          class="day-cell"
          :class="{
            'other-month': !day.isCurrentMonth,
            'is-today': day.isToday,
            'is-selected': taskStore.selectedDate === day.dateStr
          }"
          @click="taskStore.selectedDate = day.dateStr"
        >
          <div class="day-header">
            <span class="day-number">{{ day.day }}</span>
            <span v-if="day.isToday" class="today-badge">今天</span>
          </div>
          <div class="day-tasks">
            <div
              v-for="task in taskStore.getTasksForDate(day.dateStr).slice(0, 3)"
              :key="task.id"
              class="task-card"
              :class="[`priority-${task.priority}`, `status-${task.status}`]"
              @click.stop="openTaskEditor(task)"
            >
              <span class="task-dot"></span>
              <span class="task-title">{{ task.title }}</span>
            </div>
            <div
              v-if="taskStore.getTasksForDate(day.dateStr).length > 3"
              class="more-tasks"
            >
              +{{ taskStore.getTasksForDate(day.dateStr).length - 3 }} 更多
            </div>
          </div>
        </div>
      </div>

      <!-- Week view -->
      <div v-else class="calendar-grid week-grid">
        <div
          v-for="(day, index) in weekDays_data"
          :key="index"
          class="week-day-cell"
          :class="{
            'is-today': day.isToday,
            'is-selected': taskStore.selectedDate === day.dateStr
          }"
          @click="taskStore.selectedDate = day.dateStr"
        >
          <div class="day-header">
            <span class="day-name">{{ day.dayName }}</span>
            <span class="day-number" :class="{ 'today-circle': day.isToday }">{{ day.day }}</span>
          </div>
          <div class="day-tasks">
            <div
              v-for="task in taskStore.getTasksForDate(day.dateStr)"
              :key="task.id"
              class="task-card"
              :class="[`priority-${task.priority}`, `status-${task.status}`]"
              @click.stop="openTaskEditor(task)"
            >
              <div class="task-header">
                <span class="task-dot"></span>
                <span class="task-time" v-if="task.startTime">{{ task.startTime }}</span>
              </div>
              <span class="task-title">{{ task.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Editor Modal -->
    <Teleport to="body">
      <div v-if="showEditor" class="modal-overlay" @click.self="closeEditor">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ editingTask ? '编辑任务' : '新建任务' }}</h3>
            <button class="modal-close" @click="closeEditor">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>任务标题</label>
              <input
                v-model="form.title"
                type="text"
                class="form-input"
                placeholder="输入任务标题..."
              />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>日期</label>
                <input v-model="form.date" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label>开始时间</label>
                <input v-model="form.startTime" type="time" class="form-input" />
              </div>
              <div class="form-group">
                <label>结束时间</label>
                <input v-model="form.endTime" type="time" class="form-input" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>优先级</label>
                <select v-model="form.priority" class="form-input">
                  <option value="low">🟢 低</option>
                  <option value="medium">🟡 中</option>
                  <option value="high">🔴 高</option>
                </select>
              </div>
              <div class="form-group">
                <label>状态</label>
                <select v-model="form.status" class="form-input">
                  <option value="todo">未开始</option>
                  <option value="doing">进行中</option>
                  <option value="done">已完成</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>备注</label>
              <textarea
                v-model="form.description"
                class="form-input form-textarea"
                placeholder="添加备注..."
                rows="3"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button v-if="editingTask" class="btn btn-danger" @click="handleDelete">删除</button>
            <div class="footer-right">
              <button class="btn btn-secondary" @click="closeEditor">取消</button>
              <button class="btn btn-primary" @click="handleSave">
                {{ editingTask ? '保存' : '创建' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useTaskStore, type Task } from '@/stores/task'

const taskStore = useTaskStore()

// Form state
const showEditor = ref(false)
const editingTask = ref<Task | null>(null)
const form = reactive({
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  priority: 'medium' as 'low' | 'medium' | 'high',
  status: 'todo' as 'todo' | 'doing' | 'done',
  description: ''
})

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

const monthLabel = computed(() => {
  const d = taskStore.currentMonth
  return `${d.getFullYear()}年 ${d.getMonth() + 1}月`
})

interface DayCell {
  dateStr: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
}

const monthDays = computed<DayCell[]>(() => {
  const year = taskStore.currentMonth.getFullYear()
  const month = taskStore.currentMonth.getMonth()
  const today = new Date()
  const todayStr = formatDateStr(today)

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Start from Monday of the first week
  const startDay = new Date(firstDay)
  const dayOfWeek = startDay.getDay()
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startDay.setDate(startDay.getDate() - offset)

  const days: DayCell[] = []
  const current = new Date(startDay)

  for (let i = 0; i < 42; i++) {
    days.push({
      dateStr: formatDateStr(current),
      day: current.getDate(),
      isCurrentMonth: current.getMonth() === month,
      isToday: formatDateStr(current) === todayStr
    })
    current.setDate(current.getDate() + 1)
  }

  return days
})

const weekDays_data = computed<DayCell & { dayName: string }[]>(() => {
  const today = new Date()
  const todayStr = formatDateStr(today)
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const monday = new Date(today)
  monday.setDate(today.getDate() - mondayOffset)

  const weekDayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  const days: (DayCell & { dayName: string })[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push({
      dateStr: formatDateStr(d),
      day: d.getDate(),
      isCurrentMonth: true,
      isToday: formatDateStr(d) === todayStr,
      dayName: weekDayNames[i]
    })
  }

  return days
})

function formatDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function goToToday(): void {
  taskStore.currentMonth = new Date()
  taskStore.selectedDate = formatDateStr(new Date())
}

function openTaskEditor(task?: Task): void {
  if (task) {
    editingTask.value = task
    form.title = task.title
    form.date = task.date
    form.startTime = task.startTime || ''
    form.endTime = task.endTime || ''
    form.priority = task.priority
    form.status = task.status
    form.description = task.description || ''
  } else {
    editingTask.value = null
    form.title = ''
    form.date = taskStore.selectedDate || formatDateStr(new Date())
    form.startTime = ''
    form.endTime = ''
    form.priority = 'medium'
    form.status = 'todo'
    form.description = ''
  }
  showEditor.value = true
}

function closeEditor(): void {
  showEditor.value = false
  editingTask.value = null
}

async function handleSave(): Promise<void> {
  if (!form.title.trim()) return

  if (editingTask.value) {
    await taskStore.updateTask(editingTask.value.id, {
      title: form.title,
      date: form.date,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      priority: form.priority,
      status: form.status,
      description: form.description
    })
  } else {
    await taskStore.addTask({
      title: form.title,
      date: form.date,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      priority: form.priority,
      status: form.status,
      description: form.description
    })
  }
  closeEditor()
}

async function handleDelete(): Promise<void> {
  if (editingTask.value) {
    await taskStore.deleteTask(editingTask.value.id)
    closeEditor()
  }
}

onMounted(() => {
  taskStore.loadTasks()
})
</script>

<style scoped>
.tasks-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-main);
}

/* Toolbar */
.tasks-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--bg-content);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.nav-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.current-month {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 120px;
  text-align: center;
}

.today-btn {
  padding: 5px 14px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 500;
}

.today-btn:hover {
  background: var(--color-primary);
  color: white;
}

.view-toggle {
  display: flex;
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  padding: 2px;
}

.toggle-btn {
  padding: 6px 14px;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  transition: all var(--transition-fast);
}

.toggle-btn.active {
  background: var(--bg-content);
  color: var(--text-primary);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
}

.add-task-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 16px;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: white;
  font-size: 13px;
  font-weight: 500;
}

.add-task-btn:hover {
  background: var(--color-primary-hover);
}

/* Calendar */
.calendar-container {
  flex: 1;
  overflow: auto;
  padding: 0;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: var(--bg-content);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 1;
}

.header-cell {
  padding: 10px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
}

/* Month grid */
.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(100px, 1fr);
}

.day-cell {
  border-right: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
  padding: 6px;
  cursor: pointer;
  transition: background var(--transition-fast);
  min-height: 100px;
}

.day-cell:hover {
  background: var(--bg-hover);
}

.day-cell.other-month {
  opacity: 0.4;
}

.day-cell.is-today {
  background: var(--color-primary-bg);
}

.day-cell.is-selected {
  box-shadow: inset 0 0 0 2px var(--color-primary);
  border-radius: 2px;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.day-number {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.today-badge {
  font-size: 10px;
  color: var(--color-primary);
  font-weight: 600;
}

.day-tasks {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-card {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  overflow: hidden;
}

.task-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.priority-high .task-dot { background: var(--priority-high); }
.priority-medium .task-dot { background: var(--priority-medium); }
.priority-low .task-dot { background: var(--priority-low); }

.status-done .task-title {
  text-decoration: line-through;
  opacity: 0.5;
}

.status-doing .task-card {
  background: #dbeafe;
}

.task-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.more-tasks {
  font-size: 10px;
  color: var(--text-tertiary);
  padding: 2px 6px;
  cursor: pointer;
}

/* Week grid */
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  height: calc(100% - 37px);
}

.week-day-cell {
  border-right: 1px solid var(--border-light);
  padding: 10px;
  cursor: pointer;
  transition: background var(--transition-fast);
  overflow-y: auto;
}

.week-day-cell:hover {
  background: var(--bg-hover);
}

.week-day-cell.is-today {
  background: var(--color-primary-bg);
}

.week-day-cell.is-selected {
  box-shadow: inset 0 0 0 2px var(--color-primary);
}

.week-day-cell .day-header {
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-bottom: 10px;
}

.day-name {
  font-size: 11px;
  color: var(--text-tertiary);
}

.today-circle {
  background: var(--color-primary);
  color: white !important;
}

.week-day-cell .task-card {
  flex-direction: column;
  align-items: flex-start;
  padding: 8px;
  margin-bottom: 4px;
  background: var(--bg-content);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
}

.task-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-time {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-content);
  border-radius: var(--radius-lg);
  width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
}

.modal-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: transparent;
  font-size: 20px;
  color: var(--text-secondary);
}

.modal-close:hover {
  background: var(--bg-hover);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-content);
  transition: border-color var(--transition-fast);
}

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.footer-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.btn {
  padding: 8px 18px;
  border-radius: var(--radius-sm);
  font-size: 13px;
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

.btn-secondary {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--border-color);
}

.btn-danger {
  background: transparent;
  color: var(--color-danger);
}

.btn-danger:hover {
  background: #fef2f2;
}
</style>
