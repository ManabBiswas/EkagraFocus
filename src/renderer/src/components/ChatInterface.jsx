// src/renderer/src/components/ChatInterface.jsx
import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useStore } from '../store/useStore'

const api = window.focusAgent

const QUICK_COMMANDS = [
  { label: 'Status', cmd: 'show my status' },
  { label: 'Schedule', cmd: 'show upcoming schedule' },
  { label: '1h DSA', cmd: 'I just did 1 hour of DSA' },
  { label: '2h OS', cmd: 'Completed 2 hours of Operating Systems' }
]

export function ChatInterface() {
  const {
    messages, addMessage, setMessages,
    isAgentThinking, setAgentThinking,
    ollamaAvailable, addNotification
  } = useStore()

  const [input, setInput] = useState('')
  const [notesMarkdown, setNotesMarkdown] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAgentThinking])

  // Welcome message if no history
  useEffect(() => {
    if (messages.length === 0) {
      addMessage('assistant',
        `## Welcome to Focus Agent\n\nI'm your AI study accountability system.\n\n**To log time:** \`I just did 2 hours of algorithms\`\n**To check status:** \`show my status\`\n**To see schedule:** \`upcoming schedule\`\n\nWhat did you study today?`
      )
    }
  }, [])

  const sendMessage = async (text = input) => {
    if (!text.trim() || isAgentThinking) return

    const userMsg = text.trim()
    setInput('')

    addMessage('user', userMsg)
    setAgentThinking(true)

    try {
      const result = await api.ai.sendMessage(userMsg, notesMarkdown)
      addMessage('assistant', result.response, result.intent)
      if (notesMarkdown) setNotesMarkdown('')
    } catch (err) {
      addMessage('assistant', 'Connection error. Please check Ollama is running.')
      addNotification('danger', 'AI agent error: ' + err.message)
    } finally {
      setAgentThinking(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleClearHistory = async () => {
    await api.ai.clearHistory()
    setMessages([])
  }

  return (
    <div style={styles.wrap}>
      {/* Ollama warning */}
      {!ollamaAvailable && (
        <div style={styles.ollamaWarn}>
          <span>⚠ Ollama offline</span>
          <span style={styles.ollamaHint}>Tool commands (log/status) still work</span>
        </div>
      )}

      {/* Message list */}
      <div style={styles.messages}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isAgentThinking && <ThinkingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Quick commands */}
      <div style={styles.quickRow}>
        {QUICK_COMMANDS.map(q => (
          <button
            key={q.label}
            style={styles.quickBtn}
            onClick={() => sendMessage(q.cmd)}
            disabled={isAgentThinking}
          >
            {q.label}
          </button>
        ))}
        <button
          style={{ ...styles.quickBtn, marginLeft: 'auto' }}
          onClick={handleClearHistory}
          title="Clear history"
        >
          ✕
        </button>
      </div>

      {/* Notes toggle (MD input) */}
      <div style={styles.notesToggle}>
        <button
          style={styles.notesBtn}
          onClick={() => setShowNotes(v => !v)}
        >
          {showNotes ? '▼' : '▶'} Add notes (Markdown)
          {notesMarkdown && <span style={styles.notesDot} />}
        </button>
      </div>

      {/* Markdown notes area */}
      {showNotes && (
        <div style={styles.notesArea}>
          <textarea
            style={styles.notesTextarea}
            value={notesMarkdown}
            onChange={e => setNotesMarkdown(e.target.value)}
            placeholder={`Add detailed notes in Markdown...\n\n## Compiler Design\n- Covered lexical analysis\n- Implemented DFA\n\n**Key insight:** SLR parsing works by...`}
            rows={5}
          />
          <div style={styles.notesHint}>Notes will be attached to the next log entry</div>
        </div>
      )}

      {/* Input row */}
      <div style={styles.inputRow}>
        <textarea
          ref={inputRef}
          style={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='I just did 2h of compiler design...'
          rows={2}
          disabled={isAgentThinking}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: (!input.trim() || isAgentThinking) ? 0.4 : 1
          }}
          onClick={() => sendMessage()}
          disabled={!input.trim() || isAgentThinking}
        >
          ↑
        </button>
      </div>
    </div>
  )
}

// ── MESSAGE BUBBLE ─────────────────────────────────────────────────────────────

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) return null

  const intentColors = {
    LOG_TIME: '#22c55e',
    STATUS: '#60a5fa',
    SCHEDULE: '#a78bfa',
    CONVERSATION: '#5c5a54'
  }

  return (
    <div style={{
      ...bubbleStyles.wrap,
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: 'fadeIn 0.2s ease'
    }}>
      {!isUser && (
        <div style={bubbleStyles.agentDot}>◈</div>
      )}
      <div style={{
        ...bubbleStyles.bubble,
        ...(isUser ? bubbleStyles.userBubble : bubbleStyles.agentBubble)
      }}>
        {isUser ? (
          <span style={bubbleStyles.userText}>{message.content}</span>
        ) : (
          <div className="md-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {message.intent && !isUser && (
          <div style={{
            ...bubbleStyles.intent,
            color: intentColors[message.intent] || 'var(--text-muted)'
          }}>
            {message.intent}
          </div>
        )}
      </div>
    </div>
  )
}

function ThinkingIndicator() {
  return (
    <div style={{ ...bubbleStyles.wrap, justifyContent: 'flex-start' }}>
      <div style={bubbleStyles.agentDot}>◈</div>
      <div style={{ ...bubbleStyles.bubble, ...bubbleStyles.agentBubble, ...bubbleStyles.thinking }}>
        <span style={bubbleStyles.dot} />
        <span style={{ ...bubbleStyles.dot, animationDelay: '0.2s' }} />
        <span style={{ ...bubbleStyles.dot, animationDelay: '0.4s' }} />
      </div>
    </div>
  )
}

const bubbleStyles = {
  wrap: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '6px',
    marginBottom: '10px'
  },
  agentDot: {
    fontSize: '10px',
    color: '#f5a623',
    flexShrink: 0,
    marginBottom: '4px'
  },
  bubble: {
    maxWidth: '85%',
    padding: '8px 10px',
    borderRadius: '8px',
    fontSize: '12px',
    lineHeight: 1.5
  },
  userBubble: {
    background: 'rgba(245, 166, 35, 0.12)',
    border: '1px solid rgba(245, 166, 35, 0.25)',
    borderBottomRightRadius: '2px'
  },
  agentBubble: {
    background: '#141418',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderBottomLeftRadius: '2px',
    color: '#9d9b94'
  },
  userText: {
    color: '#f0eee8',
    fontSize: '12px'
  },
  intent: {
    fontSize: '8px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    marginTop: '6px',
    fontFamily: "'JetBrains Mono', monospace"
  },
  thinking: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    padding: '10px 14px'
  },
  dot: {
    display: 'inline-block',
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: '#5c5a54',
    animation: 'blink 1.2s ease infinite'
  }
}

const styles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden'
  },
  ollamaWarn: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 12px',
    background: 'rgba(245, 158, 11, 0.06)',
    borderBottom: '1px solid rgba(245, 158, 11, 0.15)',
    fontSize: '10px',
    color: '#f59e0b'
  },
  ollamaHint: {
    color: '#5c5a54',
    fontSize: '9px'
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column'
  },
  quickRow: {
    display: 'flex',
    gap: '4px',
    padding: '6px 10px',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    overflowX: 'auto',
    flexShrink: 0
  },
  quickBtn: {
    fontSize: '9px',
    padding: '3px 7px',
    borderRadius: '3px',
    background: '#202028',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#5c5a54',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'border-color 0.15s, color 0.15s',
    flexShrink: 0
  },
  notesToggle: {
    padding: '0 10px',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    flexShrink: 0
  },
  notesBtn: {
    fontSize: '9px',
    color: '#5c5a54',
    padding: '5px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    position: 'relative'
  },
  notesDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: '#f5a623',
    display: 'inline-block'
  },
  notesArea: {
    padding: '0 10px 8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    flexShrink: 0
  },
  notesTextarea: {
    width: '100%',
    background: '#141418',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px',
    color: '#f0eee8',
    fontSize: '11px',
    resize: 'none',
    lineHeight: 1.5,
    outline: 'none',
    fontFamily: "'JetBrains Mono', monospace"
  },
  notesHint: {
    fontSize: '9px',
    color: '#5c5a54',
    marginTop: '4px'
  },
  inputRow: {
    display: 'flex',
    gap: '6px',
    padding: '8px 10px',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    flexShrink: 0
  },
  input: {
    flex: 1,
    background: '#141418',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 10px',
    color: '#f0eee8',
    fontSize: '12px',
    resize: 'none',
    lineHeight: 1.4,
    outline: 'none',
    fontFamily: "'JetBrains Mono', monospace"
  },
  sendBtn: {
    width: '36px',
    height: '36px',
    background: '#f5a623',
    color: '#000',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    alignSelf: 'flex-end',
    transition: 'opacity 0.2s'
  }
}
