import {
  AttributeStatus,
  CooldownType,
  RollTypes,
  rollRating,
} from "../enums.mjs";

export const AttributeIdNoSwing = "ATTRIBUTE_ID_NO_SWING";

export class CharacterData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      description: new foundry.data.fields.HTMLField(),
      health: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({
          integer: true,
          initial: 10,
        }),
        min: new foundry.data.fields.NumberField({
          integer: true,
          initial: 0,
        }),
        max: new foundry.data.fields.NumberField({
          integer: true,
          initial: 10,
        }),
      }),
      spirit: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({
          integer: true,
          initial: 0,
        }),
        min: new foundry.data.fields.NumberField({
          integer: true,
          initial: 0,
        }),
        max: new foundry.data.fields.NumberField({
          integer: true,
          initial: 3,
        }),
      }),
      speed: new foundry.data.fields.NumberField({
        integer: true,
        min: 0,
        initial: 30,
      }),
      experience: new foundry.data.fields.NumberField({
        integer: true,
        min: 0,
        initial: 0,
      }),
      swing: new foundry.data.fields.SchemaField({
        attributeId: new foundry.data.fields.StringField({
          initial: AttributeIdNoSwing,
        }),
        value: new foundry.data.fields.NumberField({
          integer: true,
          min: 0,
          initial: 0,
        }),
      }),
      swingTokenImages: new foundry.data.fields.SchemaField({
        enabled: new foundry.data.fields.BooleanField({ initial: false }),
        defaultTokenImagePath: new foundry.data.fields.StringField({
          initial: "icons/svg/mystery-man.svg",
        }),
      }),
    };
  }
}

/**
 * @extends {Actor}
 */
export class Character extends Actor {
  static RegisterHandlebarsHelpers() {
    Handlebars.registerHelper("attributeBackgroundColor", function (attribute) {
      return attribute
        ? foundry.utils.Color.fromString(attribute.system.color).toRGBA(0.25)
        : "transparent";
    });
  }

  /**
   * Returns an array of the character's attributes, culled from the set of all owned items.
   */
  getAttributes() {
    return this.items.filter((item) => item.type === "attribute");
  }

  /**
   * Returns the attribute associated with the character's current swing, or undefined if no matching attribute is found.
   */
  #getSwingAttribute() {
    return this.items.find(
      (item) => item._id === this.system.swing.attributeId,
    );
  }

  /**
   * Perform a Roll to Do and display the result as a chat message.
   * @param additionalDiceFormula
   */
  async rollToDo(additionalDiceFormula) {
    const swingAttribute = this.#getSwingAttribute();
    const swingValue = this.system.swing.value;

    const d20Roll = await new Roll("1d20").evaluate();
    let rolls = [d20Roll];

    const templatePath = "systems/heartcore/templates/chat/roll-to-do.html";
    let templateValues = {
      d20Roll: d20Roll.total,
      toHit: d20Roll.total,
      effect: 0,
      critSuccess: d20Roll.total == 20,
      critFail: d20Roll.total == 1,
      rating: "",
    };

    if (swingAttribute) {
      templateValues.attribute = swingAttribute;
      templateValues.swingValue = swingValue;
      templateValues.toHit += swingValue;
      templateValues.effect += swingValue;
    } else {
      const d6Roll = await new Roll("1d6").evaluate();
      rolls.push(d6Roll);
      templateValues.d6Roll = d6Roll.total;
      templateValues.toHit += d6Roll.total;
      templateValues.effect += d6Roll.total;

      let dialogCanceled = false;
      const chosenAttribute =
        await this.#renderRollToDoChooseAttributeDialog().catch(() => {
          dialogCanceled = true;
        });

      if (dialogCanceled) {
        return;
      }

      templateValues.attribute = chosenAttribute;
      const attributeModifier = chosenAttribute?.system.modifier ?? 0;
      templateValues.attributeModifier = "+" + attributeModifier;
      templateValues.toHit += attributeModifier;
      templateValues.effect += attributeModifier;
    }

    if (additionalDiceFormula?.toHit) {
      const additionalRollToHit = await new Roll(
        additionalDiceFormula.toHit,
      ).evaluate();
      rolls.push(additionalRollToHit);
      templateValues.additionalDiceToHit = {
        formula: additionalRollToHit.formula,
        dice: additionalRollToHit.dice.map((diceTerm) =>
          diceTerm.getTooltipData(),
        ),
      };

      templateValues.toHit += additionalRollToHit.total;
    }

    if (additionalDiceFormula?.toEffect) {
      const additionalRollToEffect = await new Roll(
        additionalDiceFormula.toEffect,
      ).evaluate();
      rolls.push(additionalRollToEffect);
      templateValues.additionalDiceToEffect = {
        formula: additionalRollToEffect.formula,
        dice: additionalRollToEffect.dice.map((diceTerm) =>
          diceTerm.getTooltipData(),
        ),
      };

      templateValues.effect += additionalRollToEffect.total;
    }

    templateValues.rating = rollRating(templateValues.toHit);

    return this.#renderRollMessage(templatePath, templateValues, rolls);
  }

  /**
   * Render a dialog allowing the user to choose which attribute they wish to use for a Roll to Do.
   * @private
   */
  async #renderRollToDoChooseAttributeDialog() {
    const attributes = this.getAttributes();
    const contentTemplatePath =
      "systems/heartcore/templates/chat/roll-to-do-choose-attribute.html";
    const content = await renderTemplate(contentTemplatePath, {});

    return new Promise((resolve, reject) => {
      let buttons = {};

      attributes
        .filter(
          (attribute) => attribute.system.status == AttributeStatus.Normal,
        )
        .forEach(
          (attribute) =>
            (buttons[attribute._id] = {
              label: attribute.name + " (+" + attribute.system.modifier + ")",
              callback: () => {
                resolve(attribute);
              },
            }),
        );

      buttons.wild = {
        label: "Wild",
        callback: () => {
          resolve(null);
        },
      };

      const chooseAttributeDialog = {
        title: "Roll To Do",
        content: content,
        buttons: buttons,
        close: () => {
          reject();
        },
      };

      new Dialog(chooseAttributeDialog).render(true);
    });
  }

  /**
   * Render an HTML template with arguments as a chat message with this character as the speaker.
   * @param templatePath
   * @param args
   * @param messageOptions
   * @private
   */
  async #renderToChatMessage(templatePath, args, messageOptions = {}) {
    const html = await renderTemplate(templatePath, args);
    let message = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: html,
    };

    message = foundry.utils.mergeObject(message, messageOptions);
    ChatMessage.applyRollMode(message, game.settings.get("core", "rollMode"));

    return ChatMessage.create(message);
  }

  /**
   * Render an HTML template with arguments as a roll-containing chat message with this character as the speaker.
   * @param templatePath
   * @param args
   * @param rolls
   * @private
   */
  async #renderRollMessage(templatePath, args, rolls) {
    const messageOptions = {
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      sound: CONFIG.sounds.dice,
      rolls,
    };

    return this.#renderToChatMessage(templatePath, args, messageOptions);
  }

  /**
   * Perform a Roll to Dye and display the result as a chat message.
   * @param additionalDiceFormula
   */
  async rollToDye(additionalDiceFormula) {
    const rollToDyeOptions = {
      rollTitle: "Roll to Dye",
      totalStrategy: this.#totalAllAttributeRollsAndOnlySwingModifier,
    };

    this.#rollToDyeImpl(rollToDyeOptions, additionalDiceFormula);
  }

  /**
   * Perform a Recovery Roll and display the result as a chat message.
   * @param additionalDiceFormula
   */
  async recoveryRoll(additionalDiceFormula) {
    const rollToDyeOptions = {
      rollTitle: "Recovery Roll",
      totalStrategy: this.#totalAllAttributeRollsAndModifiers,
    };
    const rollToDyeTotal = await this.#rollToDyeImpl(
      rollToDyeOptions,
      additionalDiceFormula,
    );
    const newHealth = Math.min(
      this.system.health.value + rollToDyeTotal,
      this.system.health.max,
    );

    return this.update({
      "system.health.value": newHealth,
    });
  }

  /**
   * Total attribute dice, but only add the modifier of the swing die.
   * @param attributeDice
   * @param swingAttributeDie
   * @private
   */
  #totalAllAttributeRollsAndOnlySwingModifier(
    attributeDice,
    swingAttributeDie,
  ) {
    let total = attributeDice.reduce(
      (total, attributeDie) => total + attributeDie.roll,
      0,
    );
    total += swingAttributeDie?.attribute.system.modifier ?? 0;
    return total;
  }

  /**
   * Total attribute dice including the modifier of each die. The swing die is not treated specially.
   * @param attributeDice
   * @param swingAttributeDie
   * @private
   */
  #totalAllAttributeRollsAndModifiers(attributeDice, swingAttributeDie) {
    return attributeDice.reduce(
      (total, attributeDie) =>
        total + attributeDie.roll + attributeDie.attribute.system.modifier,
      0,
    );
  }

  /**
   * Common implementation of Roll to Dye. Scenario-specific parameters are injected via an options object.
   * @param options
   * @param additionalDiceFormula
   * @private
   */
  async #rollToDyeImpl(options, additionalDiceFormula) {
    const swingAttribute = this.#getSwingAttribute();
    const swingValue = this.system.swing.value;
    const existingSwingAttributeDie = swingAttribute
      ? {
          attribute: swingAttribute,
          roll: swingValue - swingAttribute.system.modifier,
          existing: true,
        }
      : null;

    const attributeDice = await this.#rollAttributeDice(
      existingSwingAttributeDie,
    );
    const additionalDice = additionalDiceFormula?.toEffect
      ? await new Roll(additionalDiceFormula.toEffect).evaluate()
      : null;
    await this.#renderAttributeDice(
      options.rollTitle,
      attributeDice,
      additionalDice,
    );

    const availableAttributeDice = attributeDice.filter(
      (attributeDie) =>
        attributeDie.attribute.system.status == AttributeStatus.Normal,
    );
    this.#tickAttributeIgnitionCooldown();

    const chosenAttributeDie =
      availableAttributeDice.length > 0
        ? await this.#renderChooseSwingDialog(
            options.rollTitle,
            availableAttributeDice,
          )
        : null;
    if (chosenAttributeDie != null) {
      this.update({
        "system.swing.attributeId": chosenAttributeDie.attribute._id,
        "system.swing.value":
          chosenAttributeDie.roll +
          chosenAttributeDie.attribute.system.modifier,
      });
    }

    const newSwingAttributeDie =
      chosenAttributeDie ?? existingSwingAttributeDie;
    const rollToDyeTotal =
      options.totalStrategy(availableAttributeDice, newSwingAttributeDie) +
      (additionalDice ? additionalDice.total : 0);
    this.#renderRollToDyeResult(
      options.rollTitle,
      rollToDyeTotal,
      newSwingAttributeDie,
    );

    return rollToDyeTotal;
  }

  /**
   * Roll a d6 associated with each of the character's attributes. The character's existing swing attribute, if any, is retained at its current value.
   * @param swingAttributeDie
   * @private
   */
  async #rollAttributeDice(swingAttributeDie) {
    let attributeDice = [];

    const attributes = this.getAttributes();
    for (const attribute of attributes) {
      if (attribute._id == swingAttributeDie?.attribute._id) {
        attributeDice.push(swingAttributeDie);
      } else if (attribute.system.status != AttributeStatus.Normal) {
        attributeDice.push({
          attribute: attribute,
          roll: 0,
          existing: false,
        });
      } else {
        const d6Roll = await new Roll("1d6").evaluate();
        attributeDice.push({
          attribute: attribute,
          roll: d6Roll.total,
          rollObject: d6Roll,
          existing: false,
        });
      }
    }

    return attributeDice;
  }

  /**
   * Render a chat message announcing the character's rolls on their attribute dice.
   * @param rollTitle
   * @param attributeDice
   * @param additionalDice
   * @private
   */
  async #renderAttributeDice(rollTitle, attributeDice, additionalDice) {
    let rolls = attributeDice
      .filter((attributeDie) => attributeDie.rollObject)
      .map((attributeDie) => attributeDie.rollObject);

    if (additionalDice) {
      rolls.push(additionalDice);
    }

    const templatePath =
      "systems/heartcore/templates/chat/roll-to-dye-dice.html";
    const templateValues = {
      title: rollTitle,
      attributeDice: attributeDice,
      additionalDice: additionalDice,
    };

    return this.#renderRollMessage(templatePath, templateValues, rolls);
  }

  /**
   * Restore all locked-out attributes to normal status.
   * @private
   */
  #releaseAttributesFromLockout() {
    this.getAttributes()
      .filter(
        (attribute) => attribute.system.status === AttributeStatus.LockedOut,
      )
      .forEach((lockedOutAttribute) =>
        lockedOutAttribute.update({
          "system.status": AttributeStatus.Normal,
          "system.cooldownType": CooldownType.None,
        }),
      );
  }

  /**
   * Restore all locked-out attributes to normal status.
   * @private
   */
  #tickAttributeIgnitionCooldown() {
    this.getAttributes()
      .filter(
        (attribute) => attribute.system.cooldownType === CooldownType.Ignite,
      )
      .forEach((ignitedAttribute) => {
        let cooldown = ignitedAttribute.system.cooldown - 1;
        ignitedAttribute.update({
          "system.status":
            cooldown == 0 ? AttributeStatus.Normal : AttributeStatus.LockedOut,
          "system.cooldownType":
            cooldown == 0 ? CooldownType.None : CooldownType.Ignite,
          "system.cooldown": cooldown,
        });
      });
  }

  /**
   * Render a dialog allowing the user to choose a new swing for the character based on the results of their Roll to Dye.
   * @param dialogTitle
   * @param attributeDice
   * @private
   */
  async #renderChooseSwingDialog(dialogTitle, attributeDice) {
    const contentTemplatePath =
      "systems/heartcore/templates/chat/roll-to-dye-choose-swing.html";
    const content = await renderTemplate(contentTemplatePath, {});

    return new Promise((resolve, reject) => {
      let buttons = {};

      for (let attributeDie of attributeDice) {
        const swingValue =
          attributeDie.roll + attributeDie.attribute.system.modifier;
        buttons[attributeDie.attribute._id] = {
          label: attributeDie.attribute.name + ": " + swingValue,
          callback: () => {
            resolve(attributeDie);
          },
        };
      }

      const chooseSwingDialog = {
        title: dialogTitle,
        content: content,
        buttons: buttons,
        close: () => {
          resolve(null);
        },
      };

      new Dialog(chooseSwingDialog).render(true);
    });
  }

  /**
   * Render a chat message announcing the final result of the character's Roll to Dye including their chosen swing, if any.
   * @param rollTitle
   * @param total
   * @param swingAttributeDie
   * @private
   */
  async #renderRollToDyeResult(rollTitle, total, swingAttributeDie) {
    const templatePath =
      "systems/heartcore/templates/chat/roll-to-dye-result.html";
    let templateValues = {
      title: rollTitle,
      total: total,
    };

    if (swingAttributeDie !== null) {
      templateValues.swingAttribute = swingAttributeDie.attribute;
      templateValues.swingValue =
        swingAttributeDie.roll + swingAttributeDie.attribute.system.modifier;
    }

    return this.#renderToChatMessage(templatePath, templateValues);
  }

  /**
   * Set the charater's swing to the specified attribute and value.
   * @param attributeId
   * @param value
   */
  setSwing(attributeId, value) {
    this.update({
      "system.swing.attributeId": attributeId,
      "system.swing.value": value,
    });
  }

  isColorless() {
    return this.system.swing.attributeId === AttributeIdNoSwing;
  }

  /**
   * Remove the character's swing, if any.
   */
  async removeSwing() {
    if (this.isColorless()) {
      return;
    }

    this.update({
      "system.swing.attributeId": AttributeIdNoSwing,
      "system.swing.value": 0,
    });
  }

  /**
   * Drop the character's swing, if any, without further alteration.
   */
  async dropSwing() {
    if (this.isColorless()) {
      return;
    }
    this.removeSwing();

    const templatePath = "systems/heartcore/templates/chat/drop-swing.html";
    return this.#renderToChatMessage(templatePath, { name: this.name });
  }

  /**
   * Ignites the character's swing, if any.
   */
  async ignite() {
    if (this.isColorless()) {
      return;
    }

    const attribute = this.items.find(
      (item) => item._id === this.system.swing.attributeId,
    );
    attribute.update({
      "system.status": AttributeStatus.LockedOut,
      "system.cooldownType": CooldownType.Ignite,
      "system.cooldown": 1,
    });
    this.removeSwing();

    const templatePath = "systems/heartcore/templates/chat/ignite.html";
    return this.#renderToChatMessage(templatePath, {
      name: this.name,
      color: attribute.name,
    });
  }

  /**
   * Exhausts the character's swing, if any.
   */
  async exhaust() {
    if (this.isColorless()) {
      return;
    }

    const attribute = this.items.find(
      (item) => item._id === this.system.swing.attributeId,
    );
    attribute.update({
      "system.status": AttributeStatus.LockedOut,
      "system.cooldownType": CooldownType.Exhaust,
      "system.cooldown": 1,
    });
    this.removeSwing();

    const templatePath = "systems/heartcore/templates/chat/exhaust.html";
    return this.#renderToChatMessage(templatePath, {
      name: this.name,
      color: attribute.name,
    });
  }

  /**
   * Set the status of the specified attribute.
   * @param attributeId
   * @param status
   */
  setAttributeStatus(attributeId, status) {
    const attribute = this.items.find((item) => item._id === attributeId);
    attribute.update({ "system.status": status });

    if (
      attributeId === this.system.swing.attributeId &&
      status !== AttributeStatus.Normal
    ) {
      this.dropSwing();
    }

    if (status == AttributeStatus.Normal) {
      attribute.update({ "system.cooldownType": CooldownType.None });
    }
  }

  /**
   * Executes the specified custom roll.
   * @param customRollId
   */
  async executeCustomRoll(customRollId) {
    const customRoll = this.items.find((item) => item._id === customRollId);
    if (!customRoll) {
      throw new Error(
        "Custom Roll with ID " +
          customRollId +
          " not found on Character with ID " +
          this._id,
      );
    }

    const rollFunction = RollTypes[customRoll.system.rollType].FunctionName;
    return this[rollFunction]({
      toHit: customRoll.system.formulaAddedToHit,
      toEffect: customRoll.system.formulaAddedToEffect,
    });
  }

  /** @inheritdoc */
  _onUpdate(changed, options, userId) {
    if (this.isOwner) {
      const newSwingAttributeId = changed.system?.swing?.attributeId;
      const newSwingValue = changed.system?.swing?.value;

      if (newSwingValue !== undefined || newSwingAttributeId) {
        this.#clampSwingValue(newSwingAttributeId, newSwingValue);
      }

      if (newSwingAttributeId && this.system.swingTokenImages.enabled) {
        this.#updateTokenImages(newSwingAttributeId);
      }
    }

    super._onUpdate(changed, options, userId);
  }

  #clampSwingValue(newSwingAttributeId, newSwingValue) {
    const swingAttributeId =
      newSwingAttributeId ?? this.system.swing.attributeId;
    const swingValue = newSwingValue ?? this.system.swing.value;

    if (swingAttributeId === AttributeIdNoSwing) {
      return;
    }

    const swingAttribute = this.items.find(
      (item) => item._id === swingAttributeId,
    );
    const swingMin = swingAttribute.system.modifier + 1;
    const swingMax = swingAttribute.system.modifier + 6;

    let clampedSwingValue = Math.max(swingValue, swingMin);
    clampedSwingValue = Math.min(clampedSwingValue, swingMax);

    if (clampedSwingValue !== swingValue) {
      this.update({ "system.swing.value": clampedSwingValue });
    }
  }

  #updateTokenImages(newSwingAttributeId) {
    const customTokenImagePath =
      newSwingAttributeId != AttributeIdNoSwing
        ? this.items.find((item) => item._id === newSwingAttributeId).system
            .customTokenImagePath
        : this.system.swingTokenImages.defaultTokenImagePath;

    const targetTokens = [];

    if (this.isToken) {
      targetTokens.push(this.token);
    } else {
      targetTokens.push(this.prototypeToken);
      this.getDependentTokens()
        .filter((token) => token.actorLink)
        .forEach((token) => targetTokens.push(token));
    }

    targetTokens.forEach((token) =>
      token.update({ "texture.src": customTokenImagePath }),
    );
  }
}
