-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'vendor');
CREATE TYPE public.membership_status AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE public.complaint_status AS ENUM ('open', 'in_review', 'resolved', 'closed');
CREATE TYPE public.complaint_category AS ENUM ('harassment', 'fees_levies', 'stall_allocation', 'sanitation', 'security', 'infrastructure', 'other');
CREATE TYPE public.complaint_priority AS ENUM ('low', 'normal', 'high');
CREATE TYPE public.announcement_kind AS ENUM ('notice', 'meeting');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE SEQUENCE public.membership_seq START 1;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text NOT NULL DEFAULT '',
  business_name text NOT NULL DEFAULT '',
  goods_category text NOT NULL DEFAULT '',
  market_location text NOT NULL DEFAULT '',
  stall_number text NOT NULL DEFAULT '',
  national_id text NOT NULL DEFAULT '',
  membership_number text UNIQUE NOT NULL DEFAULT ('VA-' || lpad(nextval('public.membership_seq')::text, 5, '0')),
  membership_status public.membership_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own profile or admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Update own profile or admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.membership_status := OLD.membership_status;
    NEW.membership_number := OLD.membership_number;
  END IF;
  NEW.id := OLD.id;
  NEW.membership_number := OLD.membership_number;
  RETURN NEW;
END; $$;

CREATE TRIGGER profiles_protect BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- New user handling: profile + vendor role; very first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_first boolean;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO is_first;

  INSERT INTO public.profiles (id, email, full_name, phone, business_name, goods_category, market_location, stall_number, membership_status)
  VALUES (
    NEW.id,
    NEW.email,
    left(coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), 120),
    left(coalesce(NEW.raw_user_meta_data->>'phone', ''), 30),
    left(coalesce(NEW.raw_user_meta_data->>'business_name', ''), 120),
    left(coalesce(NEW.raw_user_meta_data->>'goods_category', ''), 80),
    left(coalesce(NEW.raw_user_meta_data->>'market_location', ''), 120),
    left(coalesce(NEW.raw_user_meta_data->>'stall_number', ''), 30),
    CASE WHEN is_first THEN 'active'::public.membership_status ELSE 'pending'::public.membership_status END
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendor');
  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Complaints
CREATE SEQUENCE public.complaint_seq START 1;

CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no text UNIQUE NOT NULL DEFAULT ('CMP-' || lpad(nextval('public.complaint_seq')::text, 5, '0')),
  vendor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 4000),
  category public.complaint_category NOT NULL DEFAULT 'other',
  priority public.complaint_priority NOT NULL DEFAULT 'normal',
  location text NOT NULL DEFAULT '',
  status public.complaint_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.complaints TO authenticated;
GRANT ALL ON public.complaints TO service_role;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own complaints or admin" ON public.complaints FOR SELECT TO authenticated
  USING (vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendors file own complaints" ON public.complaints FOR INSERT TO authenticated
  WITH CHECK (vendor_id = auth.uid() AND status = 'open');
CREATE POLICY "Admins update complaints" ON public.complaints FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER complaints_updated_at BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Complaint updates (timeline)
CREATE TABLE public.complaint_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  new_status public.complaint_status,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.complaint_updates TO authenticated;
GRANT ALL ON public.complaint_updates TO service_role;
ALTER TABLE public.complaint_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read updates on visible complaints" ON public.complaint_updates FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_id AND c.vendor_id = auth.uid())
  );
CREATE POLICY "Post updates on own or as admin" ON public.complaint_updates FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND (
      public.has_role(auth.uid(), 'admin')
      OR (new_status IS NULL AND EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_id AND c.vendor_id = auth.uid()))
    )
  );

CREATE OR REPLACE FUNCTION public.apply_complaint_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.new_status IS NOT NULL AND public.has_role(NEW.author_id, 'admin') THEN
    UPDATE public.complaints SET status = NEW.new_status WHERE id = NEW.complaint_id;
  ELSE
    UPDATE public.complaints SET updated_at = now() WHERE id = NEW.complaint_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER complaint_updates_apply AFTER INSERT ON public.complaint_updates
  FOR EACH ROW EXECUTE FUNCTION public.apply_complaint_status();

-- Announcements & meetings
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.announcement_kind NOT NULL DEFAULT 'notice',
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  meeting_at timestamptz,
  venue text NOT NULL DEFAULT '',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins post announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
CREATE POLICY "Admins edit announcements" ON public.announcements FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete announcements" ON public.announcements FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX complaints_vendor_idx ON public.complaints(vendor_id, created_at DESC);
CREATE INDEX complaint_updates_complaint_idx ON public.complaint_updates(complaint_id, created_at);
CREATE INDEX announcements_created_idx ON public.announcements(created_at DESC);