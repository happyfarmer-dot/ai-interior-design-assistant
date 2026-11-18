import {
  Camera,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { loadImageElement } from './imageProcessing';

export interface PickedPhotoResult {
  dataUrl: string;
  fileName: string;
  widthPx: number;
  heightPx: number;
  cancelled?: boolean;
}

export function isNativeCapacitor(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getCapacitorPlatform(): string {
  try {
    return Capacitor.getPlatform();
  } catch {
    return 'web';
  }
}

/**
 * Captures a photo using device Camera or picks from Photo Library via @capacitor/camera.
 * Automatically requests runtime Android/iOS permissions on native devices.
 * In web environments, seamlessly utilizes standard file/capture input fallback.
 */
export async function pickPhotoWithCapacitor(
  preferredSource: 'camera' | 'photos'
): Promise<PickedPhotoResult> {
  if (isNativeCapacitor()) {
    const perms = await Camera.checkPermissions();
    const targetPerm = preferredSource === 'camera' ? 'camera' : 'photos';
    if (
      perms[targetPerm] !== 'granted' &&
      perms[targetPerm] !== 'limited'
    ) {
      const requested = await Camera.requestPermissions({
        permissions: [targetPerm],
      });
      if (
        requested[targetPerm] !== 'granted' &&
        requested[targetPerm] !== 'limited'
      ) {
        throw new Error(
          preferredSource === 'camera'
            ? '請於手機系統設定開啟「相機」存取權限，即可即時拍攝空間照片。'
            : '請於手機系統設定開啟「相簿 / 媒體」讀取權限以選取照片。'
        );
      }
    }
  }

  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source:
        preferredSource === 'camera'
          ? CameraSource.Camera
          : CameraSource.Photos,
      correctOrientation: true,
      webUseInput: true,
    });

    if (!photo.dataUrl) {
      return {
        dataUrl: '',
        fileName: '',
        widthPx: 0,
        heightPx: 0,
        cancelled: true,
      };
    }

    const img = await loadImageElement(photo.dataUrl);
    const ext = photo.format || 'jpeg';
    return {
      dataUrl: photo.dataUrl,
      fileName: `room_${preferredSource}_${Date.now()}.${ext}`,
      widthPx: img.naturalWidth || 1200,
      heightPx: img.naturalHeight || 900,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      /cancel|cancelled|User cancelled|dismissed/i.test(msg)
    ) {
      return {
        dataUrl: '',
        fileName: '',
        widthPx: 0,
        heightPx: 0,
        cancelled: true,
      };
    }
    throw err;
  }
}
