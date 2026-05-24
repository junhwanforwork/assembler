-- RLS 정책

alter table industries enable row level security;
alter table feature_types enable row level security;
alter table implementations enable row level security;
alter table articles enable row level security;
alter table saved_items enable row level security;
alter table workspace_shares enable row level security;

-- industries: 누구나 읽기
create policy "industries_public_read" on industries for select using (true);

-- feature_types: 누구나 읽기
create policy "feature_types_public_read" on feature_types for select using (true);

-- implementations: 발행된 것만 public read
create policy "implementations_public_read" on implementations
  for select using (is_published = true);

-- articles: 발행된 것만 public read
create policy "articles_public_read" on articles
  for select using (is_published = true);

-- saved_items: session_id 소유자만
create policy "saved_items_select" on saved_items
  for select using (session_id = current_setting('request.headers', true)::json->>'x-session-id');

create policy "saved_items_insert" on saved_items
  for insert with check (session_id = current_setting('request.headers', true)::json->>'x-session-id');

create policy "saved_items_delete" on saved_items
  for delete using (session_id = current_setting('request.headers', true)::json->>'x-session-id');

-- workspace_shares: 누구나 slug로 읽기, session_id로 insert
create policy "workspace_shares_public_read" on workspace_shares
  for select using (true);

create policy "workspace_shares_insert" on workspace_shares
  for insert with check (true);
