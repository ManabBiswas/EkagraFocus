import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { IPCAgentMessage, IPCResponse } from '../shared/ipc';

type WindowWithApi = Window & {
  api?: {
    agent?: {
      sendMessage: (message: string) => Promise<IPCResponse<IPCAgentMessage>>;
    };
  };
};

export function ChatInterface() {
  const {
    messages,
    addMessage,
    setAgentThinking,
    isAgentThinking,
    setActiveTab,
    startTimer,
    addSession,
    weeklyProgress,
    activeChatSessionId,
    chatSessions,
    loadChatSessions,
    loadMessagesForSession,
    createNewSession,
  } = useStore();

  const [input, setInput] = useState('');
  const [hasApiError, setHasApiError] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if API is available and init chat sessions
  useEffect(() => {
    const hasApi = !!(window as WindowWithApi).api?.agent?.sendMessage;
    if (!hasApi) {
      console.warn('[ChatInterface] API not available yet');
      setHasApiError(true);
    } else {
      console.log('[ChatInterface] API is available');
      setHasApiError(false);
      
      const initChat = async () => {
        await loadChatSessions();
        setTimeout(() => {
          const state = useStore.getState();
          if (state.chatSessions.length === 0) {
            state.createNewSession('New Chat');
          } else if (!state.activeChatSessionId) {
            state.loadMessagesForSession(state.chatSessions[0].id);
          }
        }, 100);
      };
      initChat();
    }
  }, [loadChatSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isAgentThinking) return;

    const userMessage = input.trim();

    // Add user message to chat
    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    setInput('');
    setAgentThinking(true);

    try {
      console.log('[ChatInterface] Sending message:', userMessage);
      
      const api = (window as WindowWithApi).api as any;
      if (!api?.agent?.sendMessage) {
        throw new Error('API not available');
      }

      // Call the real AI pipeline
      const sessionId = activeChatSessionId || 'default';
      const response = await api.agent.sendMessage(sessionId, userMessage);

      console.log('[ChatInterface] Response received:', response);

      if (response?.success && response?.data) {
        const agentMsg = response.data;

        // Add AI response
        addMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: agentMsg.reply || 'No response',
          timestamp: new Date().toISOString(),
        });

        console.log('[ChatInterface] Action received:', agentMsg.action);

        // Execute action based on AI response
        executeAgentAction(agentMsg);
      } else {
        console.error('[ChatInterface] Invalid response format:', response);
        addMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${response?.error || 'Invalid response format'}`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[ChatInterface] Error:', error);
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Could not connect to AI service'}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setAgentThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickCommand = (cmd: string) => {
    setInput(cmd);
  };

  const executeAgentAction = (agentMsg: IPCAgentMessage): void => {
    if (!agentMsg?.action) return;

    switch (agentMsg.action) {
      case 'start_timer': {
        const duration = Number(agentMsg.data?.durationMinutes) || 25;
        const subject = String(agentMsg.data?.subject || 'Focus Session');

        console.log('[ChatInterface] Starting timer:', { subject, duration });
        setTimeout(() => {
          startTimer(subject, duration);
          setActiveTab('timer');
        }, 300);
        break;
      }

      case 'log_session': {
        const duration = Number((agentMsg.data as Record<string, unknown>)?.durationMinutes) || 0;
        const subject = String(agentMsg.data?.subject || 'Study Session');
        const notes = String(agentMsg.data?.notes || '');

        if (duration > 0) {
          addSession({
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            subject,
            durationHours: Math.round((duration / 60) * 100) / 100,
            notes,
            loggedVia: 'chat',
            timestamp: new Date().toISOString(),
          });
          console.log('[ChatInterface] Session logged:', { subject, duration });
        }
        break;
      }

      case 'ask_clarification':
      default:
        // No direct UI action needed
        break;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      {/* Session Dropdown Header */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-white/20">
        <select 
          className="bg-slate-800 text-slate-200 text-sm rounded px-2 py-1 outline-none border border-slate-700 max-w-[200px] truncate"
          value={activeChatSessionId || ''}
          onChange={(e) => {
            if (e.target.value === 'NEW_SESSION') {
              createNewSession('New Chat');
            } else {
              loadMessagesForSession(e.target.value);
            }
          }}
        >
          {chatSessions.map(session => (
            <option key={session.id} value={session.id}>
              {session.title} ({new Date(session.created_at).toLocaleDateString()})
            </option>
          ))}
          <option value="NEW_SESSION">+ New Chat Session</option>
        </select>
      </div>

      {/* Messages Container */}
      <div
        className="flex-1 space-y-3 overflow-y-auto p-4 pr-3"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-2xl border border-white/20 bg-black/35 px-5 py-4 text-center text-sm text-slate-300">
              Start a conversation...
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
                  msg.role === 'user'
                    ? 'border border-cyan-400/35 bg-cyan-400/20 text-cyan-100'
                    : 'border border-white/15 bg-slate-900 text-slate-200'
                }`}
                style={{ wordBreak: 'break-word' }}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isAgentThinking && (
          <div className="flex justify-start">
            <div className="animate-pulse-subtle rounded-2xl border border-white/15 bg-slate-900 px-4 py-2 text-slate-200 shadow-lg">
              Processing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {hasApiError && (
        <div className="border-t border-red-400/30 bg-red-400/10 px-4 py-2 text-xs text-red-200">
          ⚠ API not available - check console for details
        </div>
      )}

      {/* Quick Command Buttons */}
      <div className="flex flex-wrap gap-2 border-t border-white/20 px-4 py-3">
        <button
          onClick={() => handleQuickCommand(`Status Week ${weeklyProgress?.weekNumber || 1}`)}
          className="btn-glow px-3 py-1 rounded-full"
        >
          STATUS
        </button>
        <button
          onClick={() => handleQuickCommand('1h DBMS')}
          className="btn-secondary px-3 py-1 rounded-full"
        >
          1H DBMS
        </button>
        <button
          onClick={() => handleQuickCommand('2h DSA')}
          className="btn-success px-3 py-1 rounded-full"
        >
          2H DSA
        </button>
        <button
          onClick={() => handleQuickCommand('Schedule')}
          className="btn-secondary px-3 py-1 rounded-full"
        >
          SCHEDULE
        </button>
      </div>

      {/* Input Area */}
      <div className="flex gap-3 border-t border-white/20 p-4">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          // placeholder={`Ask about ${planSummary ? planSummary.title : 'your schedule'}...`}
          placeholder={`Ask about your schedule ...`}
          className="metal-input flex-1 resize-none rounded-2xl px-3 py-2 text-sm"
          style={{ minHeight: '3.5rem' }}
          rows={2}
        />
        <button
          onClick={handleSendMessage}
          className="btn-primary px-4 py-2"
        >
          SEND
        </button>
      </div>
    </div>
  );
}
