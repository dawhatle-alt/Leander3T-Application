"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/auth/form-bits";
import { ROLES, ROLE_LABEL, type AppRole } from "@/lib/auth/roles";
import { setPersonPassword, updatePerson, type PersonInput } from "./actions";

type Opt = { value: string; label: string };

export function PersonEditButton({
  person,
  isSelf,
  builders,
  managers,
}: {
  person: PersonInput & { email: string | null };
  isSelf: boolean;
  builders: Opt[];
  managers: (Opt & { builderId: string | null })[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-[6px] border-[1.5px] border-mortar-2 px-3 py-1.5 text-[13px] font-bold hover:border-flame hover:text-flame"
      >
        <Pencil className="size-3.5" aria-hidden />
        Edit<span className="sr-only"> {person.fullName}</span>
      </button>
      {open && (
        <PersonDialog
          person={person}
          isSelf={isSelf}
          builders={builders}
          managers={managers}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function PersonDialog({
  person,
  isSelf,
  builders,
  managers,
  onClose,
}: {
  person: PersonInput & { email: string | null };
  isSelf: boolean;
  builders: Opt[];
  managers: (Opt & { builderId: string | null })[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [v, setV] = useState<PersonInput>(person);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const set = <K extends keyof PersonInput>(k: K, val: PersonInput[K]) =>
    setV((x) => ({ ...x, [k]: val }));
  const office = v.role === "admin" || v.role === "supervisor";
  const builderCms = managers.filter((m) => m.builderId === v.builderId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await updatePerson(v);
      if (res.error) {
        setError(res.error);
        return;
      }
      ref.current?.close();
      router.refresh();
    });
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto max-h-[calc(100dvh-24px)] w-[min(600px,calc(100vw-24px))] rounded-lg border border-mortar bg-paper p-0 text-ink shadow-2xl backdrop:bg-charcoal/60"
    >
      <form
        onSubmit={submit}
        noValidate
        className="flex max-h-[calc(100dvh-24px)] flex-col"
      >
        <header className="flex items-center gap-3 border-b border-mortar px-5 py-4">
          <div>
            <h2 className="font-display text-[24px] font-bold uppercase">
              {person.fullName || "Edit Person"}
            </h2>
            <div className="font-mono text-[12px] text-ink-muted">
              {person.email}
            </div>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="ml-auto grid size-9 place-items-center rounded-md hover:bg-limestone"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4">
          {error && <Notice tone="error">{error}</Notice>}
          <fieldset
            disabled={pending}
            className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2"
          >
            <div>
              <label htmlFor="p-name" className="label">
                Name
              </label>
              <input
                id="p-name"
                className="input"
                value={v.fullName}
                onChange={(e) => set("fullName", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="p-phone" className="label">
                Phone
              </label>
              <input
                id="p-phone"
                type="tel"
                className="input font-mono text-[14px]"
                value={v.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="p-role" className="label">
                Role
              </label>
              <select
                id="p-role"
                className="input"
                value={v.role}
                disabled={isSelf}
                onChange={(e) => set("role", e.target.value as AppRole)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              {isSelf && (
                <p className="mt-1 text-[12.5px] text-ink-muted">
                  You can&apos;t change your own role.
                </p>
              )}
            </div>
            {v.role === "builder" && (
              <>
                <div>
                  <label htmlFor="p-builder" className="label">
                    Builder
                  </label>
                  <select
                    id="p-builder"
                    className="input"
                    value={v.builderId}
                    onChange={(e) => {
                      set("builderId", e.target.value);
                      set("constructionManagerId", "");
                    }}
                  >
                    <option value="">—</option>
                    {builders.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="p-cm" className="label">
                    Construction manager record
                  </label>
                  <select
                    id="p-cm"
                    className="input"
                    value={v.constructionManagerId}
                    onChange={(e) =>
                      set("constructionManagerId", e.target.value)
                    }
                  >
                    <option value="">—</option>
                    {builderCms.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {office && (
              <label className="flex items-center gap-2.5 rounded-md bg-limestone px-3.5 py-3 text-[15px] font-semibold sm:col-span-2">
                <input
                  type="checkbox"
                  className="size-[18px] accent-[var(--flame)]"
                  checked={v.reviewsOrderForms}
                  onChange={(e) => set("reviewsOrderForms", e.target.checked)}
                />
                Reviews order forms
                <span className="ml-auto text-[12.5px] font-normal text-ink-muted">
                  Gets the &ldquo;new order form&rdquo; email
                </span>
              </label>
            )}
            <label className="flex items-center gap-2.5 rounded-md border border-mortar px-3.5 py-3 text-[15px] font-semibold sm:col-span-2">
              <input
                type="checkbox"
                className="size-[18px] accent-[var(--flame)]"
                checked={v.active}
                disabled={isSelf}
                onChange={(e) => set("active", e.target.checked)}
              />
              Can sign in
              <span className="ml-auto text-[12.5px] font-normal text-ink-muted">
                Untick to switch off access; their history stays.
              </span>
            </label>
          </fieldset>
          {!isSelf && <SetPassword personId={person.id} />}
        </div>
        <footer className="flex items-center justify-end gap-3 border-t border-mortar px-5 py-3.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => ref.current?.close()}
          >
            Cancel
          </Button>
          <Button type="submit" variant="fire" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </footer>
      </form>
    </dialog>
  );
}

// Lives inside the person dialog's form, so it uses a plain button rather than
// a nested <form>. Saving here doesn't touch the other fields.
function SetPassword({ personId }: { personId: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<{
    error?: string;
    message?: string;
  } | null>(null);
  const [pending, start] = useTransition();

  if (!open)
    return (
      <div className="mt-4 border-t border-mortar pt-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-[14px] font-bold text-flame"
        >
          <KeyRound className="size-4" aria-hidden />
          Set a password
        </button>
      </div>
    );

  const save = () => {
    setResult(null);
    start(async () => {
      const res = await setPersonPassword({ id: personId, password, confirm });
      setResult(res);
      if (!res.error) {
        setPassword("");
        setConfirm("");
      }
    });
  };

  return (
    <div className="mt-4 border-t border-mortar pt-4">
      <h3 className="mb-1 font-display text-[18px] font-bold uppercase">
        Set a Password
      </h3>
      <p className="mb-3 text-[13px] text-ink-muted">
        Give them this password yourself. It works once: when they sign in,
        they&apos;ll be asked to choose their own.
      </p>
      {result?.error && <Notice tone="error">{result.error}</Notice>}
      {result?.message && <Notice tone="ok">{result.message}</Notice>}
      <fieldset
        disabled={pending}
        className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2"
      >
        <div>
          <label htmlFor="p-pw" className="label">
            New password
          </label>
          <input
            id="p-pw"
            type="password"
            autoComplete="new-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="p-pw2" className="label">
            Confirm password
          </label>
          <input
            id="p-pw2"
            type="password"
            autoComplete="new-password"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
      </fieldset>
      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || !password}
          onClick={save}
        >
          {pending ? "Setting…" : "Set Password"}
        </Button>
        <span className="text-[12.5px] text-ink-muted">
          At least 10 characters.
        </span>
      </div>
    </div>
  );
}
