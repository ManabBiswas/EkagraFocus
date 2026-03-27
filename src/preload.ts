// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  importPlanFile: () => ipcRenderer.invoke('import-plan-file'),
  readPlanFile: (filePath: string) => ipcRenderer.invoke('read-plan-file', filePath),
  setGeminiApiKey: (apiKey: string) => ipcRenderer.invoke('set-gemini-api-key', apiKey),
  analyzeSchedule: (mdContent: string) => ipcRenderer.invoke('analyze-schedule', mdContent),
  generateStudyTips: (mdContent: string) => ipcRenderer.invoke('generate-study-tips', mdContent),
  estimateWorkload: (mdContent: string) => ipcRenderer.invoke('estimate-workload', mdContent),
  getStoredApiKey: () => ipcRenderer.invoke('get-stored-api-key'),
});

export {};
