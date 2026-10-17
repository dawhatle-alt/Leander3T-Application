-- M7 · Construction managers can be switched off like everything else
-- (records are never removed; history keeps pointing at them).
alter table public.construction_managers
  add column active boolean not null default true;
