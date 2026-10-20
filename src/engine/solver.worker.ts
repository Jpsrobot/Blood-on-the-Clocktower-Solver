import { runSearch } from "./search";
import type { GameSnapshot } from "../types";
import type { SearchOptions } from "./model";
self.onmessage = (event: MessageEvent<{ snapshot: GameSnapshot; options?: Partial<SearchOptions>; request: number }>) => {
  const { snapshot, options, request } = event.data;
  try {
    const result = runSearch(snapshot, options, (checked, unique) => self.postMessage({ type: "progress", request, checked, unique }));
    self.postMessage({ type: "result", request, result });
  } catch (error) { self.postMessage({ type: "error", request, message: error instanceof Error ? error.message : String(error) }); }
};
