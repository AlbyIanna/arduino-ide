import { EditorManager as TheiaEditorManager } from '@theia/editor/lib/browser/editor-manager';

export class EditorManager extends TheiaEditorManager {
  protected override getOrCreateCounterForUri(): number {
    return 0;
  }
}
