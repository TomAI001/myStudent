-- 咱们班的成长记录：Supabase 数据结构
-- 在 Supabase Dashboard > SQL Editor 中完整运行一次。

create extension if not exists "pgcrypto";

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  constraint terms_dates_valid check (end_date >= start_date)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  avatar_url text,
  avatar_path text,
  joined_on date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  term_id uuid not null references public.terms(id) on delete cascade,
  sequence_no integer not null check (sequence_no > 0),
  title text not null,
  lesson_date date not null,
  summary text,
  content_html text not null default '',
  created_at timestamptz not null default now(),
  unique (term_id, sequence_no)
);

create table if not exists public.student_lesson_records (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  comment text not null default '',
  thinking_score smallint not null default 3 check (thinking_score between 1 and 5),
  focus_score smallint not null default 3 check (focus_score between 1 and 5),
  creativity_score smallint not null default 3 check (creativity_score between 1 and 5),
  coding_score smallint not null default 3 check (coding_score between 1 and 5),
  motivation_score smallint not null default 3 check (motivation_score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, student_id)
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.student_lesson_records(id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  url text not null,
  storage_path text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  term_id uuid not null references public.terms(id) on delete cascade,
  title text not null,
  assigned_date date not null,
  content_html text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_records_set_updated_at on public.student_lesson_records;
create trigger student_records_set_updated_at
before update on public.student_lesson_records
for each row execute function public.set_updated_at();

alter table public.classes enable row level security;
alter table public.terms enable row level security;
alter table public.students enable row level security;
alter table public.lessons enable row level security;
alter table public.student_lesson_records enable row level security;
alter table public.media enable row level security;
alter table public.homework enable row level security;

-- 家长展示端可公开读取；只有已登录管理员可以修改。
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'classes', 'terms', 'students', 'lessons',
    'student_lesson_records', 'media', 'homework'
  ] loop
    execute format('drop policy if exists "Public can view %1$s" on public.%1$I', table_name);
    execute format('create policy "Public can view %1$s" on public.%1$I for select using (true)', table_name);
    execute format('drop policy if exists "Admin can insert %1$s" on public.%1$I', table_name);
    execute format('create policy "Admin can insert %1$s" on public.%1$I for insert to authenticated with check (true)', table_name);
    execute format('drop policy if exists "Admin can update %1$s" on public.%1$I', table_name);
    execute format('create policy "Admin can update %1$s" on public.%1$I for update to authenticated using (true) with check (true)', table_name);
    execute format('drop policy if exists "Admin can delete %1$s" on public.%1$I', table_name);
    execute format('create policy "Admin can delete %1$s" on public.%1$I for delete to authenticated using (true)', table_name);
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-media',
  'student-media',
  true,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf', 'application/zip', 'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view student media" on storage.objects;
create policy "Public can view student media"
on storage.objects for select
using (bucket_id = 'student-media');

drop policy if exists "Admin can upload student media" on storage.objects;
create policy "Admin can upload student media"
on storage.objects for insert to authenticated
with check (bucket_id = 'student-media');

drop policy if exists "Admin can update student media" on storage.objects;
create policy "Admin can update student media"
on storage.objects for update to authenticated
using (bucket_id = 'student-media')
with check (bucket_id = 'student-media');

drop policy if exists "Admin can delete student media" on storage.objects;
create policy "Admin can delete student media"
on storage.objects for delete to authenticated
using (bucket_id = 'student-media');

create index if not exists terms_class_id_idx on public.terms(class_id);
create index if not exists students_class_id_idx on public.students(class_id);
create index if not exists lessons_term_id_idx on public.lessons(term_id);
create index if not exists records_student_id_idx on public.student_lesson_records(student_id);
create index if not exists media_record_id_idx on public.media(record_id);
create index if not exists homework_term_id_idx on public.homework(term_id);
