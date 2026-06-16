import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { Device } from '@capacitor/device';

export const initCapacitor = async () => {
  // Set app version in the app
  const setAppVersion = async () => {
    const info = await App.getInfo();
    const versionEl = document.getElementById('app-version');
    if (versionEl) {
      versionEl.textContent = `v${info.version} (${info.build})`;
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
  const configureKeyboard = () => {
    try {
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
    } catch (e) {
      console.warn('Keyboard not available', e);
    }
  };

  // Handle app state changes
  const setupAppStateListeners = () => {
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active?', isActive);
    });

    App.addListener('appUrlOpen', (data) => {
      console.log('App opened with URL:', data);
      // Handle deep links here
    });
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
    console.error('Error initializing Capacitor:', error);
  }
};

// Export platform detection
let isNativePlatform = false;

export const checkPlatform = async () => {
  if (typeof window !== 'undefined') {
    const { platform } = await Device.getInfo();
    isNativePlatform = platform !== 'web';
  }
  return isNativePlatform;
};

export const isNative = () => isNativePlatform;
