// Enum type for attribute states.
export const AttributeStatus = Object.freeze({
  Normal: 0,
  LockedOut: 1,
  Wounded: 2,
});

export const CooldownType = Object.freeze({
  None: 0,
  Ignite: 1,
  Exhaust: 2,
});

// Enum type for attribute states.
export const GiftEquipStatus = Object.freeze({
  Unequipped: 0,
  Equipped: 1,
  Primary: 2,
});

// The game's core roll types and their associated strings.
export const RollTypes = Object.freeze({
  RollToDo: {
    DisplayName: "Roll To Do",
    FunctionName: "rollToDo",
  },
  RollToDye: {
    DisplayName: "Roll To Dye",
    FunctionName: "rollToDye",
  },
  RecoveryRoll: {
    DisplayName: "Recovery Roll",
    FunctionName: "recoveryRoll",
  },
});

export const AttributeStatusStrings = new Map([
  [AttributeStatus.Normal, "Normal"],
  [AttributeStatus.LockedOut, "Locked Out"],
  [AttributeStatus.Wounded, "Wounded"],
]);

export const AttributeCooldownStrings = new Map([
  [CooldownType.None, ""],
  [CooldownType.Ignite, "Ignited"],
  [CooldownType.Exhaust, "Exhausted"],
]);

export function rollRating(num) {
  if (num <= 5) {
    return "Pathetic";
  } else if (num <= 10) {
    return "Easy";
  } else if (num <= 15) {
    return "Normal";
  } else if (num <= 20) {
    return "Hard";
  } else if (num <= 25) {
    return "Very Hard";
  } else if (num <= 30) {
    return "Extreme";
  } else {
    return "Unrankable";
  }
}
