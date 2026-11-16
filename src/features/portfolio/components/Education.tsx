"use client";

import { useState, type ChangeEvent } from "react";
import { Building2, GraduationCap } from "lucide-react";
import { uploadToStorage } from "@/lib/format";
import type { EducationItem } from "@/types/portfolio";
import type { EntryForm } from "@/features/portfolio/hooks/use-entry-crud";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { AdminForm, FormSection, Field, UploadButton, SaveCancel } from "@/components/ui/admin-form";
import { Img } from "@/components/ui/img";

/*
 * Admin form for an education row. The section itself is the Journey timeline.
 */

export type EduForm = EntryForm<EducationItem>;

export const EMPTY_EDU: EduForm = {
  school: "", school_vi: "",
  degree: "", degree_vi: "",
  major: "", major_vi: "",
  start_date: "", end_date: "",
  description: "", description_vi: "",
  tech_stack_input: "",
  logo_url: "",
  is_hidden: false,
};

export function validateEdu(form: EduForm): string | null {
  if (!(form.school || form.school_vi || "").trim()) return "School / university name is required.";
  return null;
}

export function EduFormSheet({
  form,
  setForm,
  onCancel,
  onSave,
  saving,
  error,
  setError,
}: {
  form: EduForm;
  setForm: (f: EduForm) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const set = (key: keyof EduForm) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  const uploadLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadToStorage("education-logos", file);
    setUploading(false);
    if (url) setForm({ ...form, logo_url: url });
    else setError("Logo upload failed.");
  };

  return (
    <AdminForm
      title={form.id ? "Edit education" : "Add education"}
      icon={GraduationCap}
      error={error}
      onClose={onCancel}
      actions={<SaveCancel onCancel={onCancel} onSave={onSave} saving={saving} saveLabel="Save" />}
    >
      <FormSection index="01" title="School (EN)" className="sm:grid-cols-3">
        <Field label="School / university (EN) *">
          <input value={form.school || ""} onChange={set("school")} className="field-raised" placeholder="FPT University" />
        </Field>
        <Field label="Degree (EN)">
          <input value={form.degree || ""} onChange={set("degree")} className="field-raised" placeholder="Bachelor's degree" />
        </Field>
        <Field label="Major (EN)">
          <input value={form.major || ""} onChange={set("major")} className="field-raised" placeholder="Software Engineering" />
        </Field>
      </FormSection>

      <FormSection index="02" title="School (VI)" className="sm:grid-cols-3">
        <Field label="School / university (VI)">
          <input value={form.school_vi || ""} onChange={set("school_vi")} className="field-raised" placeholder="Đại học FPT" />
        </Field>
        <Field label="Degree (VI)">
          <input value={form.degree_vi || ""} onChange={set("degree_vi")} className="field-raised" placeholder="Cử nhân" />
        </Field>
        <Field label="Major (VI)">
          <input value={form.major_vi || ""} onChange={set("major_vi")} className="field-raised" placeholder="Kỹ thuật phần mềm" />
        </Field>
      </FormSection>

      <FormSection index="03" title="Duration" className="grid-cols-2">
        <Field label="Start date">
          <input type="date" value={form.start_date || ""} onChange={set("start_date")} className="field-raised" />
        </Field>
        <Field label="End date">
          <input type="date" value={form.end_date || ""} onChange={set("end_date")} className="field-raised" />
        </Field>
      </FormSection>

      <FormSection index="04" title="Description & activities">
        <Field label="Description (EN)" group>
          <RichTextEditor value={form.description || ""} onChange={(html) => setForm({ ...form, description: html })} />
        </Field>
        <Field label="Description (VI)" group>
          <RichTextEditor value={form.description_vi || ""} onChange={(html) => setForm({ ...form, description_vi: html })} />
        </Field>
      </FormSection>

      <FormSection index="05" title="Skills">
        <Field label="Tech stack / skills (comma-separated)">
          <input value={form.tech_stack_input || ""} onChange={set("tech_stack_input")} className="field-raised" placeholder="C#, Java, SQL" />
        </Field>
      </FormSection>

      <FormSection index="06" title="School logo">
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
