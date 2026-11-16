"use client";

import { useState, type ChangeEvent } from "react";
import { Briefcase, Building2 } from "lucide-react";
import { uploadToStorage } from "@/lib/format";
import type { WorkExperience } from "@/types/portfolio";
import type { EntryForm } from "@/features/portfolio/hooks/use-entry-crud";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { AdminForm, FormSection, Field, UploadButton, SaveCancel } from "@/components/ui/admin-form";
import { Img } from "@/components/ui/img";

/*
 * Admin form for a work_history row. The section itself is the Journey timeline.
 */

export type WorkForm = EntryForm<WorkExperience>;

export const EMPTY_WORK: WorkForm = {
  company: "", company_vi: "",
  role: "", role_vi: "",
  work_type: "Full-time", work_type_vi: "Toàn thời gian",
  location: "", location_vi: "",
  description: "", description_vi: "",
  tech_stack_input: "",
  logo_url: "",
  start_date: "", end_date: "",
  is_hidden: false,
};

export function validateWork(form: WorkForm): string | null {
  if (!(form.company || form.company_vi || "").trim()) return "Company name is required.";
  if (!(form.role || form.role_vi || "").trim()) return "Role / position is required.";
  return null;
}

export function WorkFormSheet({
  form,
  setForm,
  onCancel,
  onSave,
  saving,
  error,
  setError,
}: {
  form: WorkForm;
  setForm: (f: WorkForm) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const set = (key: keyof WorkForm) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  const uploadLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadToStorage("logos", file);
    setUploading(false);
    if (url) setForm({ ...form, logo_url: url });
    else setError("Logo upload failed.");
  };

  return (
    <AdminForm
      title={form.id ? "Edit work experience" : "Add work experience"}
      icon={Briefcase}
      error={error}
      onClose={onCancel}
      actions={<SaveCancel onCancel={onCancel} onSave={onSave} saving={saving} saveLabel="Save" />}
    >
      <FormSection index="01" title="Company & role (EN)" className="sm:grid-cols-2">
        <Field label="Company (EN) *">
          <input value={form.company || ""} onChange={set("company")} className="field-raised" placeholder="Acme Corp" />
        </Field>
        <Field label="Role (EN) *">
          <input value={form.role || ""} onChange={set("role")} className="field-raised" placeholder="Frontend Developer" />
        </Field>
      </FormSection>

      <FormSection index="02" title="Company & role (VI)" className="sm:grid-cols-2">
        <Field label="Company (VI)">
          <input value={form.company_vi || ""} onChange={set("company_vi")} className="field-raised" placeholder="Công ty Acme" />
        </Field>
        <Field label="Role (VI)">
          <input value={form.role_vi || ""} onChange={set("role_vi")} className="field-raised" placeholder="Lập trình viên Frontend" />
        </Field>
      </FormSection>

      <FormSection index="03" title="Employment & location" className="sm:grid-cols-2">
        <Field label="Work type (EN)">
          <input list="work-type-en" value={form.work_type || ""} onChange={set("work_type")} className="field-raised" placeholder="Full-time" />
          <datalist id="work-type-en">
            {["Full-time", "Part-time", "Contract", "Service Contract", "Remote", "Freelance", "Internship"].map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <Field label="Work type (VI)">
          <input list="work-type-vi" value={form.work_type_vi || ""} onChange={set("work_type_vi")} className="field-raised" placeholder="Toàn thời gian" />
          <datalist id="work-type-vi">
            {["Toàn thời gian", "Bán thời gian", "Hợp đồng dịch vụ", "Từ xa", "Tự do", "Thực tập"].map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <Field label="Location (EN)">
          <input value={form.location || ""} onChange={set("location")} className="field-raised" placeholder="Ho Chi Minh City" />
        </Field>
        <Field label="Location (VI)">
          <input value={form.location_vi || ""} onChange={set("location_vi")} className="field-raised" placeholder="TP. Hồ Chí Minh" />
        </Field>
      </FormSection>

      <FormSection index="04" title="Duration" className="grid-cols-2">
        <Field label="Start date">
          <input type="date" value={form.start_date || ""} onChange={set("start_date")} className="field-raised" />
        </Field>
        <Field label="End date (blank = present)">
          <input type="date" value={form.end_date || ""} onChange={set("end_date")} className="field-raised" />
        </Field>
      </FormSection>

      <FormSection index="05" title="Description">
        <Field label="Description (EN)" group>
          <RichTextEditor value={form.description || ""} onChange={(html) => setForm({ ...form, description: html })} />
        </Field>
        <Field label="Description (VI)" group>
          <RichTextEditor value={form.description_vi || ""} onChange={(html) => setForm({ ...form, description_vi: html })} />
        </Field>
      </FormSection>

      <FormSection index="06" title="Technologies">
        <Field label="Tech stack (comma-separated)">
          <input value={form.tech_stack_input || ""} onChange={set("tech_stack_input")} className="field-raised" placeholder="React, TypeScript, Next.js" />
        </Field>
      </FormSection>

      <FormSection index="07" title="Company logo">
        <div className="flex items-center gap-4">
          <span className="tile-raised h-14 w-14 shrink-0 overflow-hidden rounded-full text-muted-foreground">
            {form.logo_url ? <Img src={form.logo_url} className="h-full w-full bg-white object-contain p-1" alt="Logo preview" /> : <Building2 className="h-5 w-5" />}
          </span>
          <UploadButton accept="image/*" onChange={uploadLogo} uploading={uploading}>
            Upload logo
          </UploadButton>
        </div>
      </FormSection>
    </AdminForm>
  );
}
