import { getTuning, resetTuning, saveTuning } from '../config/tuning';

type Gui = {
  destroy(): void;
  addFolder(name: string): Gui;
  add(obj: object, key: string): { step(n: number): unknown; updateDisplay(): unknown };
  controllersRecursive(): { updateDisplay(): unknown }[];
  close(): unknown;
  domElement: HTMLElement;
};

const GROUPS = ['heli', 'rope', 'rules', 'weather', 'ship', 'difficulty'] as const;
let gui: Gui | null = null;

function addNumbers(folder: Gui, obj: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') folder.add(obj, k).step(Math.abs(v) < 1 ? 0.01 : Math.abs(v) < 20 ? 0.05 : 1);
    else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === 'object') addNumbers(folder.addFolder(`${k}[${i}]`), item as Record<string, unknown>);
      });
    } else if (v && typeof v === 'object') addNumbers(folder.addFolder(k), v as Record<string, unknown>);
  }
}

/** `?tune=1` veya Settings'te sürüme 7 dokunuş: lil-gui paneli (dinamik import). Tekrar çağrılırsa kapanır. */
export async function toggleTuningPanel(): Promise<void> {
  if (gui) {
    gui.destroy();
    gui = null;
    return;
  }
  const mod = (await import('lil-gui')) as unknown as { default: new (o: { title: string }) => Gui };
  const g = new mod.default({ title: 'Tuning' });
  const T = getTuning() as unknown as Record<string, Record<string, unknown>>;
  for (const name of GROUPS) addNumbers(g.addFolder(name), T[name]);
  const actions = {
    Save: () => saveTuning(),
    Reset: () => {
      resetTuning();
      for (const c of g.controllersRecursive()) c.updateDisplay();
    },
    'Copy JSON': () => {
      void navigator.clipboard?.writeText(JSON.stringify(getTuning(), null, 2));
    },
  };
  for (const k of Object.keys(actions)) g.add(actions, k);
  g.close();
  g.domElement.style.zIndex = '1000';
  gui = g;
}
