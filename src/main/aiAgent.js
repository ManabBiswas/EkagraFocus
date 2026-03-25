// src/main/aiAgent.js
// Agentic AI Subsystem — LangChain.js + Ollama (local SLM)
// Hierarchical intent routing: fast classifier → tool executor → conversation

import { ChatOllama } from '@langchain/community/chat_models/ollama'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import { getRecentChatHistory, saveChatMessage } from './database.js'
import { logStudySession, getTodaySessions } from './database.js'
import { getTodayStatus, getFutureSchedule, getPenaltyStatus } from './goalEngine.js'

// Ollama model config — uses local SLM for privacy
const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
const FAST_MODEL = 'phi3:mini'    // Fast classifier (1-3B param)
const MAIN_MODEL = 'llama3.2:3b' // Main conversational model

let mainLLM = null
let isLoaded = false
let unloadTimer = null
const UNLOAD_AFTER_MS = 5 * 60 * 1000 // 5 minutes of inactivity

// ── MODEL LIFECYCLE ────────────────────────────────────────────────────────────

function loadLLM() {
  if (!mainLLM) {
    mainLLM = new ChatOllama({
      baseUrl: OLLAMA_BASE_URL,
      model: MAIN_MODEL,
      temperature: 0.4,
      numPredict: 512
    })
    console.log('[AI] LLM loaded:', MAIN_MODEL)
  }
  isLoaded = true

  // Reset inactivity timer
  clearTimeout(unloadTimer)
  unloadTimer = setTimeout(() => {
    mainLLM = null
    isLoaded = false
    console.log('[AI] LLM unloaded (inactivity)')
  }, UNLOAD_AFTER_MS)

  return mainLLM
}

// ── INTENT CLASSIFICATION ─────────────────────────────────────────────────────
// Fast rule-based + pattern classifier (no LLM needed for simple intents)

const INTENT_PATTERNS = {
  LOG_TIME: [
    /(?:just|did|completed?|finished?|studied?|spent|logged?)\s+(\d+(?:\.\d+)?)\s*(?:hour|hr|h|minute|min|m)s?\s+(?:of\s+)?(.+)/i,
    /(\d+(?:\.\d+)?)\s*(?:hour|hr|h|minute|min|m)s?\s+(?:of\s+)?(.+)/i,
    /log\s+(\d+(?:\.\d+)?)\s*(?:hour|hr|h|minute|min|m)s?\s+(?:of\s+)?(.+)/i,
    /add\s+(\d+(?:\.\d+)?)\s*(?:hour|hr|h|minute|min|m)s?\s+(?:for\s+)?(.+)/i
  ],
  STATUS: [
    /(?:what(?:'s| is)|show|give|how much|remaining|left|progress|status|today)/i,
    /how\s+(?:am|are)\s+(?:i|we)\s+doing/i
  ],
  SCHEDULE: [
    /(?:schedule|upcoming|future|next|plan|week|tomorrow)/i
  ],
  RESET_TIMER: [
    /(?:start|begin|launch|open)\s+(?:a\s+)?(?:timer|session|study|focus)/i
  ]
}

function classifyIntent(message) {
  const text = message.toLowerCase().trim()

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) return intent
    }
  }

  return 'CONVERSATION'
}

// ── PARAMETER EXTRACTION ──────────────────────────────────────────────────────

function extractLogParams(message) {
  const patterns = [
    // "just did 2 hours of compiler design"
    /(?:just|did|completed?|finished?|studied?|spent|logged?)\s+(\d+(?:\.\d+)?)\s*(hour|hr|h|minute|min|m)s?\s+(?:of\s+|on\s+|for\s+)?(.+)/i,
    // "2h of algorithms"
    /(\d+(?:\.\d+)?)\s*(hour|hr|h|minute|min|m)s?\s+(?:of\s+|on\s+|for\s+)?(.+)/i,
    // "log 1.5 hours compiler design"
    /(?:log|add)\s+(\d+(?:\.\d+)?)\s*(hour|hr|h|minute|min|m)s?\s+(?:of\s+|on\s+|for\s+)?(.+)/i
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match) {
      const amount = parseFloat(match[1])
      const unit = match[2].toLowerCase()
      const subject = match[3].replace(/[.,!?]+$/, '').trim()

      // Convert minutes to hours
      const durationHours = unit.startsWith('m') ? amount / 60 : amount

      return { durationHours, subject, raw: match[0] }
    }
  }

  return null
}

// ── TOOL EXECUTOR ─────────────────────────────────────────────────────────────

async function executeLogTime(params, notesMarkdown = '') {
  const result = logStudySession({
    subject: params.subject,
    durationHours: params.durationHours,
    notesMarkdown,
    loggedVia: 'chat'
  })

  const { hoursCompleted, totalGoal, goalMet } = result
  const remaining = Math.max(0, totalGoal - hoursCompleted)

  let response = `✅ **Logged ${params.durationHours >= 1 ? params.durationHours + 'h' : Math.round(params.durationHours * 60) + 'min'} of ${params.subject}**\n\n`
  response += `📊 **Today's Progress:** ${hoursCompleted.toFixed(2)}h / ${totalGoal.toFixed(2)}h\n`

  if (goalMet) {
    response += `\n🎉 **Goal Complete!** You've hit your ${totalGoal}h target for today. Outstanding work.`
  } else {
    response += `⏳ **Remaining:** ${remaining.toFixed(2)}h to hit today's goal.`
  }

  return response
}

async function executeGetStatus() {
  const status = getTodayStatus()
  const sessions = getTodaySessions()

  let response = `## 📅 Today — ${status.date}\n\n`
  response += `**Progress:** ${status.hoursCompleted.toFixed(2)}h / ${status.totalGoal.toFixed(2)}h (${status.progressPercent.toFixed(0)}%)\n\n`

  if (status.debtHours > 0) {
    response += `⚠️ **Debt carried forward:** +${status.debtHours.toFixed(2)}h\n`
  }
  if (status.penaltyHours > 0) {
    response += `🚨 **Penalty hours:** +${status.penaltyHours.toFixed(2)}h\n`
  }

  response += `\n**Remaining:** ${status.remaining.toFixed(2)}h\n\n`

  if (sessions.length > 0) {
    response += `### Sessions Today\n`
    sessions.forEach(s => {
      response += `- **${s.subject}** — ${s.duration_hours}h\n`
    })
  } else {
    response += `*No sessions logged yet today.*`
  }

  if (status.penaltyModeActive) {
    const penalty = getPenaltyStatus()
    response += `\n\n> 🚨 **PENALTY MODE ACTIVE** — expires in ${penalty.daysRemaining} days (${penalty.expirationDate})`
  }

  return response
}

async function executeGetSchedule() {
  const schedule = getFutureSchedule()

  let response = `## 📆 Upcoming 7 Days\n\n`
  schedule.forEach(day => {
    const extra = day.debtHours + day.penaltyHours
    response += `**${day.date}**: ${day.totalGoal.toFixed(1)}h`
    if (extra > 0) {
      response += ` *(base ${day.baseGoal}h + ${extra.toFixed(1)}h extra)*`
    }
    response += `\n`
  })

  return response
}

// ── MAIN PROCESS FUNCTION ─────────────────────────────────────────────────────

export async function processMessage(userMessage, notesMarkdown = '') {
  // Save user message
  saveChatMessage('user', userMessage)

  const intent = classifyIntent(userMessage)
  console.log('[AI] Intent:', intent)

  let response = ''

  try {
    // ── TOOL INTENTS (no LLM needed) ──
    if (intent === 'LOG_TIME') {
      const params = extractLogParams(userMessage)
      if (params) {
        response = await executeLogTime(params, notesMarkdown)
      } else {
        response = `I understood you want to log time but couldn't extract the details. Try: *"I just did 2 hours of compiler design"*`
      }
    } else if (intent === 'STATUS') {
      response = await executeGetStatus()
    } else if (intent === 'SCHEDULE') {
      response = await executeGetSchedule()
    } else {
      // ── CONVERSATIONAL (LLM needed) ──
      response = await conversationalResponse(userMessage)
    }
  } catch (err) {
    console.error('[AI] Error:', err.message)
    response = await fallbackResponse(userMessage, intent)
  }

  saveChatMessage('assistant', response)
  return { response, intent }
}

// ── CONVERSATIONAL LLM FALLBACK ───────────────────────────────────────────────

async function conversationalResponse(userMessage) {
  const llm = loadLLM()
  const history = getRecentChatHistory(10)
  const status = getTodayStatus()

  const systemPrompt = `You are Focus Agent — a strict, encouraging AI study accountability assistant embedded in a desktop app.

CONTEXT:
- Today's goal: ${status.totalGoal.toFixed(2)} hours
- Hours completed: ${status.hoursCompleted.toFixed(2)} hours
- Remaining: ${status.remaining.toFixed(2)} hours
- Penalty mode: ${status.penaltyModeActive ? 'ACTIVE' : 'inactive'}

PERSONALITY: Direct, honest, disciplined. You enforce the study schedule firmly but supportively. You do not coddle but you do encourage. Keep responses concise and actionable.

For logging study time, users can say things like:
"I just did 2 hours of algorithms"
"Log 1.5h of OS"
"Studied 45 minutes of networks"

For status, users say: "how am I doing", "show my progress", "what's remaining"
`

  const messages = [
    new SystemMessage(systemPrompt),
    ...history.slice(-8).map(m =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
    new HumanMessage(userMessage)
  ]

  const result = await llm.invoke(messages)
  return result.content
}

async function fallbackResponse(message, intent) {
  const status = getTodayStatus()
  const remaining = status.remaining.toFixed(2)

  const responses = {
    LOG_TIME: `Couldn't parse the time. Try: "I just did 2 hours of [subject]"`,
    STATUS: await executeGetStatus(),
    SCHEDULE: await executeGetSchedule(),
    CONVERSATION: `I'm your Focus Agent. You have ${remaining}h remaining today. To log time, say: "I just did 2h of [subject]"`
  }

  return responses[intent] || responses.CONVERSATION
}

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────

export async function checkOllamaAvailable() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    const data = await res.json()
    const models = data.models?.map(m => m.name) || []
    return { available: true, models }
  } catch {
    return { available: false, models: [] }
  }
}

export function isLLMLoaded() {
  return isLoaded
}
