export class ResourceData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      min: new foundry.data.fields.NumberField({
        integer: true,
        initial: 0,
        min: -99999,
      }),
      max: new foundry.data.fields.NumberField({
        integer: true,
        initial: 0,
        min: -99998,
      }),
      value: new foundry.data.fields.NumberField({
        integer: true,
        initial: 0,
        min: -99999,
      }),
    };
  }
}
