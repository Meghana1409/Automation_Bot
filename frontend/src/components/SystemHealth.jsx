import React, { useState } from 'react';
import { Database, Server, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Terminal, ExternalLink } from 'lucide-react';
import api from '../services/api';

export default function SystemHealth({ health, onRefresh }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTestPing = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.getHealth();
      setTestResult({ success: true, data: res });
    } catch (err) {
      setTestResult({ success: false, error: err.friendlyMessage || err.message });
    } finally {
      setTesting(false);
    }
  };

  const isConnected = health?.database_connected;
  const dbType = health?.database_type?.toUpperCase() || 'SQLITE';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Backend & Database Diagnostics</h2>
          <p className="text-xs text-slate-500">
            Real-time connection telemetry for FastAPI, SQLAlchemy, and Database Engine.
          </p>
        </div>
        <button
          onClick={handleTestPing}
          disabled={testing}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
          <span>{testing ? 'Testing Ping...' : 'Test API Health'}</span>
        </button>
      </div>

      {testResult && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start space-x-3 ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-bold">
              {testResult.success ? 'Health Check Passed' : 'Health Check Failed'}
            </p>
            <p className="mt-1 opacity-90">
              {testResult.success
                ? `FastAPI responded with status: ${testResult.data.status} (Database: ${testResult.data.database_type})`
                : testResult.error}
            </p>
          </div>
        </div>
      )}

      {/* Diagnostics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Database Engine Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Database
            </span>
            <Database className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-xl font-bold text-slate-900">{dbType}</p>
          <div className="mt-2 flex items-center space-x-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-600">
              {isConnected ? 'Connection Healthy' : 'Disconnected / Degraded'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono truncate">
            {health?.database_url_masked || 'sqlite:///./clinic.db'}
          </p>
        </div>

        {/* FastAPI Server Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              FastAPI Server
            </span>
            <Server className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-bold text-slate-900">v{health?.version || '1.0.0'}</p>
          <p className="text-xs text-slate-500 mt-2">
            Base Endpoint: <code className="text-slate-800 font-semibold">/api/v1</code>
          </p>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center space-x-1 text-xs text-sky-600 hover:text-sky-800 font-semibold"
          >
            <span>Open Swagger API Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* AI Receptionist Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              AI Bot Engine
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-slate-900">LangChain + Groq</p>
          <p className="text-xs text-slate-500 mt-2">
            Model: <code className="text-slate-800 font-semibold">openai/gpt-oss-120b</code>
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Languages: English, Hindi, Hinglish, Marathi
          </p>
        </div>
      </div>

      {/* Endpoints Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Registered FastAPI Endpoints
          </h3>
        </div>
        <div className="divide-y divide-slate-100 font-mono text-xs text-slate-700">
          <div className="p-3 flex items-center justify-between">
            <span className="font-semibold text-emerald-700">GET /api/v1/health</span>
            <span className="text-slate-400">Verifies database connection & status</span>
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="font-semibold text-sky-700">GET /api/v1/appointments</span>
            <span className="text-slate-400">Retrieves appointments with filtering</span>
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="font-semibold text-indigo-700">POST /api/v1/appointments</span>
            <span className="text-slate-400">Books an appointment with collision check</span>
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="font-semibold text-sky-700">GET /api/v1/appointments/check-slot</span>
            <span className="text-slate-400">Queries doctor availability for date/time</span>
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="font-semibold text-amber-700">GET /api/v1/appointments/stats</span>
            <span className="text-slate-400">Aggregates booking metrics</span>
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="font-semibold text-rose-700">DELETE /api/v1/appointments/{'{id}'}</span>
            <span className="text-slate-400">Cancels an existing appointment</span>
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="font-semibold text-purple-700">POST /api/v1/webhook/simulate</span>
            <span className="text-slate-400">Local chat testing endpoint for AI receptionist</span>
          </div>
        </div>
      </div>
    </div>
  );
}
