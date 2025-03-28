export default class AttributeSheet extends ItemSheet {
  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["heartcore", "sheet", "attribute"],
      template: "systems/heartcore/templates/attribute-sheet.html",
    });
  }

  /** @inheritdoc */
  async getData(options) {
    const context = await super.getData(options);
    context.showDescriptiveName = this.object.isEmbedded;
    context.showModifier = this.object.isEmbedded;
    context.showCustomTokenImage = this.object.isEmbedded;

    return context;
  }
}
