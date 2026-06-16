import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { Device } from '@capacitor/device';

export const initCapacitor = async () => {
  // Set app version in the app
  const setAppVersion = async () => {
    try {
      const info = await App.getInfo();
      const versionEl = document.getElementById('app-version');
      if (versionEl) {
        versionEl.textContent = `v${info.version} (${info.build})`;
      }
    } catch (e) {
      console.warn('App.getInfo not available', e);
    }
  };

  // Configure status bar
  const configureStatusBar = async () => {
    try {
      const info = await Device.getInfo();
      if (info.platform !== 'web') {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
      }
    } catch (e) {
      console.warn('StatusBar not available', e);
    }
  };

  // Configure keyboard
  const configureKeyboard = async () => {
    try {
      const info = await Device.getInfo();
      if (info.platform !== 'web') {
        Keyboard.setAccessoryBarVisible({ isVisible: true });
        // Set the keyboard to resize the body when it appears
        Keyboard.setResizeMode({ mode: KeyboardResize.Body });

        // Handle keyboard events
        Keyboard.addListener('keyboardWillShow', (info) => {
          console.log('Keyboard will show with height:', info.keyboardHeight);
        });

        Keyboard.addListener('keyboardWillHide', () => {
          console.log('Keyboard will hide');
        });
      }
    } catch (e) {
      console.warn('Keyboard not available', e);
    }
  };

  // Handle app state changes
  const setupAppStateListeners = () => {
    try {
      App.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active?', isActive);
      });

      App.addListener('appUrlOpen', (data) => {
        console.log('App opened with URL:', data);
        // Handle deep links here
      });
    } catch (e) {
      console.warn('App listeners not available', e);
    }
  };

  // Initialize all configurations
  try {
    await Promise.all([
      setAppVersion(),
      configureStatusBar(),
      configureKeyboard(),
    ]);

    setupAppStateListeners();

    console.log('Capacitor initialized successfully');
  } catch (error) {
    console.warn('Some Capacitor features unavailable (expected on web):', error);
  }
};

// Export platform detection
let isNativePlatform = false;

export const checkPlatform = async () => {
  if (typeof window !== 'undefined') {
    try {
      const { platform } = await Device.getInfo();
      isNativePlatform = platform !== 'web';
    } catch (e) {
      console.warn('Device.getInfo not available, assuming web platform', e);
      isNativePlatform = false;
    }
  }
  return isNativePlatform;
};

export const isNative = () => isNativePlatform;
