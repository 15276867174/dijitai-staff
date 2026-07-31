# 🤖 数字员工助手 (Digital Employee Assistant)

> 一款基于 Electron + Vue 3 构建的本地桌面 AI 助手系统，集成智能 Agent、OCR 识别、Excel/WPS 处理、任务管理等多功能于一体，打造属于你自己的"数字员工"。

[![Electron](https://img.shields.io/badge/Electron-28.0+-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Vue](https://img.shields.io/badge/Vue-3.4+-4FC08D?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## 📖 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [技术架构](#技术架构)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [功能模块详解](#功能模块详解)
- [开发指南](#开发指南)
- [常见问题](#常见问题)
- [后续规划](#后续规划)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 🎯 项目简介

**数字员工助手** 是一款面向个人和企业的本地桌面生产力工具。它通过 AI Agent 驱动，让你可以用自然语言完成：

- 📊 **智能文件处理**：读取、分析、修改 Excel/Word 文档
- 🖼️ **OCR 文字识别**：从图片中提取文字，支持征信报告等复杂文档
- 🔍 **联网搜索**：Agent 自动判断是否需要联网获取实时信息
- 📅 **任务管理**：日历式任务规划与追踪
- 💬 **智能对话**：基于大模型的多轮上下文对话

**核心理念**：让 AI 像真实的"数字员工"一样，理解你的需求并执行任务。

---

## ✨ 核心功能

### 🖥️ 工作台（Workbench）

类似 DeepSeek 的聊天交互界面，是数字员工的核心入口。

| 功能 | 描述 |
|------|------|
| **智能对话** | 支持多轮上下文对话，流式输出 |
| **图片识别** | 上传图片自动 OCR 识别文字内容 |
| **联网搜索** | Agent 自动判断并执行联网搜索 |
| **文件处理** | 上传 Excel/Word，Agent 自动分析处理 |
| **快捷指令** | 预设常用 Prompt 模板，一键调用 |

### 📋 任务管理（Tasks）

日历式任务规划与追踪，助你高效管理日常工作。

| 功能 | 描述 |
|------|------|
| **月/周视图** | 灵活切换日历展示方式 |
| **任务 CRUD** | 增删改查，支持优先级与状态 |
| **拖拽移动** | 拖拽任务到不同日期 |
| **本地持久化** | SQLite 本地存储，数据安全可控 |

### 📁 文件管理（WPS）

AI + Agent 驱动的智能文档处理中心。

| 功能 | 描述 |
|------|------|
| **Word 预览** | 在线预览 Word 文档内容 |
| **Excel 预览/编辑** | 表格渲染，支持单元格编辑 |
| **AI 修改文档** | 通过自然语言指令修改文档内容 |
| **AI 生成报表** | 描述需求，Agent 自动生成 Excel |
| **修改追踪** | 高亮显示 AI 修改过的单元格 |

### 🎮 摸鱼神器（隐藏功能）

工作累了？来点小乐趣！

| 功能 | 描述 |
|------|------|
| **老板键** | 全局快捷键一键隐藏窗口（Ctrl+Shift+H） |
| **下班倒计时** | 实时显示距离下班时间 |
| **敲木鱼** | 敲击动画 + 功德计数 |
| **成就系统** | 解锁摸鱼称号，从"摸鱼新手"到"摸鱼至尊" |

---

## 🏗️ 技术架构

### 技术栈选型

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| **桌面框架** | Electron 28+ | 跨平台桌面应用底座 |
| **前端框架** | Vue 3 + Vite | 响应式 UI，组合式 API |
| **状态管理** | Pinia | 全局状态管理 |
| **路由** | Vue Router 4 | 多页面导航 |
| **IPC 通信** | Electron IPC | 主进程与渲染进程通信 |
| **AI 引擎** | Claude Agent SDK / DeepSeek API | Agent 推理与工具调用 |
| **图像处理** | Sharp + Tesseract.js | 图片预处理与 OCR 识别 |
| **Excel 处理** | xlsx / exceljs | 读写 / 解析 Excel 文件 |
| **本地存储** | SQLite / lowdb | 数据持久化 |
| **UI 样式** | 纯 CSS + 自定义组件 | 完全可控的视觉风格 |

📞 联系方式
作者: [努尔顿]

邮箱: 3274227844@qq.com



⭐ 如果这个项目对你有帮助，请给一个 Star！
