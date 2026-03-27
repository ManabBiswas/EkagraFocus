declare module '*.css' {
  const content: string;
  export default content;
}

interface ScheduleAnalysis {
  summary: string;
  recommendations: string[];
  studyPlan: string;
  timeManagement: string;
  risks: string[];
}

interface WorkloadEstimate {
  totalHours: number;
  difficulty: 'light' | 'moderate' | 'heavy';
  recommendation: string;
}

interface ElectronAPI {
  importPlanFile: () => Promise<{ filePath: string; fileName: string; content: string } | null>;
  readPlanFile: (filePath: string) => Promise<{ filePath: string; fileName: string; content: string } | null>;
  setGeminiApiKey: (apiKey: string) => Promise<{ success: boolean; message?: string }>;
  analyzeSchedule: (mdContent: string) => Promise<{ success: boolean; data?: ScheduleAnalysis; error?: string }>;
  generateStudyTips: (mdContent: string) => Promise<{ success: boolean; data?: string[]; error?: string }>;
  estimateWorkload: (mdContent: string) => Promise<{ success: boolean; data?: WorkloadEstimate; error?: string }>;
  getStoredApiKey: () => Promise<{ success: boolean; key?: string | null }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
