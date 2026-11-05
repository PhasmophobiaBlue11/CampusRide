// CampusRide — Direct Google Maps Redirection Helper
// Replaces in-app map rendering with direct Google Maps deep-links
window.openGoogleMaps = function(lat, lng, label = '') {
  if (lat === undefined || lng === undefined) return;
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  window.open(url, '_blank');
};

class CampusLiveMap {
  constructor() {}
  init() {}
  updateVanLocation() {}
  plotStudentStops() {}
}

window.CampusLiveMap = CampusLiveMap;
