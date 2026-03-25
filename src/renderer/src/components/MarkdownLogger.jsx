// src/renderer/src/components/MarkdownLogger.jsx
// The core feature: take MD input and log study sessions directly

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useStore } from '../store/useStore'

const api = window.focusAgent

const TEMPLATES = {
  session: `## Study Session

**Subject:** 
**Duration:** 2h

### Topics Covered
- 

### Key Concepts
- 

### Problems Solved
1. 

### Tomorrow's Focus
- `,

  algorithm: `## Algorithm Practice

**Subject:** DSA - Arrays
**Duration:** 1.5h

### Problems
| Problem | Difficulty | Status |
|---------|-----------|--------|
| Two Sum | Easy | ✅ |
| Binary Search | Easy | ✅ |

### Notes
- 

### Patterns Learned
- `,

  review: `## Daily Review

**Date:** ${new Date().toLocaleDateString()}
**Total Hours:** 

### Completed Today
- [ ] 
- [ ] 

### What Went Well
- 

### What to Improve
- 

### Tomorrow's Plan
- `
}

export function MarkdownLogger() {
  const { addNotification, setStatus, setTodaySessions } = useStore()
  const [subject, setSubject] = useState('')
  const [duration, setDuration] = useState('')
  const [markdown, setMarkdown] = useState('')
  const [preview, setPreview] = useState(false)
  const [isLogging, setIsLogging] = useState(false)
  const [logged, setLogged] = useState(null)

  const parseDuration = (val) => {
    const text = val.trim().toLowerCase()
    const hourMatch = text.match(/^(\d+(?:\.\d+)?)\s*h/)
    const minMatch = text.match(/^(\d+)\s*m/)
    const numMatch = text.match(/^(\d+(?:\.\d+)?)$/)

    if (hourMatch) return parseFloat(hourMatch[1])
    if (minMatch) return parseFloat(minMatch[1]) / 60
    if (numMatch) return parseFloat(numMatch[1])
    return null
  }

  const handleLog = async () => {
    if (!subject.trim()) {
      addNotification('warning', 'Enter a subject')
      return
    }

    const durationHours = parseDuration(duration)
    if (!durationHours || durationHours <= 0) {
      addNotification('warning', 'Enter a valid duration (e.g., 2h, 90m, 1.5)')
      return
    }

    setIsLogging(true)
    try {
      const result = await api.session.log(subject.trim(), durationHours, markdown)
      const newStatus = await api.goal.getStatus()
      setStatus(newStatus)

      const todaySessions = await api.session.getToday()
      setTodaySessions(todaySessions)

      setLogged({ subject, durationHours, hoursCompleted: result.hoursCompleted, totalGoal: result.totalGoal })
      addNotification('success', `Logged ${durationHours.toFixed(2)}h of ${subject}`)

      // Reset
      setSubject('')
      setDuration('')
      setMarkdown('')
    } catch (err) {
      addNotification('danger', 'Failed to log: ' + err.message)
    } finally {
      setIsLogging(false)
    }
  }

  const applyTemplate = (key) => {
    setMarkdown(TEMPLATES[key])
  }

  return (
    <div style={styles.wrap}>
      {/* Quick meta */}
      <div style={styles.metaRow}>
        <input
          style={styles.metaInput}
          type="text"
          placeholder="Subject (e.g., Compiler Design)"
          value={subject}
          onChange={e => setSubject(e.target.value)}
        />
        <input
          style={{ ...styles.metaInput, width: '90px' }}
          type="text"
          placeholder="2h / 90m"
          value={duration}
          onChange={e => setDuration(e.target.value)}
        />
      </div>

      {/* Templates */}
      <div style={styles.templatesRow}>
        <span style={styles.templatesLabel}>Templates:</span>
        {Object.keys(TEMPLATES).map(key => (
          <button key={key} style={styles.templateBtn} onClick={() => applyTemplate(key)}>
            {key}
          </button>
        ))}
        <button style={styles.templateBtn} onClick={() => setMarkdown('')}>
          clear
        </button>
      </div>

      {/* Editor / Preview toggle */}
      <div style={styles.editorWrap}>
        <div style={styles.editorHeader}>
          <button
            style={{ ...styles.viewBtn, ...(preview ? {} : styles.viewBtnActive) }}
            onClick={() => setPreview(false)}
          >
            ✏ Edit
          </button>
          <button
            style={{ ...styles.viewBtn, ...(preview ? styles.viewBtnActive : {}) }}
            onClick={() => setPreview(true)}
          >
            ◈ Preview
          </button>
          <span style={styles.charCount}>{markdown.length} chars</span>
        </div>

        {preview ? (
          <div style={styles.preview} className="md-content">
            {markdown ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Nothing to preview</span>
            )}
          </div>
        ) : (
          <textarea
            style={styles.editor}
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
            placeholder={`Write your study notes in Markdown...\n\n## What I studied\n- Covered lexical analysis\n- Implemented DFA for tokenizer\n\n**Key insight:** context-free grammars can be parsed in O(n³)...`}
            spellCheck={false}
          />
        )}
      </div>

      {/* Log button */}
      <button
        style={{
          ...styles.logBtn,
          opacity: (isLogging || !subject || !duration) ? 0.5 : 1
        }}
        onClick={handleLog}
        disabled={isLogging || !subject || !duration}
      >
        {isLogging ? '⟳ Logging...' : '◈ Log Session'}
      </button>

      {/* Success feedback */}
      {logged && (
        <div style={styles.successCard}>
          <div style={styles.successTitle}>✓ Session Logged</div>
          <div style={styles.successRow}>
            <span style={styles.successLabel}>Subject</span>
            <span style={styles.successVal}>{logged.subject}</span>
          </div>
          <div style={styles.successRow}>
            <span style={styles.successLabel}>Duration</span>
            <span style={styles.successVal}>{logged.durationHours.toFixed(2)}h</span>
          </div>
          <div style={styles.successRow}>
            <span style={styles.successLabel}>Progress</span>
            <span style={{ ...styles.successVal, color: 'var(--accent-primary)' }}>
              {logged.hoursCompleted.toFixed(2)}h / {logged.totalGoal.toFixed(2)}h
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px',
    height: '100%',
    overflow: 'auto'
  },
  metaRow: {
    display: 'flex',
    gap: '6px'
  },
  metaInput: {
    flex: 1,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '7px 10px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
    fontFamily: 'var(--font-mono)'
  },
  templatesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap'
  },
  templatesLabel: {
    fontSize: '9px',
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase'
  },
  templateBtn: {
    fontSize: '9px',
    padding: '3px 6px',
    borderRadius: '3px',
    border: '1px solid var(--border-default)',
    color: 'var(--text-muted)',
    background: 'var(--bg-elevated)',
    cursor: 'pointer'
  },
  editorWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    minHeight: '220px'
  },
  editorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '4px 6px',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--bg-elevated)'
  },
  viewBtn: {
    fontSize: '9px',
    padding: '3px 8px',
    borderRadius: '3px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)'
  },
  viewBtnActive: {
    background: 'var(--accent-dim)',
    color: 'var(--accent-primary)'
  },
  charCount: {
    marginLeft: 'auto',
    fontSize: '9px',
    color: 'var(--text-muted)'
  },
  editor: {
    flex: 1,
    background: 'var(--bg-base)',
    padding: '10px',
    color: 'var(--text-primary)',
    fontSize: '11px',
    lineHeight: 1.7,
    resize: 'none',
    outline: 'none',
    border: 'none',
    fontFamily: 'var(--font-mono)',
    minHeight: '180px'
  },
  preview: {
    flex: 1,
    padding: '10px',
    overflowY: 'auto',
    background: 'var(--bg-base)',
    minHeight: '180px',
    userSelect: 'text'
  },
  logBtn: {
    padding: '10px',
    background: 'var(--accent-primary)',
    color: '#000',
    borderRadius: 'var(--radius-md)',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    letterSpacing: '0.08em',
    transition: 'opacity 0.2s'
  },
  successCard: {
    background: 'rgba(34, 197, 94, 0.06)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    borderRadius: 'var(--radius-md)',
    padding: '10px',
    animation: 'fadeIn 0.3s ease'
  },
  successTitle: {
    fontSize: '11px',
    color: 'var(--status-success)',
    fontWeight: 700,
    marginBottom: '6px'
  },
  successRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '3px'
  },
  successLabel: {
    fontSize: '10px',
    color: 'var(--text-muted)'
  },
  successVal: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    fontWeight: 600
  }
}
