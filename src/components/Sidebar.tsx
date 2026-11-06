import { useState, type FormEvent } from "react";
import { percent, type Cycle } from "../model";

type Props = {
  cycles: Cycle[];
  activeId: string;
  progressFor: (id: string) => number;
  composerOpen: boolean;
  onSelect: (id: string) => void;
  onOpenComposer: () => void;
  onCloseComposer: () => void;
  onAddCycle: (input: { name: string; start: string; end: string }) => void;
  onDeleteCycle: (id: string) => void;
  canDelete: boolean;
  onReset: () => void;
};

export function Sidebar(props: Props) {
  const [confirming, setConfirming] = useState(false);
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="mark" aria-hidden="true" />
        <div>
          <p className="brand-name">OKRt</p>
          <p className="brand-line">Objectives, kept honest.</p>
        </div>
      </div>
      <p className="side-label">Quarters</p>
      <ul className="cycle-list">
        {props.cycles.map((cycle) => {
          const active = cycle.id === props.activeId;
          return (
            <li key={cycle.id}>
              <button
                type="button"
                className={active ? "cycle active" : "cycle"}
                onClick={() => {
                  setConfirming(false);
                  props.onSelect(cycle.id);
                }}
                aria-current={active ? "true" : undefined}
              >
                <span>{cycle.name}</span>
                <span className="cycle-score">{percent(props.progressFor(cycle.id))}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {props.composerOpen ? (
        <CycleForm onCancel={props.onCloseComposer} onSubmit={props.onAddCycle} />
      ) : (
        <button type="button" className="text-btn" onClick={props.onOpenComposer}>
          Add a quarter
        </button>
      )}
      {props.canDelete &&
        (confirming ? (
          <span className="confirm">
            Remove {props.cycles.find((cycle) => cycle.id === props.activeId)?.name}?
            <button
              type="button"
              className="text-btn danger"
              onClick={() => {
                props.onDeleteCycle(props.activeId);
                setConfirming(false);
              }}
            >
              Remove
            </button>
            <button type="button" className="text-btn" onClick={() => setConfirming(false)}>
              Keep
            </button>
          </span>
        ) : (
          <button type="button" className="text-btn danger" onClick={() => setConfirming(true)}>
            Remove this quarter
          </button>
        ))}
      <div className="side-foot">
        <p>Scores live in this browser. A key result is on pace when its progress keeps up with the days already gone.</p>
        <button type="button" className="text-btn" onClick={props.onReset}>
          Restore the sample quarter
        </button>
      </div>
    </aside>
  );
}

function CycleForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (input: { name: string; start: string; end: string }) => void;
}) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !start || !end) {
      setError("Name, start, and end are required.");
      return;
    }
    if (end < start) {
      setError("The end date has to land after the start.");
      return;
    }
    onSubmit({ name: name.trim(), start, end });
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Q2 2027" />
      </label>
      <label>
        Starts
        <input type="date" value={start} onChange={(event) => setStart(event.target.value)} />
      </label>
      <label>
        Ends
        <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-row">
        <button type="submit" className="primary">
          Add quarter
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
