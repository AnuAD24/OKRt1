import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  formatMeasure,
  formatWhen,
  krProgress,
  percent,
  statusLabel,
  type CheckIn,
  type KeyResult,
  type Status,
} from "../model";
import type { ObjectiveView } from "../model";

const filters: Array<Status | "all"> = ["all", "on-track", "at-risk", "behind", "done", "draft"];

type Props = {
  cycleName: string;
  range: string;
  elapsed: number;
  total: number;
  pace: number;
  overall: number;
  sentence: string;
  counts: Record<Status, number>;
  filter: Status | "all";
  onFilter: (filter: Status | "all") => void;
  composerOpen: boolean;
  onOpenComposer: () => void;
  onCloseComposer: () => void;
  onAddObjective: (input: { title: string; owner: string; description: string }) => void;
  objectives: ObjectiveView[];
  emptyBecauseFilter: boolean;
  quarterEmpty: boolean;
  keyResultsFor: (objectiveId: string) => KeyResult[];
  checkInsFor: (keyResultId: string) => CheckIn[];
  onUpdateObjective: (id: string, patch: { title?: string; owner?: string; description?: string }) => void;
  onDeleteObjective: (id: string) => void;
  onAddKeyResult: (input: Omit<KeyResult, "id">) => void;
  onCheckIn: (keyResultId: string, value: number, note: string) => void;
  onDeleteKeyResult: (id: string) => void;
};

export function Board(props: Props) {
  return (
    <main className="board">
      <header className="board-head">
        <div>
          <p className="eyebrow">{props.range}</p>
          <h1>{props.cycleName}</h1>
          <p className="lede">
            Day {props.elapsed} of {props.total}. The quarter expects {percent(props.pace)} by today. {props.sentence}
          </p>
        </div>
        <div className="score-block">
          <p className="score" aria-live="polite">
            {percent(props.overall)}
          </p>
          <p>average progress</p>
        </div>
      </header>

      <div className="toolbar">
        <div className="filters" role="toolbar" aria-label="Filter objectives">
          {filters.map((item) => {
            const count = item === "all" ? sumCounts(props.counts) : props.counts[item];
            if (count === 0) return null;
            return (
              <button
                key={item}
                type="button"
                className={props.filter === item ? "chip on" : "chip"}
                aria-pressed={props.filter === item}
                onClick={() => props.onFilter(item)}
              >
                {item === "all" ? "All" : statusLabel[item]}
                <span>{count}</span>
              </button>
            );
          })}
        </div>
        {!props.composerOpen && (
          <button type="button" className="primary" onClick={props.onOpenComposer}>
            New objective
          </button>
        )}
      </div>

      {props.composerOpen && (
        <ObjectiveForm onCancel={props.onCloseComposer} onSubmit={props.onAddObjective} />
      )}

      {props.quarterEmpty && !props.composerOpen && (
        <section className="empty">
          <h2>Nothing scored yet</h2>
          <p>Add an objective, then give it a number you can move this quarter.</p>
          <button type="button" className="primary" onClick={props.onOpenComposer}>
            New objective
          </button>
        </section>
      )}

      {props.emptyBecauseFilter && (
        <section className="empty">
          <h2>Nothing in this lane</h2>
          <p>Try another status, or clear the filter to see the whole quarter.</p>
        </section>
      )}

      <div className="cards">
        {props.objectives.map((objective) => (
          <ObjectiveCard
            key={objective.id}
            objective={objective}
            keyResults={props.keyResultsFor(objective.id)}
            checkInsFor={props.checkInsFor}
            onUpdate={props.onUpdateObjective}
            onDelete={props.onDeleteObjective}
            onAddKeyResult={props.onAddKeyResult}
            onCheckIn={props.onCheckIn}
            onDeleteKeyResult={props.onDeleteKeyResult}
          />
        ))}
      </div>
    </main>
  );
}

function sumCounts(counts: Record<Status, number>) {
  return counts.done + counts["on-track"] + counts["at-risk"] + counts.behind + counts.draft;
}

function ObjectiveForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (input: { title: string; owner: string; description: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !owner.trim()) {
      setError("An objective needs a title and an owner.");
      return;
    }
    onSubmit({ title: title.trim(), owner: owner.trim(), description: description.trim() });
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <h2>New objective</h2>
      <div className="composer-grid">
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What will be true by the end of the quarter?" autoFocus />
        </label>
        <label>
          Owner
          <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Name" />
        </label>
      </div>
      <label>
        Why it matters
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="One sentence the team can repeat." />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-row">
        <button type="submit" className="primary">
          Add objective
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ObjectiveCard({
  objective,
  keyResults,
  checkInsFor,
  onUpdate,
  onDelete,
  onAddKeyResult,
  onCheckIn,
  onDeleteKeyResult,
}: {
  objective: ObjectiveView;
  keyResults: KeyResult[];
  checkInsFor: (id: string) => CheckIn[];
  onUpdate: Props["onUpdateObjective"];
  onDelete: (id: string) => void;
  onAddKeyResult: Props["onAddKeyResult"];
  onCheckIn: Props["onCheckIn"];
  onDeleteKeyResult: Props["onDeleteKeyResult"];
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState(objective.title);
  const [owner, setOwner] = useState(objective.owner);
  const [description, setDescription] = useState(objective.description);

  function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !owner.trim()) return;
    onUpdate(objective.id, { title: title.trim(), owner: owner.trim(), description: description.trim() });
    setEditing(false);
  }

  return (
    <article className="card" data-status={objective.status}>
      <div className="card-top">
        <Ring value={objective.progress} />
        <div className="card-copy">
          {editing ? (
            <form className="edit-form" onSubmit={saveEdit}>
              <input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Objective title" />
              <input value={owner} onChange={(event) => setOwner(event.target.value)} aria-label="Owner" />
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} aria-label="Description" />
              <div className="form-row">
                <button type="submit" className="primary">
                  Save
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setTitle(objective.title);
                    setOwner(objective.owner);
                    setDescription(objective.description);
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="title-row">
                <h2>{objective.title}</h2>
                <span className="pill" data-status={objective.status}>
                  {statusLabel[objective.status]}
                </span>
              </div>
              <p className="meta">
                <span className="avatar" aria-hidden="true">
                  {initials(objective.owner)}
                </span>
                {objective.owner}
              </p>
              {objective.description && <p className="description">{objective.description}</p>}
            </>
          )}
        </div>
      </div>

      <ul className="results">
        {keyResults.map((kr) => (
          <KeyResultRow
            key={kr.id}
            kr={kr}
            checkIns={checkInsFor(kr.id)}
            onCheckIn={onCheckIn}
            onDelete={onDeleteKeyResult}
          />
        ))}
      </ul>

      {adding ? (
        <KeyResultForm
          objectiveId={objective.id}
          onCancel={() => setAdding(false)}
          onSubmit={(input) => {
            onAddKeyResult(input);
            setAdding(false);
          }}
        />
      ) : (
        <div className="card-actions">
          <button type="button" className="text-btn" onClick={() => setAdding(true)}>
            Add key result
          </button>
          {!editing && (
            <button type="button" className="text-btn" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          {confirming ? (
            <span className="confirm">
              Remove this objective?
              <button type="button" className="text-btn danger" onClick={() => onDelete(objective.id)}>
                Remove
              </button>
              <button type="button" className="text-btn" onClick={() => setConfirming(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" className="text-btn danger" onClick={() => setConfirming(true)}>
              Remove
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function KeyResultRow({
  kr,
  checkIns,
  onCheckIn,
  onDelete,
}: {
  kr: KeyResult;
  checkIns: CheckIn[];
  onCheckIn: Props["onCheckIn"];
  onDelete: (id: string) => void;
}) {
  const progress = krProgress(kr);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(false);
  const [value, setValue] = useState(String(kr.currentValue));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const currentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const field = currentRef.current;
    if (!field) return;
    field.focus();
    field.select();
  }, [open]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next = Number(value);
    if (!Number.isFinite(next)) {
      setError("Enter a number.");
      return;
    }
    onCheckIn(kr.id, next, note);
    setNote("");
    setError("");
    setOpen(false);
    setHistory(true);
  }

  return (
    <li className="result">
      <div className="result-head">
        <div>
          <p className="result-title">{kr.title}</p>
          <p className="result-measure">
            {formatMeasure(kr.currentValue, kr.unit)}
            <span>
              {formatNumber(kr.startValue)} → {formatMeasure(kr.targetValue, kr.unit)}
            </span>
          </p>
        </div>
        <strong>{percent(progress)}</strong>
      </div>
      <div className="bar" aria-hidden="true">
        <span style={{ width: percent(progress) }} />
      </div>
      <div className="result-actions">
        <button type="button" className="text-btn" onClick={() => setOpen((current) => !current)}>
          {open ? "Close check-in" : "Check in"}
        </button>
        {checkIns.length > 0 && (
          <button type="button" className="text-btn" onClick={() => setHistory((current) => !current)}>
            {history ? "Hide history" : `History (${checkIns.length})`}
          </button>
        )}
        <button type="button" className="text-btn danger" onClick={() => onDelete(kr.id)}>
          Remove
        </button>
      </div>
      {open && (
        <form className="checkin" onSubmit={handleSubmit}>
          <label>
            Current
            <input
              ref={currentRef}
              inputMode="decimal"
              value={value}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setValue(event.target.value)}
              aria-label={`Current value for ${kr.title}`}
            />
          </label>
          <label className="grow">
            Note
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="What changed?" />
          </label>
          <button type="submit" className="primary">
            Save
          </button>
          {error && <p className="form-error">{error}</p>}
        </form>
      )}
      {history && checkIns.length > 0 && (
        <ol className="history">
          {[...checkIns]
            .sort((a, b) => b.at.localeCompare(a.at))
            .map((entry) => (
            <li key={entry.id}>
              <span>{formatMeasure(entry.value, kr.unit)}</span>
              <time dateTime={entry.at}>{formatWhen(entry.at)}</time>
              {entry.note && <p>{entry.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

function KeyResultForm({
  objectiveId,
  onCancel,
  onSubmit,
}: {
  objectiveId: string;
  onCancel: () => void;
  onSubmit: (input: Omit<KeyResult, "id">) => void;
}) {
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [startValue, setStartValue] = useState("0");
  const [targetValue, setTargetValue] = useState("");
  const [currentValue, setCurrentValue] = useState("0");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const start = Number(startValue);
    const target = Number(targetValue);
    const current = Number(currentValue);
    if (!title.trim()) {
      setError("Name the result.");
      return;
    }
    if (![start, target, current].every(Number.isFinite)) {
      setError("Start, current, and target need numbers.");
      return;
    }
    if (start === target) {
      setError("Start and target need to be different, or there is nothing to score.");
      return;
    }
    onSubmit({
      objectiveId,
      title: title.trim(),
      unit: unit.trim(),
      startValue: start,
      targetValue: target,
      currentValue: current,
    });
  }

  return (
    <form className="kr-form" onSubmit={handleSubmit}>
      <label>
        Key result
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The number you will move" autoFocus />
      </label>
      <label>
        Unit
        <input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="teams, %, days" />
      </label>
      <label>
        Start
        <input inputMode="decimal" value={startValue} onChange={(event) => setStartValue(event.target.value)} />
      </label>
      <label>
        Current
        <input inputMode="decimal" value={currentValue} onChange={(event) => setCurrentValue(event.target.value)} />
      </label>
      <label>
        Target
        <input inputMode="decimal" value={targetValue} onChange={(event) => setTargetValue(event.target.value)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-row">
        <button type="submit" className="primary">
          Add key result
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Ring({ value }: { value: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg className="ring" viewBox="0 0 72 72" role="img" aria-label={`${percent(value)} progress`}>
      <circle className="ring-track" cx="36" cy="36" r={radius} />
      <circle
        className="ring-value"
        cx="36"
        cy="36"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value)}
      />
      <text x="36" y="40" textAnchor="middle">
        {Math.round(value * 100)}
      </text>
    </svg>
  );
}

function formatNumber(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
