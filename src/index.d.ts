declare module '*.css' {
  const content: string;
  export default content;
}

interface ElectronAPI {
  importPlanFile: () => Promise<{ filePath: string; fileName: string; content: string } | null>;
  readPlanFile: (filePath: string) => Promise<{ filePath: string; fileName: string; content: string } | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
