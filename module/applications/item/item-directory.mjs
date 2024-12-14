import Item5e from "../../documents/item.mjs";
import DragDropApplicationMixin from "../mixins/drag-drop-mixin.mjs";

/**
 * Items sidebar with added support for item containers.
 */
export default class ItemDirectory5e extends DragDropApplicationMixin(ItemDirectory) {

  /** @override */
  _allowedDropBehaviors(event, data) {
    const allowed = new Set(["copy"]);
    if ( !data.uuid ) return allowed;
    const s = foundry.utils.parseUuid(data.uuid);
    if ( !(s.collection instanceof CompendiumCollection) ) allowed.add("move");
    return allowed;
  }

  /* -------------------------------------------- */

  /** @override */
  _defaultDropBehavior(event, data) {
    if ( !data.uuid ) return "copy";
    if ( data.type !== "Item" ) return "none";
    return foundry.utils.parseUuid(data.uuid).collection === this.collection ? "move" : "copy";
  }

  /* -------------------------------------------- */

  /** @override */
  _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    if ( !data.type ) return;
    const target = event.target.closest(".directory-item") || null;

    // Call the drop handler
    switch ( data.type ) {
      case "Folder":
        return this._handleDroppedFolder(target, data);
      case this.collection.documentName:
        return this._handleDroppedEntry(target, data, event);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _handleDroppedEntry(target, data, event) {
    // Obtain the dropped Document
    const behavior = this._dropBehavior(event, data);
    let item = await this._getDroppedEntryFromData(data);
    if ( (behavior === "none") || !item ) return;

    // Create item and its contents if it doesn't already exist here
    if ( (behavior === "copy") || !this._entryAlreadyExists(item) ) {
      const toCreate = await Item5e.createWithContents([item]);
      const folder = target?.closest("[data-folder-id]")?.dataset.folderId;
      if ( folder ) toCreate.map(d => d.folder = folder);
      [item] = await Item5e.createDocuments(toCreate, {keepId: true});
      if ( behavior === "move" ) fromUuid(data.uuid).then(d => d?.delete({ deleteContents: true }));
    }

    // Otherwise, if it is within a container, take it out
    else if ( item.system.container ) await item.update({"system.container": null});

    // Let parent method perform sorting
    super._handleDroppedEntry(target, item.toDragData());
  }
}
