import { App } from '@capacitor/app';
import type { AppInfo } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { Device } from '@capacitor/device';
import type { DeviceInfo } from '@capacitor/device';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import type { Photo } from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Preferences } from '@capacitor/preferences';

// Platform detection
export let isNativePlatform = false;
let deviceInfo: DeviceInfo | null = null;
let appInfo: AppInfo | null = null;

/**
 * Initialize mobile-specific features
 */
export const initMobile = async (): Promise<void> => {
  try {
    // Get device info
    try {
      deviceInfo = await Device.getInfo();
      isNativePlatform = deviceInfo.platform !== 'web';
    } catch (e) {
      console.warn('Device.getInfo not available, assuming web platform', e);
      isNativePlatform = false;
    }

    // Get app info (only if on native platform)
    if (isNativePlatform) {
      try {
        appInfo = await App.getInfo();
      } catch (e) {
        console.warn('App.getInfo not available', e);
      }
    }

    console.log('Mobile initialized:', { isNativePlatform, platform: deviceInfo?.platform || 'web' });
  } catch (error) {
    console.error('Error initializing mobile features:', error);
  }
};

/**
 * Check if running on a mobile device
 */
export const isMobile = (): boolean => {
  return isNativePlatform;
};

/**
 * Get device information
 */
export const getDeviceInfo = (): DeviceInfo | null => {
  return deviceInfo;
};

/**
 * Get app information
 */
export const getAppInfo = (): AppInfo | null => {
  return appInfo;
};

/**
 * Configure the status bar (only on native platforms)
 */
export const configureStatusBar = async (): Promise<void> => {
  if (!isNativePlatform) return;
  
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#ffffff' });
    await StatusBar.show();
  } catch (error) {
    console.warn('StatusBar not available', error);
  }
};

/**
 * Configure the keyboard (only on native platforms)
 */
export const configureKeyboard = (): void => {
  if (!isNativePlatform) return;
  
  try {
    Keyboard.setAccessoryBarVisible({ isVisible: true });
    Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    
    // Handle keyboard events
    Keyboard.addListener('keyboardWillShow', (info) => {
      console.log('Keyboard will show with height:', info.keyboardHeight);
    });

    Keyboard.addListener('keyboardWillHide', () => {
      console.log('Keyboard will hide');
    });
  } catch (error) {
    console.warn('Keyboard not available', error);
  }
};

/**
 * Take a photo using the device camera
 */
export const takePhoto = async (): Promise<Photo | null> => {
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      saveToGallery: true
    });
    
    return photo;
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
};

/**
 * Share content using the device's share dialog
 */
export const shareContent = async (options: {
  title: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}): Promise<void> => {
  try {
    await Share.share(options);
  } catch (error) {
    console.error('Error sharing content:', error);
  }
};

/**
 * Save data to device storage
 */
export const saveToStorage = async (key: string, value: string): Promise<void> => {
  if (isNativePlatform) {
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
};

/**
 * Get data from device storage
 */
export const getFromStorage = async (key: string): Promise<string | null> => {
  if (isNativePlatform) {
    const { value } = await Preferences.get({ key });
    return value;
  } else {
    return localStorage.getItem(key);
  }
};

/**
 * Remove data from device storage
 */
export const removeFromStorage = async (key: string): Promise<void> => {
  if (isNativePlatform) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
};

// Initialize mobile features when this module is loaded
initMobile().catch(console.error);
