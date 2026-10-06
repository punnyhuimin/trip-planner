/** A 0–3 scale (cost, energy) as a row of radio buttons with text labels. */
export function ScaleField({
  legend,
  labels,
  value,
  onChange,
}: {
  legend: string;
  labels: readonly string[];
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="grid grid-cols-4 gap-1.5">
        {labels.map((label, i) => (
          <label
            key={label}
            className={`flex min-h-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium has-focus-visible:outline-2 has-focus-visible:outline-lagoon ${
              value === i ? "border-lagoon bg-lagoon-soft" : "border-line text-muted"
            }`}
          >
            <input
              type="radio"
              name={legend}
              value={i}
              checked={value === i}
              onChange={() => onChange(i)}
              className="sr-only"
            />
            {value === i && <span aria-hidden>✓&nbsp;</span>}
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
