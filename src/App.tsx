import { useEffect, useMemo, useState } from "react";
import {
  average,
  cycleTiming,
  formatDay,
  krProgress,
  statusFor,
  type KeyResult,
  type Objective,
  type Status,
} from "./model";
import { useWorkspace } from "./useWorkspace";
import { Board } from "./components/Board";
import { Sidebar } from "./components/Sidebar";

export function App() {
  const workspace = useWorkspace();
  const { data } = workspace;
  const [filter, setFilter] = useState<Status | "all">("all");
  const [composer, setComposer] = useState<"objective" | "cycle" | null>(null);

  const cycle = data.cycles.find((item) => item.id === data.activeCycleId) ?? data.cycles[0];
  const timing = cycleTiming(cycle);

  const objectives = useMemo(() => {
    return data.objectives
      .filter((item) => item.cycleId === cycle.id)
      .map((item) => {
        const results = data.keyResults.filter((kr) => kr.objectiveId === item.id);
        const progress = average(results.map(krProgress));
        return {
          ...item,
          progress,
          status: statusFor(progress, timing.pace, results.length),
        };
      });
  }, [cycle.id, data.keyResults, data.objectives, timing.pace]);

  const visible = filter === "all" ? objectives : objectives.filter((item) => item.status === filter);

  const counts = useMemo(() => {
    const tally = { done: 0, "on-track": 0, "at-risk": 0, behind: 0, draft: 0 };
    for (const item of objectives) tally[item.status] += 1;
    return tally;
  }, [objectives]);

  const overall = average(objectives.filter((item) => item.status !== "draft").map((item) => item.progress));

  useEffect(() => {
    document.title = `OKRt — ${cycle.name}`;
  }, [cycle.name]);

  useEffect(() => {
    setFilter("all");
    setComposer(null);
  }, [cycle.id]);

  const sentence = summarySentence(objectives.length, counts);

  return (
    <div className="app">
      <Sidebar
        cycles={data.cycles}
        activeId={cycle.id}
        progressFor={(id) => cycleProgress(id, data.objectives, data.keyResults)}
        composerOpen={composer === "cycle"}
        onSelect={(id) => {
          workspace.selectCycle(id);
        }}
        onOpenComposer={() => setComposer("cycle")}
        onCloseComposer={() => setComposer(null)}
        onAddCycle={(input) => {
          workspace.addCycle(input);
          setComposer(null);
        }}
        onDeleteCycle={workspace.deleteCycle}
        canDelete={data.cycles.length > 1}
        onReset={workspace.reset}
      />
      <Board
        cycleName={cycle.name}
        range={`${formatDay(cycle.start)} – ${formatDay(cycle.end)}`}
        elapsed={timing.elapsedDays}
        total={timing.totalDays}
        pace={timing.pace}
        overall={objectives.length ? overall : 0}
        sentence={sentence}
        counts={counts}
        filter={filter}
        onFilter={setFilter}
        composerOpen={composer === "objective"}
        onOpenComposer={() => setComposer("objective")}
        onCloseComposer={() => setComposer(null)}
        onAddObjective={(input) => {
          workspace.addObjective(input);
          setComposer(null);
        }}
        objectives={visible}
        emptyBecauseFilter={objectives.length > 0 && visible.length === 0}
        quarterEmpty={objectives.length === 0}
        keyResultsFor={(id) => data.keyResults.filter((item) => item.objectiveId === id)}
        checkInsFor={(id) => data.checkIns.filter((item) => item.keyResultId === id)}
        onUpdateObjective={workspace.updateObjective}
        onDeleteObjective={workspace.deleteObjective}
        onAddKeyResult={workspace.addKeyResult}
        onCheckIn={workspace.checkIn}
        onDeleteKeyResult={workspace.deleteKeyResult}
      />
    </div>
  );
}

function cycleProgress(cycleId: string, objectives: Objective[], keyResults: KeyResult[]) {
  const owned = objectives.filter((item) => item.cycleId === cycleId);
  const scores = owned.map((item) => {
    const results = keyResults.filter((kr) => kr.objectiveId === item.id);
    return average(results.map(krProgress));
  });
  return average(scores.filter((_, index) => {
    const results = keyResults.filter((kr) => kr.objectiveId === owned[index].id);
    return results.length > 0;
  }));
}

function summarySentence(total: number, counts: Record<Status, number>) {
  if (total === 0) return "This quarter is still a blank page.";
  const parts: string[] = [];
  if (counts.behind) parts.push(`${counts.behind} behind the quarter’s pace`);
  if (counts["at-risk"]) parts.push(`${counts["at-risk"]} at risk`);
  if (counts["on-track"]) parts.push(`${counts["on-track"]} on track`);
  if (counts.done) parts.push(`${counts.done} done`);
  if (counts.draft) parts.push(`${counts.draft} still a draft`);
  const noun = total === 1 ? "objective" : "objectives";
  return `${total} ${noun}. ${parts.join(", ")}.`;
}

