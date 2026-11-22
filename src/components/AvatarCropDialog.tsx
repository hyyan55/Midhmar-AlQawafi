import React, { useEffect, useMemo, useState } from 'react';

interface AvatarCropDialogProps {
  file: File;
  onCancel: () => void;
  onSave: (file: File) => void;
}

export const AvatarCropDialog: React.FC<AvatarCropDialogProps> = ({ file, onCancel, onSave }) => {
  const [zoom, setZoom] = useState(1);
  const [horizontal, setHorizontal] = useState(0);
  const [vertical, setVertical] = useState(0);
  const [busy, setBusy] = useState(false);
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  async function saveCrop() {
    setBusy(true);
    try {
      const image = await createImageBitmap(file);
      const side = Math.min(image.width, image.height) / zoom;
      const maxX = image.width - side;
      const maxY = image.height - side;
      const sx = Math.max(0, Math.min(maxX, maxX / 2 + horizontal / 100 * maxX / 2));
      const sy = Math.max(0, Math.min(maxY, maxY / 2 + vertical / 100 * maxY / 2));
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('تعذر تجهيز الصورة.');
      ctx.drawImage(image, sx, sy, side, side, 0, 0, 512, 512);
      image.close();
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        value => value ? resolve(value) : reject(new Error('تعذر قص الصورة.')), 'image/jpeg', 0.88
      ));
      onSave(new File([blob], 'midhmar-avatar.jpg', { type: 'image/jpeg' }));
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-[#0C192B]/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title">
      <section className="w-full max-w-md rounded-3xl bg-[#F5F1E8] dark:bg-[#1B2D47] text-[#14243B] dark:text-[#F5F1E8] p-5 sm:p-6 shadow-2xl border border-[#C6A15B]/30">
        <h2 id="avatar-crop-title" className="text-xl font-bold font-poetry text-center">ضبط الصورة الشخصية</h2>
        <p className="text-xs text-center text-[#697586] dark:text-[#C0CAD6] mt-2 mb-5">حرّك الصورة وحدد الجزء الذي تريد ظهوره داخل الدائرة.</p>
        <div className="w-56 h-56 mx-auto rounded-full overflow-hidden border-4 border-[#C6A15B] bg-[#EAE2D2] shadow-inner">
          <img src={previewUrl} alt="معاينة قص الصورة" draggable={false}
            className="w-full h-full object-cover pointer-events-none"
            style={{ transform: 'scale(' + zoom + ')', objectPosition: (50 + horizontal / 2) + '% ' + (50 + vertical / 2) + '%' }} />
        </div>
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium">التكبير
            <input aria-label="تكبير الصورة" type="range" min="1" max="3" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-full mt-2 accent-[#A98543]" />
          </label>
          <label className="block text-sm font-medium">تحريك أفقي
            <input aria-label="تحريك أفقي" type="range" min="-100" max="100" value={horizontal} onChange={e => setHorizontal(Number(e.target.value))} className="w-full mt-2 accent-[#A98543]" />
          </label>
          <label className="block text-sm font-medium">تحريك رأسي
            <input aria-label="تحريك رأسي" type="range" min="-100" max="100" value={vertical} onChange={e => setVertical(Number(e.target.value))} className="w-full mt-2 accent-[#A98543]" />
          </label>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onCancel} disabled={busy} className="flex-1 min-h-12 rounded-xl border border-[#D6CDBB] font-semibold">إلغاء</button>
          <button type="button" onClick={() => void saveCrop()} disabled={busy} className="flex-1 min-h-12 rounded-xl bg-[#14243B] text-white dark:bg-[#C6A15B] dark:text-[#14243B] font-semibold">{busy ? 'جارٍ تجهيز الصورة...' : 'اعتماد القص'}</button>
        </div>
      </section>
    </div>
  );
};
