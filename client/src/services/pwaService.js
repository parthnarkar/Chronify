/**
 * PWA Service Worker Registration
 */

// Register service worker
export const registerSW = async () => {
  if ('serviceWorker' in navigator) {
    try {
      console.log('🔧 Registering service worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('✅ Service Worker registered successfully:', registration.scope);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New content is available, notify user
                showUpdateAvailable();
              } else {
                // Content is cached for the first time
                console.log('📱 App is ready for offline use');
                showOfflineReady();
              }
            }
          });
        }
      });

      // Handle service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📨 Message from service worker:', event.data);
      });

      // Register for background sync (if supported)
      if ('sync' in window.ServiceWorkerRegistration.prototype) {
        registration.sync.register('background-sync')
          .then(() => console.log('🔄 Background sync registered'))
          .catch(err => console.log('❌ Background sync registration failed:', err));
      }

      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  } else {
    console.warn('⚠️ Service Workers are not supported in this browser');
  }
};

// Unregister service worker
export const unregisterSW = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        console.log('✅ Service Worker unregistered');
      }
    } catch (error) {
      console.error('❌ Error unregistering service worker:', error);
    }
  }
};

// Update service worker
export const updateSW = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        console.log('🔄 Service Worker update check complete');
      }
    } catch (error) {
      console.error('❌ Error updating service worker:', error);
    }
  }
};

// Skip waiting for new service worker
export const skipWaiting = () => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
};

// Show update available notification
const showUpdateAvailable = () => {
  // Create a simple notification banner
  const banner = document.createElement('div');
  banner.id = 'pwa-update-banner';
  banner.className = 'fixed top-0 left-0 right-0 bg-blue-600 text-white p-3 text-center z-[10000] shadow-lg';
  banner.innerHTML = `
    <div class="flex items-center justify-center gap-3">
      <span>📱 New version available!</span>
      <button id="pwa-update-btn" class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors">
        Update Now
      </button>
      <button id="pwa-dismiss-btn" class="text-blue-200 hover:text-white transition-colors ml-2">
        ✕
      </button>
    </div>
  `;

  document.body.appendChild(banner);

  // Handle update button click
  document.getElementById('pwa-update-btn').addEventListener('click', () => {
    skipWaiting();
    window.location.reload();
  });

  // Handle dismiss button click
  document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
    document.body.removeChild(banner);
  });

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    const existingBanner = document.getElementById('pwa-update-banner');
    if (existingBanner) {
      document.body.removeChild(existingBanner);
    }
  }, 10000);
};

// Show offline ready notification
const showOfflineReady = () => {
  // Create a simple success notification
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-[10000] max-w-sm';
  notification.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
        </svg>
      </div>
      <div>
        <h4 class="font-semibold text-sm">App Ready for Offline Use</h4>
        <p class="text-sm text-green-100 mt-1">You can now use Chronify even without an internet connection!</p>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    notification.style.transition = 'all 0.3s ease-in-out';
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 5000);
};

// Check if app was installed
export const isAppInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

// Prompt to install PWA
export const promptInstall = () => {
  // This will be handled by the browser's native install prompt
  // We can listen for the 'beforeinstallprompt' event
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show custom install button/banner
    showInstallPrompt(deferredPrompt);
  });
};

// Show custom install prompt
const showInstallPrompt = (deferredPrompt) => {
  if (isAppInstalled()) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.className = 'fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-[10000]';
  banner.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="font-semibold text-gray-900 text-sm">Install Chronify</h4>
        <p class="text-gray-600 text-sm">Add to your home screen for quick access and offline use</p>
      </div>
      <div class="flex gap-2">
        <button id="pwa-install-btn" class="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors">
          Install
        </button>
        <button id="pwa-install-dismiss" class="text-gray-400 hover:text-gray-600 transition-colors p-2">
          ✕
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  // Handle install button click
  document.getElementById('pwa-install-btn').addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ PWA installed by user');
      } else {
        console.log('❌ PWA installation declined');
      }
      
      deferredPrompt = null;
      document.body.removeChild(banner);
    }
  });

  // Handle dismiss button click
  document.getElementById('pwa-install-dismiss').addEventListener('click', () => {
    document.body.removeChild(banner);
  });

  // Auto-dismiss after 15 seconds
  setTimeout(() => {
    const existingBanner = document.getElementById('pwa-install-banner');
    if (existingBanner) {
      document.body.removeChild(existingBanner);
    }
  }, 15000);
};

// Initialize PWA features
export const initPWA = () => {
  registerSW();
  promptInstall();
  
  // Log PWA status
  console.log('📱 PWA Features:', {
    serviceWorkerSupported: 'serviceWorker' in navigator,
    isInstalled: isAppInstalled(),
    isOnline: navigator.onLine,
    pushSupported: 'PushManager' in window,
    backgroundSyncSupported: 'sync' in window.ServiceWorkerRegistration.prototype
  });
};