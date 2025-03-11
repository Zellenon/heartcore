import { AttributeData, Attribute } from "./documents/attribute.mjs";
import AttributeSheet from "./sheets/attribute-sheet.mjs";

import { GiftData } from "./documents/gift.mjs";
import GiftSheet from "./sheets/gift-sheet.mjs";

import {
    AttributeIdNoSwing,
    CharacterData,
    Character,
} from "./documents/character.mjs";
import CharacterSheet from "./sheets/character-sheet.mjs";

import { CustomRollData } from "./documents/custom-roll.mjs";
import CustomRollSheet from "./sheets/custom-roll-sheet.mjs";

import {
    RollTypes,
    AttributeStatus,
    AttributeStatusStrings,
} from "./enums.mjs";

import tryCreateCharacterMacro from "./macro.mjs";

Hooks.once("init", async function() {
    console.log(`Initializing Heartcore System`);

    CONFIG.Item.dataModels.attribute = AttributeData;
    CONFIG.Item.dataModels.gift = GiftData;
    CONFIG.Item.dataModels.customRoll = CustomRollData;
    CONFIG.Actor.dataModels.character = CharacterData;
    CONFIG.Actor.documentClass = Character;
    CONFIG.Heartcore = {
        RollTypes,
        AttributeStatus,
        AttributeStatusStrings,
        AttributeIdNoSwing,
    };

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("heartcore", AttributeSheet, {
        types: ["attribute"],
        makeDefault: true,
        label: "Attribute Sheet",
    });
    Items.registerSheet("heartcore", GiftSheet, {
        types: ["gift"],
        makeDefault: true,
        label: "Gift Sheet",
    });
    Items.registerSheet("heartcore", CustomRollSheet, {
        types: ["customRoll"],
        makeDefault: true,
        label: "Custom Roll Sheet",
    });

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("heartcore", CharacterSheet, {
        types: ["character"],
        makeDefault: true,
        label: "Character Sheet",
    });

    Attribute.RegisterHandlebarsHelpers();
    Character.RegisterHandlebarsHelpers();
    CharacterSheet.RegisterHandlebarsHelpers();

    await loadTemplates(["systems/heartcore/templates/partials/gift-list.html"]);
});

Hooks.on("hotbarDrop", (bar, data, slot) =>
    tryCreateCharacterMacro(data, slot),
);
