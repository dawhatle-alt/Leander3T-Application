"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Notice } from "@/components/auth/form-bits";
import { ROLES, ROLE_LABEL, type AppRole } from "@/lib/auth/roles";
import type { FormState } from "@/lib/validation/auth";
import { invitePerson } from "./actions";

const selectClass =
  "w-full rounded-sm border-[1.5px] border-mortar-2 bg-limestone px-3.5 py-3 text-[15px] text-ink focus:border-flame focus:bg-paper focus:outline-none";

export function InviteForm({
  builders,
}: {
  builders: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    invitePerson,
    {},
  );
  const [role, setRole] = useState<AppRole>("employee");

  return (
    <form action={action} noValidate className="px-6 py-5">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.message && <Notice tone="ok">{state.message}</Notice>}
      <div className="grid gap-x-4 md:grid-cols-2">
        <Field label="Name" name="fullName" autoComplete="off" required />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="off"
          required
        />
        <div className="mb-[18px]">
          <label
            htmlFor="role"
            className="mb-[7px] block text-[13.5px] font-semibold"
          >
            Role
          </label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as AppRole)}
            className={selectClass}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        {role === "builder" && (
          <div className="mb-[18px]">
            <label
              htmlFor="builderId"
              className="mb-[7px] block text-[13.5px] font-semibold"
            >
              Builder
            </label>
            <select
              id="builderId"
              name="builderId"
              defaultValue=""
              className={selectClass}
            >
              <option value="" disabled>
                Choose a builder
              </option>
              {builders.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <p className="mb-4 text-[13.5px] text-ink-muted">
        They’ll get an email to sign in and choose a password. Crew managers are
        linked to their crew from the crew’s settings.
      </p>
      <Button type="submit" variant="fire" size="sm" disabled={pending}>
        {pending ? "Sending…" : "Send Invitation"}
      </Button>
    </form>
  );
}
