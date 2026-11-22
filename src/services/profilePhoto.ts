import { getAccessToken, setAccessToken, apiClient } from './apiClient.ts';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';

async function compressPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('اختر صورة بصيغة JPG أو PNG أو WebP.');
  if (file.size > 8 * 1024 * 1024) throw new Error('حجم الصورة الأصلية يجب ألا يتجاوز 8 ميجابايت.');
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) { image.close(); throw new Error('تعذر تجهيز الصورة.'); }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (result) => result ? resolve(result) : reject(new Error('تعذر ضغط الصورة.')), 'image/jpeg', 0.82
  ));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('تعذر قراءة الصورة.'));
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة.'));
    reader.readAsDataURL(blob);
  });
}

export async function uploadProfilePhoto(file: File): Promise<string> {
  const image = await compressPhoto(file);
  const send = () => fetch(`${API_BASE}/api/profile/avatar`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
    },
    body: JSON.stringify({ image }),
  });
  let response = await send();
  if (response.status === 401) {
    const refreshed = await apiClient.refreshSession();
    if (refreshed) { setAccessToken(refreshed.accessToken); response = await send(); }
  }
  const payload = await response.json().catch(() => null) as
    | { success?: boolean; data?: { secureUrl?: string }; error?: { message?: string } }
    | null;
  if (!response.ok || !payload?.success || !payload.data?.secureUrl) {
    throw new Error(payload?.error?.message || 'تعذر رفع الصورة الشخصية.');
  }
  return payload.data.secureUrl;
}


/** Adds Cloudinary's automatic format, quality and responsive-width delivery transforms. */
export function getOptimizedImageUrl(url: string | null | undefined, width = 512): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('cloudinary.com')) return url;
    const marker = '/image/upload/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex < 0) return url;

    const prefix = parsed.pathname.slice(0, markerIndex + marker.length);
    const remainder = parsed.pathname.slice(markerIndex + marker.length);
    const segments = remainder.split('/');
    if (/^(?:f_|q_|w_|h_|c_|fl_|dpr_)/.test(segments[0] || '')) segments.shift();
    parsed.pathname = prefix + `f_auto,q_auto,w_${Math.max(64, Math.min(1600, Math.round(width)))},c_limit/` + segments.join('/');
    return parsed.toString();
  } catch {
    return url;
  }
}
