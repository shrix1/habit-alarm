-- Enable RLS
alter database postgres set timezone to 'UTC';

-- Create alarms table
create table public.alarms (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    title text not null,
    time time not null,
    verification_delay interval not null default '10 minutes',
    days_of_week integer[] not null, -- [0,1,2,3,4,5,6] for daily, [1,2,3,4,5] for Mon-Fri
    start_date date not null default current_date,
    end_date date,
    ringtone text not null default 'default',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    is_active boolean default true not null
);

-- Create public.users table
create table public.users (
    id uuid primary key references auth.users,
    email text not null,
    name text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for users table
alter table public.users enable row level security;

-- Create policy for users table
create policy "Users can view their own user data"
    on public.users for select
    using (auth.uid() = id);

-- Create function to handle new user creation
create or replace function public.handle_auth_user_created()
returns trigger as $$
begin
    insert into public.users (id, email, name)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name')
    );
    return new;
end;
$$ language plpgsql security definer;

-- Create trigger for auth.users
create trigger on_auth_user_created_insert_public_user
    after insert on auth.users
    for each row execute procedure public.handle_auth_user_created();

-- Create alarm_completions table for tracking habit completion
create table public.alarm_completions (
    id uuid default gen_random_uuid() primary key,
    alarm_id uuid references public.alarms not null,
    user_id uuid references auth.users not null,
    date date not null default current_date,
    completed boolean not null default false,
    completed_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(alarm_id, date)
);

-- Enable Row Level Security (RLS)
alter table public.alarms enable row level security;
alter table public.alarm_completions enable row level security;

-- Create policies
create policy "Users can view their own alarms"
    on public.alarms for select
    using (auth.uid() = user_id);

create policy "Users can insert their own alarms"
    on public.alarms for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own alarms"
    on public.alarms for update
    using (auth.uid() = user_id);

create policy "Users can delete their own alarms"
    on public.alarms for delete
    using (auth.uid() = user_id);

create policy "Users can view their own completions"
    on public.alarm_completions for select
    using (auth.uid() = user_id);

create policy "Users can insert their own completions"
    on public.alarm_completions for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own completions"
    on public.alarm_completions for update
    using (auth.uid() = user_id);

-- Create indexes for better performance
create index alarms_user_id_idx on public.alarms(user_id);
create index alarm_completions_user_id_idx on public.alarm_completions(user_id);
create index alarm_completions_alarm_id_idx on public.alarm_completions(alarm_id);
create index alarm_completions_date_idx on public.alarm_completions(date); 