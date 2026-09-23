<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";

type Status = "starting" | "qr" | "ready" | "disconnected";

interface Contact {
  phone: string;
  lastMessageAt: string;
}

interface HistoryEntry {
  timestamp: string;
  message: string;
}

const status = ref<Status>("starting");
const qr = ref<string | null>(null);

const contacts = ref<Contact[]>([]);
const activePhone = ref<string | null>(null);
const history = ref<HistoryEntry[]>([]);

const newContactPhone = ref("");
const messageText = ref("");
const sending = ref(false);
const feedback = ref<{ type: "success" | "error"; text: string } | null>(null);

const messagesEl = ref<HTMLElement | null>(null);

let statusTimer: ReturnType<typeof setInterval> | undefined;
let contactsTimer: ReturnType<typeof setInterval> | undefined;
let historyTimer: ReturnType<typeof setInterval> | undefined;

const avatarPalette = ["#128c7e", "#e17055", "#6c5ce7", "#0984e3", "#e84393", "#00b894", "#fdcb6e", "#d63031"];

function avatarColor(phone: string) {
  let hash = 0;
  for (const ch of phone) hash = (hash * 31 + ch.charCodeAt(0)) % avatarPalette.length;
  return avatarPalette[hash];
}

const displayContacts = computed(() => {
  if (activePhone.value && !contacts.value.some((c) => c.phone === activePhone.value)) {
    return [{ phone: activePhone.value, lastMessageAt: new Date().toISOString() }, ...contacts.value];
  }
  return contacts.value;
});

async function fetchStatus() {
  const res = await fetch("/api/status");
  const data = await res.json();
  status.value = data.status;
  qr.value = data.qr;
}

async function fetchContacts() {
  const res = await fetch("/api/contacts");
  if (res.ok) contacts.value = await res.json();
}

async function fetchHistory(phone: string) {
  const res = await fetch(`/api/history/${encodeURIComponent(phone)}`);
  history.value = res.ok ? await res.json() : [];
  await scrollToBottom();
}

async function scrollToBottom() {
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
}

function selectContact(phone: string) {
  activePhone.value = phone;
  feedback.value = null;
  fetchHistory(phone);
}

function startNewChat() {
  const phone = newContactPhone.value.replace(/\D/g, "");
  if (!phone) return;
  newContactPhone.value = "";
  selectContact(phone);
}

async function sendMessage() {
  if (!activePhone.value || !messageText.value.trim()) return;

  feedback.value = null;
  sending.value = true;
  const phone = activePhone.value;
  const message = messageText.value;

  try {
    const res = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal mengirim pesan.");

    messageText.value = "";
    await fetchHistory(phone);
    await fetchContacts();
  } catch (err) {
    feedback.value = { type: "error", text: err instanceof Error ? err.message : "Terjadi kesalahan." };
  } finally {
    sending.value = false;
  }
}

function formatTime(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  const today = new Date();
  const isSameDay = date.toDateString() === today.toDateString();
  if (isSameDay) return "Hari ini";

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";

  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function formatContactTime(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

const groupedHistory = computed(() => {
  const groups: { label: string; items: HistoryEntry[] }[] = [];
  for (const entry of history.value) {
    const label = formatDayLabel(entry.timestamp);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(entry);
    } else {
      groups.push({ label, items: [entry] });
    }
  }
  return groups;
});

watch(status, (value) => {
  if (value === "ready") {
    fetchContacts();
  }
});

onMounted(() => {
  fetchStatus();
  statusTimer = setInterval(fetchStatus, 3000);
  contactsTimer = setInterval(() => {
    if (status.value === "ready") fetchContacts();
  }, 5000);
  historyTimer = setInterval(() => {
    if (status.value === "ready" && activePhone.value) fetchHistory(activePhone.value);
  }, 5000);
});

onUnmounted(() => {
  if (statusTimer) clearInterval(statusTimer);
  if (contactsTimer) clearInterval(contactsTimer);
  if (historyTimer) clearInterval(historyTimer);
});
</script>

<template>
  <div v-if="status !== 'ready'" class="gate">
    <div class="gate-card">
      <div class="gate-logo">
        <svg viewBox="0 0 32 32" width="40" height="40" fill="white">
          <path
            d="M16 3C9.4 3 4 8.4 4 15c0 2.2.6 4.3 1.7 6.2L4 29l8-1.7c1.8.9 3.8 1.4 6 1.4 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.8c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-4.7 1 1-4.6-.2-.4C5.5 17.6 5 16.3 5 15c0-6.1 4.9-11 11-11s11 4.9 11 11-4.9 10.8-11 10.8zm6-8.3c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1.1-1 1.3-.2.2-.4.3-.7.1-.3-.2-1.4-.5-2.7-1.6-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2.1 3.2 5 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.5 0-.2-.3-.3-.6-.5z"
          />
        </svg>
      </div>
      <h1>WA Send</h1>

      <div v-if="status === 'starting'" class="gate-loading">
        <span class="spinner"></span>
        <p>Menyiapkan koneksi WhatsApp...</p>
      </div>

      <div v-else-if="status === 'qr' && qr">
        <p>Scan QR code ini dengan WhatsApp di HP Anda:</p>
        <img :src="qr" alt="QR Code" class="qr" />
      </div>

      <div v-else-if="status === 'disconnected'" class="gate-loading">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="#d32f2f">
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        <p>Koneksi terputus. Silakan restart backend.</p>
      </div>
    </div>
  </div>

  <div v-else class="app">
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="brand">
          <svg viewBox="0 0 32 32" width="22" height="22" fill="white">
            <path
              d="M16 3C9.4 3 4 8.4 4 15c0 2.2.6 4.3 1.7 6.2L4 29l8-1.7c1.8.9 3.8 1.4 6 1.4 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.8c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-4.7 1 1-4.6-.2-.4C5.5 17.6 5 16.3 5 15c0-6.1 4.9-11 11-11s11 4.9 11 11-4.9 10.8-11 10.8zm6-8.3c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1.1-1 1.3-.2.2-.4.3-.7.1-.3-.2-1.4-.5-2.7-1.6-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2.1 3.2 5 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.5 0-.2-.3-.3-.6-.5z"
            />
          </svg>
          WA Send
        </span>
        <span class="online-dot" title="Terhubung"></span>
      </div>

      <div class="new-chat">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#667781" class="search-icon">
          <path d="M21 21l-4.35-4.35m1.35-5.15a7 7 0 11-14 0 7 7 0 0114 0z" stroke="#667781" stroke-width="2" fill="none" />
        </svg>
        <input
          v-model="newContactPhone"
          type="text"
          placeholder="Nomor baru, mis. 6281234567890"
          @keyup.enter="startNewChat"
        />
        <button @click="startNewChat">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
            <path d="M12 4v16m8-8H4" stroke="white" stroke-width="2.5" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <ul class="contact-list">
        <li
          v-for="c in displayContacts"
          :key="c.phone"
          :class="{ active: c.phone === activePhone }"
          @click="selectContact(c.phone)"
        >
          <div class="avatar" :style="{ background: avatarColor(c.phone) }">{{ c.phone.slice(-2) }}</div>
          <div class="contact-meta">
            <span class="contact-phone">{{ c.phone }}</span>
          </div>
          <span class="contact-time">{{ formatContactTime(c.lastMessageAt) }}</span>
        </li>
        <li v-if="displayContacts.length === 0" class="empty">Belum ada percakapan.</li>
      </ul>
    </aside>

    <main class="chat">
      <template v-if="activePhone">
        <div class="chat-header">
          <div class="avatar" :style="{ background: avatarColor(activePhone) }">{{ activePhone.slice(-2) }}</div>
          <span class="contact-phone">{{ activePhone }}</span>
        </div>

        <div class="messages" ref="messagesEl">
          <div v-for="group in groupedHistory" :key="group.label" class="day-group">
            <div class="day-label"><span>{{ group.label }}</span></div>
            <div v-for="(entry, i) in group.items" :key="i" class="bubble-row">
              <div class="bubble">
                <span class="bubble-text">{{ entry.message }}</span>
                <span class="bubble-time">
                  {{ formatTime(entry.timestamp) }}
                  <svg viewBox="0 0 16 15" width="14" height="14" class="check-icon">
                    <path
                      d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.879a.32.32 0 01-.484.033l-.358-.325a.319.319 0 00-.484.032l-.378.483a.418.418 0 00.036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 00-.064-.512zm-4.1 0l-.478-.372a.365.365 0 00-.51.063L4.566 9.879a.32.32 0 01-.484.033L1.891 7.769a.366.366 0 00-.515.006l-.423.433a.364.364 0 00.006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 00-.063-.51z"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </div>
          <p v-if="history.length === 0" class="empty">Belum ada pesan dengan nomor ini.</p>
        </div>

        <transition name="fade">
          <p v-if="feedback" :class="['feedback', feedback.type]">{{ feedback.text }}</p>
        </transition>

        <form class="composer" @submit.prevent="sendMessage">
          <textarea
            v-model="messageText"
            rows="1"
            placeholder="Tulis pesan..."
            @keydown.enter.exact.prevent="sendMessage"
          ></textarea>
          <button type="submit" :disabled="sending || !messageText.trim()">
            <span v-if="sending" class="spinner spinner-sm"></span>
            <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="white">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </form>
      </template>

      <div v-else class="chat-placeholder">
        <p>Pilih kontak atau mulai percakapan baru untuk mengirim pesan.</p>
      </div>
    </main>
  </div>
</template>

<style>
:root {
  --wa-green: #25d366;
  --wa-green-dark: #075e54;
  --wa-green-mid: #128c7e;
  --wa-bg-chat: #e5ddd5;
  --wa-bubble: #d9fdd3;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #cfd8dc;
  border-top-color: var(--wa-green-mid);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

* {
  box-sizing: border-box;
}

body {
  font-family: "Segoe UI", system-ui, sans-serif;
  margin: 0;
  background: #f4f6f8;
}

.gate {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #075e54, #128c7e, #25d366);
}

.gate-card {
  background: white;
  border-radius: 16px;
  padding: 36px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  text-align: center;
  max-width: 360px;
  animation: fadeInUp 0.3s ease;
}

.gate-logo {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--wa-green-mid), var(--wa-green));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.gate-card h1 {
  background: linear-gradient(135deg, var(--wa-green-mid), var(--wa-green-dark));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin: 0 0 8px;
}

.gate-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.qr {
  width: 220px;
  height: 220px;
  margin-top: 12px;
  border-radius: 8px;
  animation: fadeInUp 0.3s ease;
}

.app {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 320px;
  flex-shrink: 0;
  background: white;
  border-right: 1px solid #e2e2e2;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  background: linear-gradient(135deg, var(--wa-green-dark), var(--wa-green-mid));
  color: white;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  font-weight: 600;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.online-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4ade80;
  display: inline-block;
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.3);
  animation: pulse 1.6s ease-in-out infinite;
}

.new-chat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.search-icon {
  flex-shrink: 0;
}

.new-chat input {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 13px;
}

.new-chat button {
  background: linear-gradient(135deg, var(--wa-green-mid), var(--wa-green));
  color: white;
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.new-chat button:hover {
  transform: scale(1.08);
}

.contact-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.contact-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
}

.contact-list li {
  animation: fadeInUp 0.25s ease;
  transition: background 0.15s ease;
}

.contact-list li:hover {
  background: #f5f5f5;
}

.contact-list li.active {
  background: #ebebeb;
  border-left: 3px solid var(--wa-green-mid);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.contact-meta {
  flex: 1;
  min-width: 0;
}

.contact-phone {
  font-size: 14px;
  font-weight: 500;
  color: #222;
}

.contact-time {
  font-size: 11px;
  color: #999;
  flex-shrink: 0;
}

.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--wa-bg-chat);
}

.chat-header {
  background: white;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e2e2e2;
}

.chat-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667781;
  font-size: 14px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 8%;
}

.day-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.day-label {
  display: flex;
  justify-content: center;
  margin: 12px 0;
}

.day-label span {
  background: #ffffffb0;
  color: #555;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 8px;
}

.bubble-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 4px;
}

.bubble {
  background: var(--wa-bubble);
  border-radius: 8px;
  padding: 6px 10px;
  max-width: 65%;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 6px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.08);
  animation: fadeInUp 0.2s ease;
}

.bubble-text {
  font-size: 14px;
  color: #111;
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble-time {
  font-size: 10px;
  color: #667781;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.check-icon {
  fill: #53bdeb;
}

.empty {
  text-align: center;
  color: #888;
  font-size: 13px;
  margin-top: 20px;
}

.feedback {
  text-align: center;
  padding: 6px;
  font-size: 13px;
}

.feedback.error {
  color: #d32f2f;
}

.feedback.success {
  color: var(--wa-green);
}

.composer {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  background: #f0f0f0;
  border-top: 1px solid #e2e2e2;
}

.composer textarea {
  flex: 1;
  resize: none;
  border-radius: 20px;
  border: 1px solid #ccc;
  padding: 10px 16px;
  font-size: 14px;
  font-family: inherit;
  max-height: 100px;
}

.composer button {
  background: linear-gradient(135deg, var(--wa-green-mid), var(--wa-green));
  color: white;
  border: none;
  border-radius: 50%;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.composer button:hover:not(:disabled) {
  transform: scale(1.08);
}

.composer button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
