// src/store/gameStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface MainHero {
  id: number;
  name: string;
  zodiac: string;
  image: string;
  level: number;
}

interface GameState {
  mainHero: MainHero | null;
  userName: string;
  balanceGFT: number;
  inventory: Array<{
    id: number;
    name: string;
    icon: string;
    amount: number;
  }>;

  setMainHero: (hero: MainHero) => void;
  setUserName: (name: string) => void;
  addBalance: (amount: number) => void;
  updateInventory: (inventory: GameState['inventory']) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      mainHero: null,
      userName: '',
      balanceGFT: 12458,
      inventory: [
        { id: 1, name: "Золотой Кристалл", icon: "🔮", amount: 12 },
        { id: 2, name: "Энергетический Сфер", icon: "⚡", amount: 8 },
        { id: 3, name: "Руна Удачи", icon: "🪄", amount: 3 },
      ],

      setMainHero: (hero: MainHero) => set({ mainHero: hero }),
      setUserName: (name: string) => set({ userName: name }),
      addBalance: (amount: number) => set((state: GameState) => ({
        balanceGFT: state.balanceGFT + amount 
      })),
      updateInventory: (newInventory: GameState['inventory']) => set({ inventory: newInventory }),
    }),
    {
      name: 'gft-arena-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);