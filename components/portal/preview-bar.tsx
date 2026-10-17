// Shown only to administrators previewing the portal: which builder's view
// this is, and a switcher. Builders never see it.
export function PreviewBar({
  builders,
  current,
}: {
  builders: { id: string; name: string }[];
  current: string;
}) {
  return (
    <form
      action="/portal/preview"
      className="mb-6 flex flex-wrap items-center gap-3 rounded-md border border-[#f3d79a] bg-[#fdeecb] px-4 py-3 text-[14px] text-[#6b4300]"
    >
      <strong>Admin preview.</strong>
      <span>This is exactly what this builder&apos;s users see.</span>
      <label htmlFor="pv-builder" className="sr-only">
        Builder
      </label>
      <select
        id="pv-builder"
        name="builder"
        defaultValue={current}
        className="ml-auto rounded-md border border-[#e7c77d] bg-paper px-2.5 py-1.5"
      >
        {builders.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-md bg-charcoal px-3.5 py-1.5 font-bold text-limestone"
      >
        Switch
      </button>
    </form>
  );
}
