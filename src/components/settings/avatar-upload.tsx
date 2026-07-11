"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { uploadAvatarAction } from "@/lib/actions/profile";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function AvatarUpload({ initialAvatarUrl, name }: { initialAvatarUrl: string | null; name: string }) {
  const [preview, setPreview] = useState<string | null>(initialAvatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Envie uma imagem JPEG, PNG ou WebP");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("A imagem deve ter no máximo 5MB");
      return;
    }

    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("avatar", file);
      const result = await uploadAvatarAction(formData);
      if ("error" in result) {
        setError(result.error);
        setPreview(initialAvatarUrl);
      } else {
        toast.success("Foto atualizada");
      }
    });
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <Avatar size="lg">
        <AvatarImage src={preview ?? undefined} alt={name} />
        <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="space-y-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => fileInputRef.current?.click()}>
          {isPending ? "Enviando..." : "Alterar foto"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
