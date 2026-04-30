// File: src/utils/geocoding.ts

// 1. Forward Geocoding: Converts "Connaught Place, Delhi" -> [Lat, Lng]
export const searchAddress = async (query: string): Promise<[number, number] | null> => {
  if (!query) return null;
  try {
    // Nominatim API endpoint for forward geocoding
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
    const data = await response.json();
    
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

// 2. Reverse Geocoding: Converts [Lat, Lng] -> "Sector 62, Noida, UP"
export const getAddressFromCoords = async (lat: number, lng: number): Promise<string | null> => {
  try {
    // Nominatim API endpoint for reverse geocoding
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
    const data = await response.json();
    
    if (data && data.display_name) {
      // Return a shortened, cleaner version of the address
      const parts = data.display_name.split(', ');
      return parts.slice(0, 3).join(', '); // Keeps it readable (e.g., "Building, Street, City")
    }
    return null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
};