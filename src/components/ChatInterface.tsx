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
    <div className="h-full flex flex-col bg-slate-900">
      {/* Messages Container */}
      <div
        ref={messagesEndRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500 text-center">Start a conversation...</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-cyan-900 text-cyan-100 border border-cyan-700'
                    : 'bg-slate-800 text-slate-100 border border-slate-700'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isAgentThinking && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg animate-pulse-subtle border border-slate-700">
              Processing...
            </div>
          </div>
        )}
      </div>

      {/* Quick Command Buttons */}
      <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 space-x-2 flex flex-wrap gap-1">
        <button
          onClick={() => handleQuickCommand('Status')}
          className="px-3 py-1 bg-blue-900 text-blue-300 rounded text-sm hover:bg-blue-800 transition-colors border border-blue-700"
        >
          STATUS
        </button>
        <button
          onClick={() => handleQuickCommand('1h Math')}
          className="px-3 py-1 bg-purple-900 text-purple-300 rounded text-sm hover:bg-purple-800 transition-colors border border-purple-700"
        >
          1H MATH
        </button>
        <button
          onClick={() => handleQuickCommand('2h DSA')}
          className="px-3 py-1 bg-green-900 text-green-300 rounded text-sm hover:bg-green-800 transition-colors border border-green-700"
        >
          2H DSA
        </button>
        <button
          onClick={() => handleQuickCommand('Schedule')}
          className="px-3 py-1 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600 transition-colors border border-slate-600"
        >
          SCHEDULE
        </button>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask something..."
          className="flex-1 p-2 border border-slate-700 bg-slate-900 text-slate-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
          rows={2}
        />
        <button
          onClick={handleSendMessage}
          className="px-4 py-2 bg-cyan-700 text-cyan-100 rounded-lg hover:bg-cyan-600 transition-colors font-medium border border-cyan-600"
        >
          SEND
        </button>
      </div>
    </div>
  );
}
