import { AttributeStatus } from "../enums.mjs";

export class AttributeData extends foundry.abstract.DataModel {
    static defineSchema() {
        return {
            color: new foundry.data.fields.ArrayField(new foundry.data.fields.NumberField({
                min: 0,
                max: 1
            }), {
                initial: [1, 1, 1]
            }),
            modifier: new foundry.data.fields.NumberField({
                integer: true,
                initial: 0,
                min: 0
            }),
            status: new foundry.data.fields.NumberField({
                integer: true,
                initial: AttributeStatus.Normal
            }),
            customTokenImagePath: new foundry.data.fields.StringField({
                initial: "icons/svg/mystery-man.svg"
            })
        };
    }
}

export class Attribute {
    static RegisterHandlebarsHelpers() {
        Handlebars.registerHelper('isStatusNormal', function (attribute) {
            return attribute.system.status == AttributeStatus.Normal;
        });

        Handlebars.registerHelper('isStatusLockedOut', function (attribute) {
            return attribute.system.status == AttributeStatus.LockedOut;
        });

        Handlebars.registerHelper('isStatusWounded', function (attribute) {
            return attribute.system.status == AttributeStatus.Wounded;
        });
    }
}