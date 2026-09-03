// Shared vehicle colour list used by all vehicle entry surfaces
// (AI-flow vehicle form, per-panel creation cards, AddVehicleForm, VehicleEditModal)
export const VEHICLE_COLOURS = [
  "Beige", "Black", "Blue", "Brown", "Bronze", "Burgundy", "Charcoal", "Cream",
  "Gold", "Grey", "Green", "Maroon", "Navy", "Orange", "Pink", "Purple",
  "Red", "Silver", "Tan", "Turquoise", "White", "Yellow"
].sort();

// Append-if-missing: keeps legacy free-text colour values selectable/displayable
export const getColourOptions = (currentValue) =>
  currentValue && !VEHICLE_COLOURS.includes(currentValue)
    ? [...VEHICLE_COLOURS, currentValue]
    : VEHICLE_COLOURS;