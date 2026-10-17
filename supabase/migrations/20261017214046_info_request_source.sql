-- M8 · Website "Request More Information" form. Requests are written by the
-- server only (no public insert policy). The sender's IP is kept so the server
-- can limit how many requests one address sends per hour.
alter table public.info_requests add column source_ip text;
create index info_requests_source_ip_created_idx
  on public.info_requests (source_ip, created_at);
