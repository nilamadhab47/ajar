"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useProfileStore } from "@/features/presence/presence-store";
import { BRAND } from "@/lib/config";
import { usersApi } from "@/services/api/users-api";
import { useUiStore } from "@/stores/ui-store";
import { useAvatarStore } from "../avatar-store";
import { AvatarEditor } from "./AvatarEditor";

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter a name people will recognise").max(24, "Keep it under 24 characters"),
  title: z.string().trim().max(40, "Keep it under 40 characters"),
});
type ProfileForm = z.infer<typeof profileSchema>;

const inputClass = "h-9 w-full rounded-md border border-line bg-app px-2.5 text-sm focus:border-accent focus:bg-panel focus:outline-none aria-[invalid=true]:border-dnd";

function ProfileFields({ form }: { form: ReturnType<typeof useForm<ProfileForm>> }) {
  const { register, formState: { errors } } = form;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="profile-name" className="mb-1 block text-xs font-medium">Display name</label>
        <input id="profile-name" data-autofocus autoComplete="nickname" aria-invalid={!!errors.displayName} aria-describedby="profile-name-error" className={inputClass} {...register("displayName")} />
        <p id="profile-name-error" role="alert" className="mt-1 min-h-4 text-xs text-dnd">{errors.displayName?.message}</p>
      </div>
      <div>
        <label htmlFor="profile-title" className="mb-1 block text-xs font-medium">Role <span className="font-normal text-muted">(optional)</span></label>
        <input id="profile-title" autoComplete="organization-title" placeholder="e.g. Product engineer" aria-invalid={!!errors.title} className={inputClass} {...register("title")} />
        <p role="alert" className="mt-1 min-h-4 text-xs text-dnd">{errors.title?.message}</p>
      </div>
    </div>
  );
}

function useProfileForm() {
  const profile = useProfileStore.getState();
  return useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: profile.onboarded ? profile.displayName : "", title: profile.title },
  });
}

/** First-run flow: name yourself and build a character before stepping into the office. */
export function OnboardingDialog() {
  const [draft, setDraft] = useState(() => useAvatarStore.getState().appearance);
  const form = useProfileForm();
  const submit = form.handleSubmit((values) => {
    useAvatarStore.getState().setAppearance(draft);
    useProfileStore.getState().setProfile({ ...values, onboarded: true });
    void usersApi.updateProfile({ displayName: values.displayName });
    const ui = useUiStore.getState();
    ui.closeDialog();
    ui.toast({ title: `Welcome, ${values.displayName}!`, body: "Walk with W A S D or the arrow keys. Press E near things to use them.", tone: "success" });
  });
  return (
    <Dialog open modalOnly onClose={() => undefined} title={`Welcome to ${BRAND.product}`} description="Create your character. You can change everything later from your profile." className="w-[min(94vw,680px)]">
      <form onSubmit={submit} className="space-y-4 p-5">
        <ProfileFields form={form} />
        <AvatarEditor value={draft} onChange={setDraft} compact />
        <div className="flex justify-end border-t border-line pt-4">
          <Button variant="primary" type="submit">Enter the office</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function ProfileDialog() {
  const form = useProfileForm();
  const close = () => useUiStore.getState().closeDialog();
  const submit = form.handleSubmit((values) => {
    useProfileStore.getState().setProfile(values);
    void usersApi.updateProfile({ displayName: values.displayName });
    close();
  });
  return (
    <Dialog open onClose={close} title="Your profile" description="Shown on your nameplate and in the People panel.">
      <form onSubmit={submit} className="space-y-3 p-5">
        <ProfileFields form={form} />
        <div className="flex justify-end gap-2">
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit">Save</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function AvatarDialog() {
  const [draft, setDraft] = useState(() => useAvatarStore.getState().appearance);
  const close = () => useUiStore.getState().closeDialog();
  return (
    <Dialog open onClose={close} title="Customise your avatar" description="Changes preview instantly and are saved to this browser." className="w-[min(94vw,720px)]">
      <div className="p-5">
        <AvatarEditor value={draft} onChange={setDraft} />
        <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={() => { useAvatarStore.getState().setAppearance(draft); close(); useUiStore.getState().toast({ title: "Avatar updated", tone: "success" }); }}>Save avatar</Button>
        </div>
      </div>
    </Dialog>
  );
}
