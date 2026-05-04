import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvPersistConfig } from '@/storage/mmkv';

export interface Script {
  id: string;
  title: string;
  content: string;
  language: string;
  estimatedDurationSec: number;
  createdAt: number;
  updatedAt: number;
}

interface ScriptsState {
  scripts: Script[];
  addScript: (script: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateScript: (id: string, updates: Partial<Script>) => void;
  deleteScript: (id: string) => void;
  getScript: (id: string) => Script | undefined;
}

export const useScriptsStore = create<ScriptsState>()(
  persist(
    (set, get) => ({
      scripts: [],

      addScript: (script) => {
        const now = Date.now();
        const newScript: Script = {
          ...script,
          id: `script_${now}_${Math.random().toString(36).slice(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ scripts: [newScript, ...state.scripts] }));
      },

      updateScript: (id, updates) => {
        set((state) => ({
          scripts: state.scripts.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
          ),
        }));
      },

      deleteScript: (id) => {
        set((state) => ({
          scripts: state.scripts.filter((s) => s.id !== id),
        }));
      },

      getScript: (id) => get().scripts.find((s) => s.id === id),
    }),
    {
      name: 'scripts',
      storage: createJSONStorage(() => mmkvPersistConfig),
    }
  )
);
