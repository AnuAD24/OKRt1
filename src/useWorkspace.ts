import { useEffect, useState } from "react";
import { uid, type CheckIn, type Cycle, type KeyResult, type Objective, type Workspace } from "./model";
import { STORAGE_KEY, seedWorkspace } from "./seed";

function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedWorkspace();
    const parsed = JSON.parse(raw) as Workspace;
    if (!Array.isArray(parsed.cycles) || parsed.cycles.length === 0 || !parsed.activeCycleId) {
      return seedWorkspace();
    }
    return parsed;
  } catch {
    return seedWorkspace();
  }
}

export function useWorkspace() {
  const [data, setData] = useState<Workspace>(loadWorkspace);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  function selectCycle(id: string) {
    setData((prev) => ({ ...prev, activeCycleId: id }));
  }

  function addCycle(input: Pick<Cycle, "name" | "start" | "end">) {
    const cycle: Cycle = { id: uid(), ...input };
    setData((prev) => ({
      ...prev,
      cycles: [...prev.cycles, cycle],
      activeCycleId: cycle.id,
    }));
  }

  function deleteCycle(id: string) {
    setData((prev) => {
      if (prev.cycles.length <= 1) return prev;
      const cycles = prev.cycles.filter((cycle) => cycle.id !== id);
      const dropped = new Set(prev.objectives.filter((item) => item.cycleId === id).map((item) => item.id));
      const objectives = prev.objectives.filter((item) => item.cycleId !== id);
      const keyResults = prev.keyResults.filter((item) => !dropped.has(item.objectiveId));
      const keptResults = new Set(keyResults.map((item) => item.id));
      return {
        cycles,
        objectives,
        keyResults,
        checkIns: prev.checkIns.filter((item) => keptResults.has(item.keyResultId)),
        activeCycleId: prev.activeCycleId === id ? cycles[0].id : prev.activeCycleId,
      };
    });
  }

  function addObjective(input: Pick<Objective, "title" | "description" | "owner">) {
    const objective: Objective = { id: uid(), cycleId: data.activeCycleId, ...input };
    setData((prev) => ({ ...prev, objectives: [objective, ...prev.objectives] }));
    return objective.id;
  }

  function updateObjective(id: string, patch: Partial<Pick<Objective, "title" | "description" | "owner">>) {
    setData((prev) => ({
      ...prev,
      objectives: prev.objectives.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function deleteObjective(id: string) {
    setData((prev) => {
      const dropped = new Set(prev.keyResults.filter((item) => item.objectiveId === id).map((item) => item.id));
      return {
        ...prev,
        objectives: prev.objectives.filter((item) => item.id !== id),
        keyResults: prev.keyResults.filter((item) => item.objectiveId !== id),
        checkIns: prev.checkIns.filter((item) => !dropped.has(item.keyResultId)),
      };
    });
  }

  function addKeyResult(input: Omit<KeyResult, "id">) {
    const keyResult: KeyResult = { id: uid(), ...input };
    setData((prev) => ({ ...prev, keyResults: [...prev.keyResults, keyResult] }));
  }

  function checkIn(keyResultId: string, value: number, note: string) {
    const entry: CheckIn = {
      id: uid(),
      keyResultId,
      value,
      note: note.trim(),
      at: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      keyResults: prev.keyResults.map((item) =>
        item.id === keyResultId ? { ...item, currentValue: value } : item,
      ),
      checkIns: [entry, ...prev.checkIns],
    }));
  }

  function deleteKeyResult(id: string) {
    setData((prev) => ({
      ...prev,
      keyResults: prev.keyResults.filter((item) => item.id !== id),
      checkIns: prev.checkIns.filter((item) => item.keyResultId !== id),
    }));
  }

  function reset() {
    setData(seedWorkspace());
  }

  return {
    data,
    selectCycle,
    addCycle,
    deleteCycle,
    addObjective,
    updateObjective,
    deleteObjective,
    addKeyResult,
    checkIn,
    deleteKeyResult,
    reset,
  };
}

export type WorkspaceApi = ReturnType<typeof useWorkspace>;
