"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { submitInfoRequest } from "@/lib/requests/actions";
import type { InfoRequestState } from "@/lib/validation/request";

// "Request More Information". The hidden "website" field and the start time
// are spam checks; people never see or touch them.
export function RequestForm() {
  const [state, action, pending] = useActionState<InfoRequestState, FormData>(
    submitInfoRequest,
    {},
  );
  const [started, setStarted] = useState("");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => setStarted(String(Date.now())), []);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  const err = state.fieldErrors ?? {};
  const field = (
    name: keyof typeof err,
    label: string,
    props: React.ComponentProps<"input">,
    required = false,
  ) => (
    <div className="field">
      <label htmlFor={`rq-${name}`}>
        {label} {required && <em aria-hidden="true">*</em>}
      </label>
      <input
        id={`rq-${name}`}
        name={name}
        required={required}
        aria-invalid={err[name] ? true : undefined}
        aria-describedby={err[name] ? `rq-${name}-err` : undefined}
        {...props}
      />
      {err[name] && (
        <p id={`rq-${name}-err`} className="err">
          {err[name]}
        </p>
      )}
    </div>
  );

  return (
    <form
      ref={ref}
      // Submitting through a handler (not the form action prop) keeps what
      // people typed when a field needs fixing; it's cleared only on success.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      noValidate
      className="form-card"
      aria-label="Request more information"
    >
      {state.ok && (
        <p role="status" className="form-note ok">
          ✓ Thanks — your request is in. We&apos;ll respond within one business
          day.
        </p>
      )}
      {state.error && (
        <p role="alert" className="form-note bad">
          {state.error}
        </p>
      )}
      <div className="field-row">
        {field(
          "name",
          "Name",
          { type: "text", placeholder: "Your name", autoComplete: "name" },
          true,
        )}
        {field("company", "Company", {
          type: "text",
          placeholder: "Builder / company",
          autoComplete: "organization",
        })}
      </div>
      <div className="field-row">
        {field(
          "email",
          "Email",
          {
            type: "email",
            placeholder: "you@company.com",
            autoComplete: "email",
          },
          true,
        )}
        {field("phone", "Phone", {
          type: "tel",
          placeholder: "(512) 555-0100",
          autoComplete: "tel",
        })}
      </div>
      <div className="field">
        <label htmlFor="rq-notes">How can we help?</label>
        <textarea
          id="rq-notes"
          name="notes"
          rows={4}
          maxLength={4000}
          placeholder="Community name, number of homes, timeline…"
        />
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor="rq-website">Website</label>
        <input
          id="rq-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <input type="hidden" name="started" value={started} />
      <button
        className="btn btn-fire"
        style={{ width: "100%", justifyContent: "center" }}
        type="submit"
        disabled={pending}
      >
        {pending ? "Sending…" : "Request More Information"}
      </button>
    </form>
  );
}
