import React, { useState } from 'react';
import { MessageSquare, Send, Bot, User, Sparkles } from 'lucide-react';
import api from '../services/api';

export default function BotSimulator({ onAppointmentBooked }) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Namaste! Welcome to Care & Cure Clinic. Aapko kisme pareshani hai ya kiske liye appointment chahiye?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await api.simulateBot(userText);
      setMessages((prev) => [...prev, { sender: 'bot', text: res.reply }]);
      // If the bot booked an appointment, refresh the dashboard appointments table
      if (res.reply.toLowerCase().includes('success') || res.reply.toLowerCase().includes('confirm') || res.reply.toLowerCase().includes('book')) {
        onAppointmentBooked();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Error contacting AI receptionist. Make sure GROQ_API_KEY is configured in your .env.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'I have knee pain, book Dr Amit tomorrow 11:00 AM for Ramesh',
    'Fever and cough since 2 days, need Dr Neha today 6:00 PM for Sunita',
    'Mala appointment pahije doctor sathi',
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">WhatsApp Bot Simulator</h3>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
          Live AI Agent
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Test the multilingual AI receptionist directly in your browser.
      </p>

      {/* Chat Messages Log */}
      <div className="flex-1 min-h-[220px] max-h-[320px] overflow-y-auto space-y-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100 mb-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 ${
              m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] ${
                m.sender === 'user' ? 'bg-sky-600' : 'bg-emerald-600'
              }`}
            >
              {m.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-sky-600 text-white rounded-tr-none'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic">
            <Bot className="w-4 h-4 animate-spin text-emerald-600" />
            <span>AI Receptionist is checking availability & typing...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="mb-3">
        <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1.5">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Quick test prompts:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => setInput(p)}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-colors text-left"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input form */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          placeholder="Type message like a patient..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
