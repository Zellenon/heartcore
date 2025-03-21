export default class ResourceSheet extends ItemSheet {
  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["heartcore", "sheet", "resource"],
      template: "systems/heartcore/templates/resource-sheet.html",
    });
  }

  /** @inheritdoc */
  async getData(options) {
    const context = await super.getData(options);

    return context;
  }
}
