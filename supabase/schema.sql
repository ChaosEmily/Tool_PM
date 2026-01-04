-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create tasks table
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assignee text not null,
  status text not null default 'todo' 
    check (status in ('todo', 'in_progress', 'review', 'done')),
  start_date date not null,
  end_date date not null,
  
  completed_at timestamp with time zone,
  completed_by text,
  
  is_deleted boolean default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Realtime
alter publication supabase_realtime add table tasks;

-- Enable RLS
alter table tasks enable row level security;

-- Policies (OPEN ACCESS)
create policy "Anyone can do anything"
  on tasks
  for all
  using (true)
  with check (true);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_tasks_updated_at
  before update on tasks
  for each row
  execute function update_updated_at();
