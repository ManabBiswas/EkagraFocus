import React, { useState } from 'react';
import { useStore } from '../store/useStore';

declare global {
  interface Window {
    electronAPI: Record<string, unknown>;
  }
}

export function PlanViewer() {
  const {
    schedulePlan,
    setSchedulePlan,
    scheduleAnalysis,
    setScheduleAnalysis,
    workloadEstimate,
    setWorkloadEstimate,
    studyTips,
    setStudyTips,
    geminiApiKey,
    setGeminiApiKey,
    isAnalyzing,
    setIsAnalyzing,
    addNotification,
  } = useStore();

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'analysis' | 'tips' | 'workload'>('analysis');

  // Load API key from localStorage and environment on mount
  React.useEffect(() => {
    const loadApiKey = async () => {
      // First try to load from localStorage
      const storedKey = typeof window !== 'undefined' ? localStorage.getItem('geminiApiKey') : null;
      if (storedKey) {
        console.log('✓ API key loaded from localStorage');
        setGeminiApiKey(storedKey);
        return;
      }

      // Then try to load from environment variable via IPC
      if (window.electronAPI?.getStoredApiKey) {
        try {
          const result = await window.electronAPI.getStoredApiKey();
          if (result.success && result.key) {
            console.log('✓ API key loaded from .env');
            setGeminiApiKey(result.key);
          } else {
            console.log('ℹ No API key found in .env or environment');
          }
        } catch (error) {
          console.warn('Could not load API key from environment:', error);
        }
      }
    };

    loadApiKey();
  }, [setGeminiApiKey]);

  // Note: handleSetApiKey is disabled - using local Ollama AI instead
  /*
  const handleSetApiKey = async () => {
    if (!apiKeyInput.trim()) {
      addNotification({
        id: `notif-${Date.now()}`,
        type: 'error',
        title: 'Error',
        message: 'Please enter a valid API key',
        duration: 5000,
      });
      return;
    }

    try {
      const result = await window.electronAPI.setGeminiApiKey(apiKeyInput);
      if (result.success) {
        setGeminiApiKey(apiKeyInput);
        setApiKeyInput('');
        setShowApiKeyInput(false);
        addNotification({
          id: `notif-${Date.now()}`,
          type: 'success',
          title: 'API Key Set',
          message: 'Gemini API key configured successfully',
          duration: 5000,
        });
      }
    } catch (error) {
      addNotification({
        id: `notif-${Date.now()}`,
        type: 'error',
        title: 'Error',
        message: 'Failed to set API key',
        duration: 5000,
      });
    }
  };
  */

  const handleAnalyzeSchedule = async () => {
    if (!schedulePlan) {
      addNotification({
        id: `notif-${Date.now()}`,
        type: 'error',
        title: 'Error',
        message: 'Please import a plan first',
        duration: 5000,
      });
      return;
    }

    if (!geminiApiKey) {
      addNotification({
        id: `notif-${Date.now()}`,
        type: 'error',
        title: 'Error',
        message: 'Please set your Gemini API key first',
        duration: 5000,
      });
      setShowApiKeyInput(true);
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('📋 Starting schedule analysis...');
      
      // Analyze schedule
      console.log('🔄 Calling analyzeSchedule...');
      const analysisResult = await window.electronAPI.analyzeSchedule(schedulePlan.content);
      console.log('📊 Analysis result:', analysisResult);
      
      if (analysisResult.success && analysisResult.data) {
        console.log('✓ Analysis data received:', analysisResult.data);
        setScheduleAnalysis(analysisResult.data);
      } else {
        throw new Error(analysisResult.error || 'Failed to analyze schedule');
      }

      // Generate study tips
      console.log('🔄 Calling generateStudyTips...');
      const tipsResult = await window.electronAPI.generateStudyTips(schedulePlan.content);
      console.log('💡 Tips result:', tipsResult);
      
      if (tipsResult.success && tipsResult.data) {
        console.log('✓ Tips data received:', tipsResult.data);
        setStudyTips(tipsResult.data);
      } else {
        console.warn('⚠ Tips generation failed, using empty array');
        setStudyTips([]);
      }

      // Estimate workload
      console.log('🔄 Calling estimateWorkload...');
      const workloadResult = await window.electronAPI.estimateWorkload(schedulePlan.content);
      console.log('⚙️  Workload result:', workloadResult);
      
      if (workloadResult.success && workloadResult.data) {
        console.log('✓ Workload data received:', workloadResult.data);
        setWorkloadEstimate(workloadResult.data);
      } else {
        console.warn('⚠ Workload estimation failed, using defaults');
      }

      console.log('✅ All analyses complete!');
      addNotification({
        id: `notif-${Date.now()}`,
        type: 'success',
        title: 'Analysis Complete',
        message: 'Your schedule has been analyzed by Gemini',
        duration: 5000,
      });
      setActiveAnalysisTab('analysis');
    } catch (error) {
      console.error('❌ Analysis error:', error);
      addNotification({
        id: `notif-${Date.now()}`,
        type: 'error',
        title: 'Analysis Failed',
        message: (error as Error).message,
        duration: 5000,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const importPlan = async () => {
    if (!window.api || !window.api.file) {
      console.error('[PlanViewer] API not available');
      addNotification({
        id: `notif-${Date.now()}`,
        type: 'error',
        title: 'Error',
        message: 'Electron API not available',
        duration: 5000,
      });
      return;
    }

    try {
      console.log('[PlanViewer] Starting file import...');
      const result = await window.api.file.importPlanFile();

      if (result && result.success && result.data) {
        const { fileName, filePath, content } = result.data;
        console.log(`[PlanViewer] File imported: ${fileName}`);
        
        const plan = {
          fileName,
          filePath,
          content,
          importedAt: new Date().toISOString(),
        };

        setSchedulePlan(plan);
        // Clear analysis when new plan is imported
        setScheduleAnalysis(null);
        setWorkloadEstimate(null);
        setStudyTips([]);

        addNotification({
          id: `notif-${Date.now()}`,
          type: 'success',
          title: 'Plan imported',
          message: `Successfully imported "${fileName}"`,
          duration: 5000,
        });
      } else {
        throw new Error(result?.error || 'Failed to import plan');
      }
    } catch (error) {
      console.error('[PlanViewer] Error importing plan:', error);
      addNotification({
        id: `notif-${Date.now()}`,
        type: 'error',
        title: 'Import failed',
        message: error instanceof Error ? error.message : 'Failed to import plan file',
        duration: 5000,
      });
    }
  };

  return (
    <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-2">
      {schedulePlan ? (
        <>
          {/* Plan loaded view */}
          <section className="panel-shell p-5">
            <div className="flex items-start justify-between gap-4 border-b border-white/20 pb-4">
              <div>
                <p className="section-label text-emerald-400">Schedule</p>
                <h2 className="mt-3 text-lg font-bold text-white truncate">
                  {schedulePlan.fileName}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Imported {new Date(schedulePlan.importedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSchedulePlan(null)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.25em] text-slate-300 transition-colors hover:border-red-400/40 hover:bg-red-400/10"
              >
                Clear
              </button>
            </div>

            {/* API Key Section */}
            {!geminiApiKey && (
              <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                  Gemini API Key Required
                </p>
                <p className="mt-2 text-sm text-amber-100">
                  Set your Gemini API key to analyze this schedule with AI
                </p>
                <button
                  onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                  className="mt-3 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-amber-100 transition-colors hover:border-amber-400/60 hover:bg-amber-400/20"
                >
                  🤖 Using Local AI
                </button>
              </div>
            )}

            {/* Analyze Button - Using Local Ollama */}
            {!scheduleAnalysis && (
              <button
                onClick={handleAnalyzeSchedule}
                disabled={isAnalyzing}
                className={`mt-4 w-full rounded-lg border transition-all px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] ${
                  isAnalyzing
                    ? 'border-cyan-400/20 bg-cyan-400/5 text-cyan-400 cursor-not-allowed'
                    : 'border-cyan-400/35 bg-cyan-400/10 text-cyan-100 hover:border-cyan-400/50 hover:bg-cyan-400/15'
                }`}
              >
                {isAnalyzing ? 'Analyzing with Gemini...' : '✨ Analyze with Gemini'}
              </button>
            )}

            {/* Analysis Results */}
            {scheduleAnalysis && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2 border-b border-white/10 pb-3">
                  <button
                    onClick={() => setActiveAnalysisTab('analysis')}
                    className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-all ${
                      activeAnalysisTab === 'analysis'
                        ? 'border border-cyan-400/35 bg-cyan-400/10 text-cyan-100'
                        : 'border border-transparent text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    Analysis
                  </button>
                  <button
                    onClick={() => setActiveAnalysisTab('tips')}
                    className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-all ${
                      activeAnalysisTab === 'tips'
                        ? 'border border-emerald-400/35 bg-emerald-400/10 text-emerald-100'
                        : 'border border-transparent text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    Tips
                  </button>
                  <button
                    onClick={() => setActiveAnalysisTab('workload')}
                    className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-all ${
                      activeAnalysisTab === 'workload'
                        ? 'border border-amber-400/35 bg-amber-400/10 text-amber-100'
                        : 'border border-transparent text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    Workload
                  </button>
                </div>

                {activeAnalysisTab === 'analysis' && (
                  <div className="max-h-96 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                        Summary
                      </p>
                      <p className="mt-2 text-sm text-slate-100">{scheduleAnalysis.summary}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                        Study Plan
                      </p>
                      <div className="mt-2 text-sm text-slate-100">
                        {typeof scheduleAnalysis.studyPlan === 'string' ? (
                          <p>{scheduleAnalysis.studyPlan}</p>
                        ) : (
                          <div className="space-y-3">
                            {scheduleAnalysis.studyPlan.phases?.map((phase, idx) => (
                              <div key={idx} className="rounded-md border border-emerald-400/20 bg-emerald-400/5 p-3">
                                <h4 className="font-semibold text-emerald-300">{phase.name}</h4>
                                <p className="mt-1 text-xs text-slate-300"><strong>Focus:</strong> {phase.focus}</p>
                                <p className="mt-1 text-xs text-slate-300"><strong>Activities:</strong> {phase.activities}</p>
                                <p className="mt-1 text-xs text-slate-300"><strong>Checkpoint:</strong> {phase.checkpoint}</p>
                              </div>
                            ))}
                            {scheduleAnalysis.studyPlan.key_elements && (
                              <div>
                                <h4 className="font-semibold text-emerald-200 mb-2">Key Elements:</h4>
                                <ul className="space-y-1">
                                  {scheduleAnalysis.studyPlan.key_elements.map((elem, idx) => (
                                    <li key={idx} className="flex gap-2 text-xs text-slate-300">
                                      <span className="text-emerald-400">✓</span>
                                      <span>{elem}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                        Time Management
                      </p>
                      <div className="mt-2 text-sm text-slate-100">
                        {typeof scheduleAnalysis.timeManagement === 'string' ? (
                          <p>{scheduleAnalysis.timeManagement}</p>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold text-amber-200">Daily Schedule</h4>
                              <p className="mt-2 text-xs text-slate-300">{scheduleAnalysis.timeManagement.daily_schedule_template}</p>
                            </div>
                            {scheduleAnalysis.timeManagement.tips && (
                              <div>
                                <h4 className="font-semibold text-amber-200 mb-2">Tips:</h4>
                                <ul className="space-y-2">
                                  {scheduleAnalysis.timeManagement.tips.map((tip, idx) => (
                                    <li key={idx} className="flex gap-2 text-xs text-slate-300">
                                      <span className="text-amber-400">→</span>
                                      <span>{tip}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
                        Risks & Issues
                      </p>
                      <ul className="mt-2 space-y-1">
                        {scheduleAnalysis.risks.map((risk, idx) => (
                          <li key={idx} className="flex gap-2 text-sm text-slate-100">
                            <span className="text-red-400">⚠</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                        Recommendations
                      </p>
                      <ul className="mt-2 space-y-1">
                        {scheduleAnalysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex gap-2 text-sm text-slate-100">
                            <span className="text-cyan-400">→</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {activeAnalysisTab === 'tips' && (
                  <div className="max-h-96 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-4">
                    <ul className="space-y-2">
                      {studyTips.map((tip, idx) => (
                        <li key={idx} className="flex gap-3 text-sm text-slate-100">
                          <span className="text-emerald-400 font-bold shrink-0">{idx + 1}.</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeAnalysisTab === 'workload' && workloadEstimate && (
                  <div className="max-h-96 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-4 space-y-3">
                    <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                        Total Hours
                      </p>
                      <p className="mt-2 text-2xl font-bold text-white">{workloadEstimate.totalHours}h</p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Difficulty Level
                      </p>
                      <p
                        className={`mt-2 text-lg font-bold capitalize ${
                          workloadEstimate.difficulty === 'light'
                            ? 'text-emerald-300'
                            : workloadEstimate.difficulty === 'moderate'
                              ? 'text-amber-300'
                              : 'text-red-300'
                        }`}
                      >
                        {workloadEstimate.difficulty}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                        Recommendation
                      </p>
                      <p className="mt-2 text-sm text-slate-100">{workloadEstimate.recommendation}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Original markdown display */}
          <section className="panel-shell p-5">
            <div className="flex items-start justify-between gap-4 border-b border-white/20 pb-4">
              <div>
                <p className="section-label text-slate-400">Raw Schedule</p>
                <h3 className="mt-2 text-sm font-semibold text-slate-100">Markdown Content</h3>
              </div>
            </div>

            <div className="mt-4 max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-4">
              <div className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-100">
                {schedulePlan.content.split('\n').map((line, idx) => {
                  if (line.startsWith('# ')) {
                    return (
                      <h1 key={idx} className="mb-3 text-lg font-bold text-cyan-100">
                        {line.substring(2)}
                      </h1>
                    );
                  }
                  if (line.startsWith('## ')) {
                    return (
                      <h2 key={idx} className="mb-2 text-base font-semibold text-cyan-200">
                        {line.substring(3)}
                      </h2>
                    );
                  }
                  if (line.startsWith('### ')) {
                    return (
                      <h3 key={idx} className="mb-2 text-sm font-semibold text-slate-300">
                        {line.substring(4)}
                      </h3>
                    );
                  }
                  if (line.startsWith('- ')) {
                    return (
                      <div key={idx} className="mb-1 ml-4 flex gap-2">
                        <span className="text-emerald-400">•</span>
                        <span>{line.substring(2)}</span>
                      </div>
                    );
                  }
                  if (line.trim() === '') {
                    return <div key={idx} className="mb-2" />;
                  }
                  return (
                    <p key={idx} className="mb-2">
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          {/* No plan loaded view */}
          <section className="panel-shell p-5">
            <div className="flex items-start justify-between gap-4 border-b border-white/20 pb-4">
              <div>
                <p className="section-label text-slate-400">Schedule & AI Analysis</p>
                <h2 className="mt-3 text-2xl font-bold text-white">No plan loaded</h2>
                <p className="mt-2 max-w-sm text-sm text-slate-300">
                  Import a markdown file to view your schedule and get AI-powered analysis with Gemini.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={importPlan}
                className="w-full rounded-lg border border-emerald-400/35 bg-emerald-400/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100 transition-all hover:border-emerald-400/50 hover:bg-emerald-400/15"
              >
                + Import Plan
              </button>
            </div>

            <div className="mt-6 rounded-lg border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Features</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                <li className="flex gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>Import any markdown (.md) file</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>AI-powered schedule analysis with Gemini</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>Get study tips and time management advice</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>Workload estimation and difficulty assessment</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>Risk identification and recommendations</span>
                </li>
              </ul>
            </div>
          </section>
        </>
      )}
    </aside>
  );
}
