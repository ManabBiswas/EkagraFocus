import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';

export function ChatInterface() {
  const {
    messages,
    addMessage,
    setAgentThinking,
    isAgentThinking,
  } = useStore();

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim() || isAgentThinking) return;

    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    });

    setInput('');

    setAgentThinking(true);
    setTimeout(() => {
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Agent response will be implemented with AI logic',
        timestamp: new Date().toISOString(),
      });
      setAgentThinking(false);
    }, 1000);
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      {/* Messages Container */}
      <div
        ref={messagesEndRef}
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center text-sm text-slate-400">
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
                    ? 'border border-cyan-400/25 bg-cyan-400/10 text-cyan-50'
                    : 'border border-white/10 bg-slate-900/80 text-slate-100'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isAgentThinking && (
          <div className="flex justify-start">
            <div className="animate-pulse-subtle rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2 text-slate-300 shadow-lg">
              Processing...
            </div>
          </div>
        )}
      </div>

      {/* Quick Command Buttons */}
      <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3">
        <button
          onClick={() => handleQuickCommand('Status')}
          className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 transition-colors hover:bg-cyan-400/20"
        >
          STATUS
        </button>
        <button
          onClick={() => handleQuickCommand('1h Math')}
          className="rounded-full border border-slate-200/20 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:bg-white/10"
        >
          1H MATH
        </button>
        <button
          onClick={() => handleQuickCommand('2h DSA')}
          className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100 transition-colors hover:bg-emerald-400/20"
        >
          2H DSA
        </button>
        <button
          onClick={() => handleQuickCommand('Schedule')}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition-colors hover:bg-white/10"
        >
          SCHEDULE
        </button>
      </div>

      {/* Input Area */}
      <div className="flex gap-3 border-t border-white/10 p-4">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask something..."
          className="metal-input flex-1 resize-none rounded-2xl px-3 py-2 text-sm"
          style={{ minHeight: '3.5rem' }}
          rows={2}
        />
        <button
          onClick={handleSendMessage}
          className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition-colors hover:bg-cyan-400/20"
        >
          SEND
        </button>
      </div>
    </div>
  );
}
