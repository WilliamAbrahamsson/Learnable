import { Canvas, Object as FabricObject } from 'fabric';

/** Safe bring-to-front for Fabric v4/v5. */
export function bringToFront(canvas: Canvas, obj: FabricObject) {
  const anyCanvas = canvas as any;
  const anyObj = obj as any;
  if (typeof anyCanvas.bringToFront === 'function') {
    anyCanvas.bringToFront(anyObj);
  } else if (typeof anyCanvas.bringObjectToFront === 'function') {
    anyCanvas.bringObjectToFront(anyObj);
  } else if (typeof anyObj.bringToFront === 'function') {
    anyObj.bringToFront();
  }
}

/** Safe send-to-back for Fabric v4/v5. */
export function sendToBack(canvas: Canvas, obj: FabricObject) {
  const anyCanvas = canvas as any;
  const anyObj = obj as any;
  if (typeof anyCanvas.sendToBack === 'function') {
    anyCanvas.sendToBack(anyObj);
  } else if (typeof anyCanvas.sendObjectToBack === 'function') {
    anyCanvas.sendObjectToBack(anyObj);
  } else if (typeof anyObj.sendToBack === 'function') {
    anyObj.sendToBack();
  }
}
