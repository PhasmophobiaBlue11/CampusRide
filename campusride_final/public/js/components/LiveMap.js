// CampusRide — Direct Google Maps Redirection Helper
// Replaces in-app map rendering with direct Google Maps deep-links

window.openMapsUrl = function(url) {
  if (!url) return;
  try {
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      // In Cordova / Capacitor / WebView, _system asks Android OS to launch native Google Maps app
      const win = window.open(url, '_system');
      if (!win) {
        window.location.href = url;
      }
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch (e) {
    window.location.href = url;
  }
};

window.openGoogleMaps = function(lat, lng, label = '') {
  if (lat === undefined || lng === undefined || lat === null || lng === null) return;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng) || (numLat === 0 && numLng === 0)) return;
  
  const url = `https://www.google.com/maps/search/?api=1&query=${numLat},${numLng}`;
  window.openMapsUrl(url);
};

window.openDirectionsTo = function(lat, lng, address = '', originLat = null, originLng = null) {
  const numLat = Number(lat);
  const numLng = Number(lng);
  let url = '';

  const hasOrigin = originLat !== null && originLng !== null && !isNaN(Number(originLat)) && !isNaN(Number(originLng)) && Number(originLat) !== 0 && Number(originLng) !== 0;
  const originParam = hasOrigin ? `&origin=${Number(originLat)},${Number(originLng)}` : '';

  if (!isNaN(numLat) && !isNaN(numLng) && numLat !== 0 && numLng !== 0) {
    url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${numLat},${numLng}&travelmode=driving`;
  } else if (address && address.trim()) {
    url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${encodeURIComponent(address.trim())}&travelmode=driving`;
  }

  if (url) {
    window.openMapsUrl(url);
  } else {
    if (window.showToast) {
      window.showToast('No valid GPS coordinates or address found for navigation.', 'warning');
    }
  }
};

class CampusLiveMap {
  constructor() {}
  init() {}
  updateVanLocation() {}
  plotStudentStops() {}
}

window.CampusLiveMap = CampusLiveMap;
