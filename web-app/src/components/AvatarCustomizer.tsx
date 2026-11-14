import React, { useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { LuCamera, LuTrash2, LuUpload } from "react-icons/lu";

interface AvatarCustomizerProps {
  initialAvatarUrl?: string | null;
  firstName?: string;
  lastName?: string;
  readOnly?: boolean;
  onChange?: (data: { file: File | null; url: string | null }) => void;
}

export default function AvatarCustomizer({
  initialAvatarUrl = null,
  firstName = "",
  lastName = "",
  readOnly = false,
  onChange,
}: AvatarCustomizerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const avatarUrl = initialAvatarUrl;

  useEffect(() => {
    if (previewUrlRef.current && previewUrlRef.current !== initialAvatarUrl) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, [initialAvatarUrl]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    },
    [],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
        file.type,
      )
    ) {
      toast.error("Please upload a valid image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be under 2MB.");
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    onChange?.({ file, url: previewUrl });
  };

  const handleRemoveAvatar = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    onChange?.({ file: null, url: null });
  };

  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
      <label className="block text-sm font-medium text-slate-700 mb-3">
        Admin Avatar
      </label>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar Display */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 border-2 border-indigo-600/30 flex items-center justify-center text-slate-500 text-2xl font-bold shadow-inner">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              `${firstName.charAt(0) || "A"}${lastName.charAt(0) || ""}`
            )}
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full shadow-md hover:bg-indigo-700 transition"
              title="Upload Image"
            >
              <LuCamera className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Controls */}
        {!readOnly && (
          <div className="space-y-3 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-100 transition shadow-sm font-medium cursor-pointer"
              >
                <LuUpload className="w-3.5 h-3.5" /> Upload Image
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="flex items-center gap-1.5 text-xs border border-red-200 bg-red-50 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-100 transition font-medium cursor-pointer"
                >
                  <LuTrash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Supports JPG, PNG, GIF or WEBP up to 2MB.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}