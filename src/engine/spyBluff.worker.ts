import type { GameSnapshot } from "../types";
import { runSpyBluffAdvisor } from "./spyBluff";

type Request = {
  snapshot: GameSnapshot;
  request: number;
  deep?: boolean;
};

self.onmessage = (event: MessageEvent<Request>) => {
  const { snapshot, request, deep = false } = event.data;
  try {
    const result = runSpyBluffAdvisor(snapshot, deep, (checked, unique) => {
      self.postMessage({ type: "progress", request, checked, unique });
    });
    self.postMessage({ type: "result", request, result });
  } catch (error) {
    self.postMessage({
      type: "error",
      request,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
