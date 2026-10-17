import "server-only";
import type { OrderPerms } from "@/components/orders/order-dialog";
import type { SessionProfile } from "@/lib/auth/session";
import { canEditJob } from "@/lib/jobs/access";
import { loadJobOrders, loadOrderOptions, orderDefaults } from "./data";
import type { OrderTypeKey } from "./types";

/** Everything the order cards on a job page need, for the signed-in person. */
export async function loadOrderBoard(
  me: SessionProfile,
  job: Record<string, unknown>,
) {
  const jobId = String(job.id);
  const [orders, options, editor] = await Promise.all([
    loadJobOrders(jobId),
    loadOrderOptions(),
    canEditJob(me, jobId),
  ]);

  const visibleTypes: OrderTypeKey[] = [];
  if (Number(job.brick_sqft) > 0)
    visibleTypes.push("sand", "mortar", "lintel", "arch_lintel");
  if (Number(job.stone_sqft) > 0) visibleTypes.push("sand", "mortar", "rock");
  if (Number(job.stucco_sqft) > 0)
    visibleTypes.push("stucco_material", "paint");

  const perms: OrderPerms = {
    // Crew managers only reach a job page for their own crew's jobs.
    canOrder: editor || me.role === "crew_manager",
    canPlace: editor,
    isAdmin: me.role === "admin",
    isCrew: me.role === "crew_manager",
    meId: me.id,
  };

  return {
    jobId,
    orders: orders.map((o) => ({
      id: o.id,
      type: o.type,
      number: o.number,
      main: o.main,
      sub: o.sub,
      ordered: o.ordered,
      createdBy: o.createdBy,
      createdByName: o.createdByName,
      values: o.values,
    })),
    visibleTypes: [...new Set(visibleTypes)],
    defaults: orderDefaults(job),
    options,
    perms,
    counts: {
      total: orders.length,
      placed: orders.filter((o) => o.ordered).length,
    },
  };
}
