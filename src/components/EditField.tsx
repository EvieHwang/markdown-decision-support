import { useEffect, useState } from 'react';

/**
 * A controlled numeric edit field (Feature 7). Keeps a local string draft so a
 * partially-typed or cleared value never round-trips through the engine as NaN: every
 * keystroke updates the draft, and only a finite parse commits through `onCommit`
 * (which routes to `applyEdit`). A cleared field parses to NaN → no commit → no-op,
 * exactly the F2 edit semantics. The draft re-syncs whenever the committed `value`
 * prop changes (e.g. a clamp the engine applied, or a seed rebuild).
 */
export function EditField({
  label,
  sub,
  value,
  step,
  suffix,
  prefix,
  onCommit,
}: {
  label: string;
  sub?: string;
  value: number;
  step: number;
  suffix?: string;
  prefix?: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function handle(raw: string) {
    setDraft(raw);
    const v = parseFloat(raw);
    if (Number.isFinite(v)) onCommit(v);
  }

  return (
    <label className="edit-field">
      <span className="edit-field-label">{label}</span>
      <span className="edit-input-wrap">
        {prefix && <span className="affix">{prefix}</span>}
        <input
          className="form-control mono edit-input"
          type="number"
          step={step}
          value={draft}
          aria-label={label}
          onChange={(e) => handle(e.target.value)}
          style={{ paddingLeft: prefix ? 18 : 8, paddingRight: suffix ? 22 : 8 }}
        />
        {suffix && <span className="affix affix-r">{suffix}</span>}
      </span>
      {sub && <span className="edit-field-sub">{sub}</span>}
    </label>
  );
}
