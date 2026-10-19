import { useRef } from "react";
export default function ImagePickerDialog({
  isOpen,
  onClose,
  images,
  onImageSelect,
}) {
  const input = useRef(null);
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Choose image"
        className="w-[600px] rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between">
          <h2 className="text-lg font-semibold">Choose image</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="my-4 grid grid-cols-3 gap-3">
          {images.map((image) => (
            <button
              key={image.url}
              onClick={() => {
                onImageSelect(image.url, image.name);
                onClose();
              }}
            >
              <img
                className="h-36 w-full rounded object-cover"
                src={image.url}
                alt={image.name}
              />
            </button>
          ))}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              onImageSelect(reader.result, file.name);
              onClose();
            };
            reader.readAsDataURL(file);
          }}
        />
        <p className="mt-3 text-xs text-slate-500">
          Images stay in this example.
        </p>
      </div>
    </div>
  );
}
