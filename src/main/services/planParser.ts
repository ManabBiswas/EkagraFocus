import {
  savePlanImport,
  type PlanImportAnalysisInput,
  type PlanImportBundle,
  type PlanImportMilestoneInput,
  type PlanImportPhaseInput,
  type PlanImportTaskInput,
} from '../db/queries';
import { llmService } from './llmService';

interface ParsedMetadata {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  maxWeek: number;
}

interface ParseContext {
  currentPhaseNumber: number;
  currentPhaseName: string;
  currentWeek: number;
}

export interface ProcessPlanResult {
  success: boolean;
  tasksCount: number;
  details: string;
  planId?: string;
  metadata?: {
    title: string;
    durationDays: number;
    weeks: number;
  };
  analysis?: {
    totalHours: number;
    weeklyAverage: number;
    feasibilityScore?: number;
  };
  error?: string;
}

const TITLE_RE = /^#\s+(.+)/;
const PHASE_RE = /^##+\s*(?:phase\s*(\d+)\s*[:-]?\s*)?(.*)$/i;
const WEEK_RE = /week\s*(\d+)(?:\s*[-–]\s*(\d+))?/i;
const TASK_BULLET_RE = /^[-*•]\s*(?:\[\s?\]\s*)?(?:\*\*)?(.+?)(?:\*\*)?$/i;
const DURATION_RE = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|min|mins|minute|minutes)(?:\s*\/\s*day|\s*per\s*day)?/i;
const DURATION_PER_DAY_RE = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|min|mins|minute|minutes)\s*(?:\/\s*day|per\s*day)/i;
const MILESTONE_RE = /week\s*(\d+)\s*(?:checkpoint|milestone)?\s*[:-]\s*(.+)/i;

function getWeekDateRange(startDate: string, weekNumber: number): { start: string; end: string } {
  const base = new Date(startDate);
  base.setDate(base.getDate() + (weekNumber - 1) * 7);
  const end = new Date(base);
  end.setDate(end.getDate() + 6);
  return {
    start: base.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDurationHours(raw: string): number | null {
  const match = raw.match(DURATION_RE);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const asHours = unit.startsWith('m') ? value / 60 : value;

  if (DURATION_PER_DAY_RE.test(raw)) {
    return asHours * 7;
  }

  return asHours;
}

function inferTaskType(text: string): PlanImportTaskInput['task_type'] {
  const lower = text.toLowerCase();
  if (lower.includes('project') || lower.includes('build')) return 'project';
  if (lower.includes('leetcode')) return 'leetcode';
  if (lower.includes('practice') || lower.includes('problem')) return 'practice';
  if (lower.includes('study') || lower.includes('theory')) return 'study';
  return 'other';
}

function inferSubject(text: string): string {
  return text
    .replace(DURATION_RE, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMetadata(markdownContent: string, fallbackStartDate: string): ParsedMetadata {
  const lines = markdownContent.split('\n');

  let title = 'Imported Study Plan';
  let maxWeek = 1;

  for (const line of lines) {
    const trimmed = line.trim();

    if (TITLE_RE.test(trimmed)) {
      title = trimmed.match(TITLE_RE)?.[1]?.trim() || title;
      continue;
    }

    const weekMatch = trimmed.match(WEEK_RE);
    if (weekMatch) {
      const weekStart = Number(weekMatch[1]);
      const weekEnd = Number(weekMatch[2] || weekMatch[1]);
      maxWeek = Math.max(maxWeek, weekStart, weekEnd);
    }
  }

  const startDate = fallbackStartDate;
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + maxWeek * 7 - 1);

  return {
    title,
    description: `Imported from markdown (${maxWeek} week plan)`,
    startDate,
    endDate: toIsoDate(end),
    durationDays: maxWeek * 7,
    maxWeek,
  };
}

function parseStructure(markdownContent: string, metadata: ParsedMetadata): {
  phases: PlanImportPhaseInput[];
  tasks: PlanImportTaskInput[];
  milestones: PlanImportMilestoneInput[];
} {
  const lines = markdownContent.split('\n');
  const phases: PlanImportPhaseInput[] = [];
  const tasks: PlanImportTaskInput[] = [];
  const milestones: PlanImportMilestoneInput[] = [];

  const context: ParseContext = {
    currentPhaseNumber: 1,
    currentPhaseName: 'Phase 1',
    currentWeek: 1,
  };

  const phaseWeekBounds: Record<number, { start: number; end: number }> = {
    1: { start: 1, end: 1 },
  };

  const registerPhase = (phaseNumber: number, name: string): void => {
    context.currentPhaseNumber = phaseNumber;
    context.currentPhaseName = name || `Phase ${phaseNumber}`;
    if (!phaseWeekBounds[phaseNumber]) {
      phaseWeekBounds[phaseNumber] = {
        start: context.currentWeek,
        end: context.currentWeek,
      };
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const phaseMatch = trimmed.match(PHASE_RE);
    if (phaseMatch && trimmed.toLowerCase().includes('phase')) {
      const detectedNumber = Number(phaseMatch[1] || context.currentPhaseNumber + 1);
      const detectedName = phaseMatch[2]?.trim() || `Phase ${detectedNumber}`;
      registerPhase(detectedNumber, detectedName);
      continue;
    }

    const weekMatch = trimmed.match(WEEK_RE);
    if (weekMatch) {
      const weekStart = Number(weekMatch[1]);
      const weekEnd = Number(weekMatch[2] || weekMatch[1]);
      context.currentWeek = weekStart;

      const bounds = phaseWeekBounds[context.currentPhaseNumber] || { start: weekStart, end: weekStart };
      bounds.start = Math.min(bounds.start, weekStart);
      bounds.end = Math.max(bounds.end, weekEnd);
      phaseWeekBounds[context.currentPhaseNumber] = bounds;

      const milestoneMatch = trimmed.match(MILESTONE_RE);
      if (milestoneMatch) {
        milestones.push({
          week_number: Number(milestoneMatch[1]),
          description: milestoneMatch[2].trim(),
          success_criteria: null,
        });
      }
      continue;
    }

    const explicitMilestoneMatch = trimmed.match(MILESTONE_RE);
    if (explicitMilestoneMatch) {
      milestones.push({
        week_number: Number(explicitMilestoneMatch[1]),
        description: explicitMilestoneMatch[2].trim(),
        success_criteria: null,
      });
      continue;
    }

    if (!TASK_BULLET_RE.test(trimmed)) continue;

    const bulletText = trimmed.match(TASK_BULLET_RE)?.[1]?.trim() || '';
    const durationHours = parseDurationHours(bulletText);
    if (!durationHours || durationHours <= 0) continue;

    const { start, end } = getWeekDateRange(metadata.startDate, context.currentWeek);
    const subject = inferSubject(bulletText) || `Week ${context.currentWeek} Task`;

    tasks.push({
      phase_number: context.currentPhaseNumber,
      week_number: context.currentWeek,
      date_start: start,
      date_end: end,
      subject,
      task_type: inferTaskType(bulletText),
      hours_allocated: Math.round(durationHours * 100) / 100,
      description: bulletText,
      deliverables: null,
      checkpoint: null,
    });
  }

  const detectedPhaseNumbers = Object.keys(phaseWeekBounds).map(Number);
  detectedPhaseNumbers.sort((a, b) => a - b);

  for (const phaseNumber of detectedPhaseNumbers) {
    const bounds = phaseWeekBounds[phaseNumber];
    const phaseTasks = tasks.filter((task) => task.phase_number === phaseNumber);
    const phaseHours = phaseTasks.reduce((sum, task) => sum + task.hours_allocated, 0);

    phases.push({
      phase_number: phaseNumber,
      name: phaseNumber === 1 ? context.currentPhaseName : `Phase ${phaseNumber}`,
      description: null,
      week_start: bounds.start,
      week_end: Math.max(bounds.end, bounds.start),
      total_hours_allocated: Math.round(phaseHours * 100) / 100,
      focus_areas: null,
    });
  }

  if (phases.length === 0) {
    phases.push({
      phase_number: 1,
      name: 'Phase 1',
      description: null,
      week_start: 1,
      week_end: metadata.maxWeek,
      total_hours_allocated: Math.round(tasks.reduce((sum, task) => sum + task.hours_allocated, 0) * 100) / 100,
      focus_areas: null,
    });

    tasks.forEach((task) => {
      task.phase_number = 1;
    });
  }

  return { phases, tasks, milestones };
}

function buildFallbackAnalysis(metadata: ParsedMetadata, tasks: PlanImportTaskInput[]): PlanImportAnalysisInput {
  const totalHours = tasks.reduce((sum, task) => sum + task.hours_allocated, 0);
  const weeklyAverage = metadata.maxWeek > 0 ? totalHours / metadata.maxWeek : totalHours;

  const subjectBreakdown: Record<string, number> = {};
  for (const task of tasks) {
    subjectBreakdown[task.subject] = Math.round(((subjectBreakdown[task.subject] || 0) + task.hours_allocated) * 100) / 100;
  }

  const weekHours: Record<number, number> = {};
  for (const task of tasks) {
    weekHours[task.week_number] = (weekHours[task.week_number] || 0) + task.hours_allocated;
  }

  const risks: string[] = [];
  for (const [week, hours] of Object.entries(weekHours)) {
    if (hours > 70) {
      risks.push(`Week ${week}: ${Math.round(hours)}h workload may cause burnout.`);
    }
  }
  if (weeklyAverage > 56) {
    risks.push('Weekly average exceeds 56h. Consider one weekly rest day.');
  }

  const suggestions: string[] = [
    'Add at least one rest day per week to improve sustainability.',
    'Front-load core subjects and reserve buffer time for revisions.',
    'Track planned vs completed hours each week and rebalance quickly.',
  ];

  const feasibilityScore = Math.max(40, Math.min(95, Math.round(100 - Math.max(0, weeklyAverage - 35) * 1.4)));
  const difficultyLevel = weeklyAverage > 60 ? 'intense' : weeklyAverage > 45 ? 'challenging' : 'moderate';

  return {
    total_hours: Math.round(totalHours * 100) / 100,
    weekly_average: Math.round(weeklyAverage * 100) / 100,
    subject_breakdown: subjectBreakdown,
    risks,
    suggestions,
    difficulty_level: difficultyLevel,
    feasibility_score: feasibilityScore,
  };
}

function parseJsonPayload(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim()) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function runLlmAnalysisIfAvailable(
  metadata: ParsedMetadata,
  phases: PlanImportPhaseInput[],
  tasks: PlanImportTaskInput[],
  fallback: PlanImportAnalysisInput
): Promise<PlanImportAnalysisInput> {
  if (!llmService.isInitialized()) {
    return fallback;
  }

  try {
    const compactContext = {
      title: metadata.title,
      durationDays: metadata.durationDays,
      maxWeek: metadata.maxWeek,
      phases: phases.map((phase) => ({
        name: phase.name,
        weekStart: phase.week_start,
        weekEnd: phase.week_end,
        totalHours: phase.total_hours_allocated,
      })),
      taskSample: tasks.slice(0, 80).map((task) => ({
        week: task.week_number,
        subject: task.subject,
        type: task.task_type,
        hours: task.hours_allocated,
      })),
      totals: {
        totalHours: fallback.total_hours,
        weeklyAverage: fallback.weekly_average,
      },
    };

    const prompt = [
      'You are a study plan analyzer.',
      'Return strict JSON with keys: total_hours, weekly_average, subject_breakdown, risks, suggestions, difficulty_level, feasibility_score.',
      'Keep risks and suggestions concise arrays.',
      'Context:',
      JSON.stringify(compactContext),
    ].join('\n');

    const raw = await llmService.generateResponse(prompt, {
      temperature: 0.3,
      maxTokens: 700,
    });

    const parsed = parseJsonPayload(raw);
    if (!parsed) return fallback;

    const subjectBreakdown = parsed.subject_breakdown as Record<string, number> | undefined;
    const risks = Array.isArray(parsed.risks) ? parsed.risks.map((item) => String(item)) : fallback.risks;
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map((item) => String(item))
      : fallback.suggestions;

    return {
      total_hours: Number(parsed.total_hours) || fallback.total_hours,
      weekly_average: Number(parsed.weekly_average) || fallback.weekly_average,
      subject_breakdown: subjectBreakdown && Object.keys(subjectBreakdown).length > 0 ? subjectBreakdown : fallback.subject_breakdown,
      risks,
      suggestions,
      difficulty_level: String(parsed.difficulty_level || fallback.difficulty_level || 'moderate'),
      feasibility_score: Number(parsed.feasibility_score) || fallback.feasibility_score,
    };
  } catch {
    return fallback;
  }
}

function buildImportBundle(
  metadata: ParsedMetadata,
  phases: PlanImportPhaseInput[],
  tasks: PlanImportTaskInput[],
  milestones: PlanImportMilestoneInput[],
  analysis: PlanImportAnalysisInput,
  filePath?: string
): PlanImportBundle {
  return {
    metadata: {
      title: metadata.title,
      description: metadata.description,
      start_date: metadata.startDate,
      end_date: metadata.endDate,
      duration_days: metadata.durationDays,
      total_hours_estimated: analysis.total_hours,
      weekly_hours_avg: analysis.weekly_average,
      file_path: filePath || null,
      file_content: null,
    },
    phases,
    tasks,
    milestones,
    analysis,
    initialWeek: 1,
    initialPhase: 1,
  };
}

export async function processPlanFile(
  markdownContent: string,
  baseDate: string = new Date().toISOString().split('T')[0],
  filePath?: string
): Promise<ProcessPlanResult> {
  try {
    const metadata = parseMetadata(markdownContent, baseDate);
    const { phases, tasks, milestones } = parseStructure(markdownContent, metadata);

    if (tasks.length === 0) {
      return {
        success: false,
        tasksCount: 0,
        details: 'No valid tasks were detected in the imported file.',
        error: 'No parsable task blocks found',
      };
    }

    const fallbackAnalysis = buildFallbackAnalysis(metadata, tasks);
    const analysis = await runLlmAnalysisIfAvailable(metadata, phases, tasks, fallbackAnalysis);

    const bundle = buildImportBundle(metadata, phases, tasks, milestones, analysis, filePath);
    bundle.metadata.file_content = markdownContent;

    const persisted = savePlanImport(bundle);

    return {
      success: true,
      tasksCount: persisted.importedTasks,
      details: `Imported ${persisted.importedTasks} tasks across ${metadata.maxWeek} weeks (${persisted.importedMilestones} milestones).`,
      planId: persisted.planId,
      metadata: {
        title: metadata.title,
        durationDays: metadata.durationDays,
        weeks: metadata.maxWeek,
      },
      analysis: {
        totalHours: analysis.total_hours,
        weeklyAverage: analysis.weekly_average,
        feasibilityScore: analysis.feasibility_score,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parser error';
    return {
      success: false,
      tasksCount: 0,
      details: `Import failed: ${message}`,
      error: message,
    };
  }
}

