import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { PlanAnalysisView } from './PlanAnalysisView';
import { WeeklyProgressDashboard } from './WeeklyProgressDashboard';
import { MilestoneTracker } from './MilestoneTracker';

const parseJsonRecord = (value: string | null | undefined): Record<string, number> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, number>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const parseJsonList = (value: string | null | undefined): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as string[];
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
};

export function PlanViewer() {
  const {
    schedulePlan,
    setSchedulePlan,
    setScheduleAnalysis,
    setPlanSummary,
    setPlanInsight,
    setWeekTasks,
    setMilestones,
    setWeeklyProgressView,
    addNotification,
  } = useStore();

  const refreshPlanData = async () => {
    if (!window.api?.plan) return;

    const [metadata, analysis, milestones, weekTasks, weeklyProgress] = await Promise.all([
      window.api.plan.getActiveMetadata(),
      window.api.plan.getAnalysis(),
      window.api.plan.getMilestones(),
      window.api.plan.getCurrentWeekTasks(),
      window.api.plan.recalculateWeeklyProgress(),
    ]);

    if (metadata) {
      setPlanSummary({
        planId: metadata.plan_id,
        title: metadata.title,
        startDate: metadata.start_date,
        endDate: metadata.end_date,
        durationDays: metadata.duration_days,
        totalHoursEstimated: metadata.total_hours_estimated,
        weeklyHoursAvg: metadata.weekly_hours_avg,
      });
    }

    if (analysis) {
      const risks = parseJsonList(analysis.risks).map((text) => ({
        text,
        severity: /burnout|unsustainable|overlap|risk/i.test(text)
          ? ('high' as const)
          : ('medium' as const),
      }));

      setPlanInsight({
        totalHours: analysis.total_hours,
        weeklyAverage: analysis.weekly_average,
        subjectBreakdown: parseJsonRecord(analysis.subject_breakdown),
        risks,
        suggestions: parseJsonList(analysis.suggestions),
        feasibilityScore: analysis.feasibility_score || 0,
        difficultyLevel: analysis.difficulty_level || 'moderate',
      });
    }

    setMilestones(
      milestones.map((item) => ({
        milestoneId: item.milestone_id,
        weekNumber: item.week_number,
        description: item.description,
        completionStatus: item.completion_status,
        completedAt: item.completed_at,
      }))
    );

    setWeekTasks(
      weekTasks.map((item) => ({
        taskId: item.task_id,
        weekNumber: item.week_number,
        subject: item.subject,
        type: item.task_type,
        hoursAllocated: item.hours_allocated,
        description: item.description || '',
      }))
    );

    if (weeklyProgress) {
      setWeeklyProgressView({
        weekNumber: weeklyProgress.week_number,
        weekStartDate: weeklyProgress.week_start_date,
        weekEndDate: weeklyProgress.week_end_date,
        hoursCompleted: weeklyProgress.hours_completed,
        hoursTarget: weeklyProgress.hours_target,
        completionPercentage: weeklyProgress.completion_percentage,
        onTrack: weeklyProgress.on_track === 1,
        subjects: parseJsonRecord(weeklyProgress.subjects_json),
        variance: parseJsonRecord(weeklyProgress.variance_json),
      });
    }
  };

  useEffect(() => {
    refreshPlanData().catch((error) => {
      console.error('[PlanViewer] Failed to load plan dashboard state:', error);
    });
  }, []);

  const importPlan = async () => {
    if (!window.api?.file) {
      addNotification({
        id: `notif-${Date.now()}`,
        type: 'error',
        title: 'Error',
        message: 'File import API not available',
        duration: 5000,
      });
      return;
    }

    try {
      const result: {
        success?: boolean;
        error?: string;
        data?: {
          fileName: string;
          filePath: string;
          content: string;
          parseResult?: {
            tasksImported: number;
            details: string;
          };
        };
      } = await window.api.file.importPlanFile();

      if (!result?.success || !result.data) {
        throw new Error(result?.error || 'Failed to import plan');
      }

      const { fileName, filePath, content, parseResult } = result.data;

      setSchedulePlan({
        fileName,
        filePath,
        content,
        importedAt: new Date().toISOString(),
      });

      await refreshPlanData();

      setScheduleAnalysis({
        summary: parseResult?.details || 'Plan imported and analyzed.',
        recommendations: [],
        studyPlan: content,
        timeManagement: 'Use the weekly dashboard to track actual vs planned hours.',
        risks: [],
      });

      addNotification({
        id: `notif-${Date.now()}`,
        type: 'success',
        title: 'Plan Imported',
        message: parseResult?.details || `Imported ${fileName}`,
        duration: 5000,
      });
    } catch (error) {
      console.error('[PlanViewer] Error importing plan:', error);
      addNotification({
        id: `notif-${Date.now()}`,
        type: 'error',
        title: 'Import Failed',
        message: error instanceof Error ? error.message : 'Could not import file',
        duration: 5000,
      });
    }
  };

  if (!schedulePlan) {
    return (
      <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-2">
        <section className="panel-shell p-5">
          <div className="flex flex-col gap-4 text-center">
            <p className="section-label text-slate-400">Study Plan</p>
            <h3 className="text-sm font-semibold text-slate-100">No Plan Imported Yet</h3>
            <p className="text-xs text-slate-400">Import your markdown plan to run full architecture analysis.</p>

            <button
              onClick={importPlan}
              className="mt-4 rounded-lg border border-emerald-400/35 bg-emerald-400/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100 transition-colors hover:border-emerald-400/50 hover:bg-emerald-400/15"
            >
              Import Schedule
            </button>
          </div>
        </section>
      </aside>
    );
  }

  return (
    <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-2">
      <section className="panel-shell p-5">
        <div className="flex items-start justify-between gap-4 border-b border-white/20 pb-4">
          <div>
            <p className="section-label text-emerald-400">Study Plan</p>
            <h2 className="mt-3 text-lg font-bold text-white truncate">{schedulePlan.fileName}</h2>
            <p className="mt-1 text-xs text-slate-400">
              Imported {new Date(schedulePlan.importedAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={importPlan}
            className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-cyan-200 transition-colors hover:bg-cyan-400/20"
          >
            Reimport
          </button>
        </div>

        <div className="mt-4 max-h-52 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-4">
          <pre className="whitespace-pre-wrap wrap-break-word text-xs text-slate-300 font-mono">
            {schedulePlan.content.substring(0, 1200)}
            {schedulePlan.content.length > 1200 && '\n... (truncated)'}
          </pre>
        </div>
      </section>

      <PlanAnalysisView />
      <WeeklyProgressDashboard />
      <MilestoneTracker />
    </aside>
  );
}

