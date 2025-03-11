export default class GiftSheet extends ItemSheet {
  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["heartcore", "sheet", "gift"],
      template: "systems/heartcore/templates/gift-sheet.html",
      width: 600,
      height: 600,
    });
  }

  /** @inheritdoc */
  async getData(options) {
    const context = await super.getData(options);

    await this.#populateDescription(context);
    return context;
  }

  /**
   * Transform the raw description property into enriched HTML and embed it into the context for easy access.
   * @param context
   * @private
   */
  async #populateDescription(context) {
    context.descriptionHTML = await TextEditor.enrichHTML(
      context.data.system.description,
      {
        secrets: this.document.isOwner,
        async: true,
      },
    );
  }
}
