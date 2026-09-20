/**
 * Saved scenarios: named snapshots of a calculator's inputs, stored only on the device.
 * The storage backend is injected so every rule below is testable without a phone.
 * Anything read back is treated as untrusted: corrupt or unexpected data is skipped, never thrown.
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const TOOL_IDS = ["cost-per-mile", "load-profit", "detention", "ifta", "per-diem"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export interface SavedScenario {
  id: string;
  toolId: ToolId;
  name: string;
  /** Epoch milliseconds. */
  savedAt: number;
  /** The calculator's own snapshot; each screen sanitises it on load. */
  state: unknown;
}

export const STORAGE_KEY = "haulnumbers.scenarios.v1";
export const MAX_PER_TOOL = 30;
export const NAME_MAX_LENGTH = 40;

export type SaveResult = { ok: true; scenario: SavedScenario; replaced: boolean } | { ok: false; error: string };

const isToolId = (x: unknown): x is ToolId => typeof x === "string" && (TOOL_IDS as readonly string[]).includes(x);

function isScenario(x: unknown): x is SavedScenario {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Record<string, unknown>;
  return typeof s.id === "string" && s.id !== "" && isToolId(s.toolId) && typeof s.name === "string" && s.name !== "" &&
    typeof s.savedAt === "number" && Number.isFinite(s.savedAt) && "state" in s;
}

export class ScenarioStore {
  private queue: Promise<unknown> = Promise.resolve();
  private counter = 0;

  constructor(
    private readonly kv: KeyValueStore,
    private readonly now: () => number = Date.now,
  ) {}

  /** Runs one read-modify-write at a time, so two quick taps on Save cannot overwrite each other. */
  private serial<T>(job: () => Promise<T>): Promise<T> {
    const run = this.queue.then(job, job);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async readAll(): Promise<SavedScenario[]> {
    try {
      const raw = await this.kv.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isScenario) : [];
    } catch {
      return [];
    }
  }

  private writeAll(list: SavedScenario[]): Promise<void> {
    return this.kv.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  /** Newest first. */
  async list(toolId: ToolId): Promise<SavedScenario[]> {
    return this.serial(async () => (await this.readAll()).filter((s) => s.toolId === toolId).sort((a, b) => b.savedAt - a.savedAt));
  }

  /** Saving under an existing name for the same calculator replaces it. */
  save(toolId: ToolId, rawName: string, state: unknown): Promise<SaveResult> {
    const name = rawName.trim();
    if (name === "") return Promise.resolve({ ok: false, error: "Enter a name for this scenario." });
    if (name.length > NAME_MAX_LENGTH) return Promise.resolve({ ok: false, error: `Use ${NAME_MAX_LENGTH} characters or fewer.` });
    return this.serial(async (): Promise<SaveResult> => {
      const all = await this.readAll();
      const existing = all.find((s) => s.toolId === toolId && s.name.toLowerCase() === name.toLowerCase());
      const forTool = all.filter((s) => s.toolId === toolId).length;
      if (!existing && forTool >= MAX_PER_TOOL) return { ok: false, error: `You can save up to ${MAX_PER_TOOL} scenarios per calculator. Delete one first.` };
      const scenario: SavedScenario = {
        id: existing?.id ?? `${this.now().toString(36)}-${(this.counter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        toolId, name, savedAt: this.now(), state,
      };
      await this.writeAll(existing ? all.map((s) => (s.id === existing.id ? scenario : s)) : [...all, scenario]);
      return { ok: true, scenario, replaced: Boolean(existing) };
    });
  }

  remove(id: string): Promise<void> {
    return this.serial(async () => { await this.writeAll((await this.readAll()).filter((s) => s.id !== id)); });
  }

  /** Privacy control: wipe everything this app has saved. */
  clearAll(): Promise<void> {
    return this.serial(() => this.kv.removeItem(STORAGE_KEY));
  }
}
