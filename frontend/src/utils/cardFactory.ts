import { Canvas as FabricCanvas, Rect, Textbox, Group, Shadow, Image } from 'fabric';
import { CardData } from '@/types/canvas';
import { FALLBACK_IMAGE_DATA_URL } from '@/constants/cardDefaults';

const CARD_WIDTH = 280;
const CARD_HEIGHT = 200;
const CARD_PADDING = 30;
const HOVER_PADDING = 25;

const createHoverArea = (width: number, height: number, padding: number) => {
  const hoverArea = new Rect({
    width: width + padding * 2,
    height: height + padding * 2,
    fill: 'transparent',
    stroke: 'transparent',
    left: -padding,
    top: -padding,
    selectable: false,
    evented: true,
    opacity: 0,
    strokeWidth: 0,
    hasBorders: false,
    hasControls: false,
  });

  (hoverArea as any).isHoverArea = true;
  return hoverArea;
};

const baseGroupOptions = (left: number, top: number) => ({
  left,
  top,
  selectable: true,
  hasControls: true,
  hasBorders: true,
  borderColor: '#3F3F3D',
  borderOpacityWhenMoving: 0,
  lockRotation: true,
  lockScalingX: true,
  lockScalingY: true,
  lockScalingFlip: true,
  subTargetCheck: true,
  hoverCursor: 'move',
  cornerSize: 10,
  cornerStyle: 'circle' as const,
  cornerColor: '#3F3F3D',
  cornerStrokeColor: '#3F3F3D',
  transparentCorners: false,
  padding: 0,
});

const applyControlVisibility = (group: Group) => {
  group.setControlsVisibility({
    mt: false,
    mb: false,
    ml: false,
    mr: false,
    tl: false,
    tr: false,
    bl: false,
    br: false,
    mtr: false,
  });
};

export const createCard = (
  canvas: FabricCanvas,
  card: CardData,
  index: number,
  cardGroupsRef: React.MutableRefObject<Map<string, Group>>,
  cardTextRefs: React.MutableRefObject<Map<string, { title: Textbox; desc: Textbox }>>,
  onCreateHandles: (
    canvas: FabricCanvas,
    cardGroup: Group,
    cardId: string,
    cardWidth: number,
    cardHeight: number,
    hoverPadding: number
  ) => void
): Promise<Group | null> => {
  return new Promise((resolve) => {
    // 🔹 Prevent duplicate card creation
    const existingGroup = cardGroupsRef.current.get(card.id);
    if (existingGroup) {
      resolve(existingGroup);
      return;
    }

    // 🔹 Remove any lingering duplicate from canvas
    const duplicate = canvas.getObjects().find(
      (obj: any) => (obj as any).cardId === card.id
    );
    if (duplicate) canvas.remove(duplicate);

    const defaultX = typeof card.x === 'number' ? card.x : 100;
    const defaultY =
      typeof card.y === 'number' ? card.y : 100 + index * (CARD_HEIGHT + CARD_PADDING);

    const finalizeCard = (group: Group, cardWidth: number, cardHeight: number) => {
      (group as any).cardId = card.id;
      // Store dimensions and padding so connection handle math stays accurate on move
      (group as any).cardWidth = cardWidth;
      (group as any).cardHeight = cardHeight;
      (group as any).hoverPadding = HOVER_PADDING;
      applyControlVisibility(group);
      canvas.add(group);
      cardGroupsRef.current.set(card.id, group);
      onCreateHandles(canvas, group, card.id, cardWidth, cardHeight, HOVER_PADDING);
      canvas.requestRenderAll();
      resolve(group);
    };

    // ---------------- IMAGE CARD ----------------
    if (card.type === 'image' && card.imageUrl) {
      const createImageGroup = (img: any) => {
        const cardWidth = card.width ?? CARD_WIDTH;
        const cardHeight = card.height ?? CARD_HEIGHT;

        const scale = Math.min(
          cardWidth / (img.width || cardWidth),
          cardHeight / (img.height || cardHeight)
        );

        img.set({
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
        });

        const background = new Rect({
          width: cardWidth,
          height: cardHeight,
          fill: '#1C1C1C',
          rx: 10,
          ry: 10,
          shadow: new Shadow({
            color: 'rgba(0,0,0,0.4)',
            blur: 12,
            offsetX: 0,
            offsetY: 3,
          }),
        });
        (background as any).isBackground = true;

        const hoverArea = createHoverArea(cardWidth, cardHeight, HOVER_PADDING);

        // Edit button (top-right)
        const btnSize = 22;
        const btnPad = 8;
        const editBg = new Rect({
          left: cardWidth - btnSize - btnPad,
          top: btnPad,
          width: btnSize,
          height: btnSize,
          rx: 6,
          ry: 6,
          fill: '#272725',
          stroke: '#3F3F3D',
          strokeWidth: 1,
          selectable: false,
          evented: true,
          hoverCursor: 'pointer',
        });
        (editBg as any).isEditButton = true;
        const editGlyph = new Textbox('✎', {
          left: cardWidth - btnSize - btnPad + 5,
          top: btnPad + 2,
          width: btnSize - 10,
          height: btnSize - 4,
          fontSize: 14,
          fill: '#C5C1BA',
          selectable: false,
          evented: false,
        });
        (editGlyph as any).isEditGlyph = true;

        const cardGroup = new Group(
          [hoverArea, background, img, editBg, editGlyph],
          baseGroupOptions(defaultX, defaultY)
        );

        // Resizing disabled — no scaling handlers

        finalizeCard(cardGroup, cardWidth, cardHeight);
      };

      const loadImage = async (url: string, triedFallback = false): Promise<void> => {
        const isDataUrl = url.startsWith('data:');
        const options = isDataUrl ? {} : { crossOrigin: 'anonymous' as const };

        try {
          const img = await Image.fromURL(url, options);
          if (!img) throw new Error('Image failed to load');
          createImageGroup(img);
        } catch {
          if (!triedFallback && url !== FALLBACK_IMAGE_DATA_URL) {
            await loadImage(FALLBACK_IMAGE_DATA_URL, true);
          } else {
            resolve(null);
          }
        }
      };

      void loadImage(card.imageUrl);
      return;
    }

    // ---------------- TEXT CARD ----------------
    const cardWidth = card.width ?? CARD_WIDTH;
    const cardHeight = card.height ?? CARD_HEIGHT;
    const hoverArea = createHoverArea(cardWidth, cardHeight, HOVER_PADDING);

    const background = new Rect({
      width: cardWidth,
      height: cardHeight,
      fill: '#1C1C1C',
      rx: 10,
      ry: 10,
      shadow: new Shadow({
        color: 'rgba(0,0,0,0.5)',
        blur: 15,
        offsetX: 0,
        offsetY: 4,
      }),
    });
    (background as any).isBackground = true;

    const titleText = new Textbox(card.title, {
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#C5C1BA',
      left: 20,
      top: 15,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      width: cardWidth - 40,
      selectable: false,
      editable: true,
      splitByGrapheme: true,
    });

    const descText = new Textbox(card.description, {
      fontSize: 12,
      fill: '#C5C1BA',
      left: 20,
      top: 45,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      width: cardWidth - 40,
      selectable: false,
      editable: true,
      splitByGrapheme: true,
    });

    // Edit button (top-right)
    const btnSize = 22;
    const btnPad = 8;
    const editBg = new Rect({
      left: cardWidth - btnSize - btnPad,
      top: btnPad,
      width: btnSize,
      height: btnSize,
      rx: 6,
      ry: 6,
      fill: '#272725',
      stroke: '#3F3F3D',
      strokeWidth: 1,
      selectable: false,
      evented: true,
      hoverCursor: 'pointer',
    });
    (editBg as any).isEditButton = true;
    const editGlyph = new Textbox('✎', {
      left: cardWidth - btnSize - btnPad + 5,
      top: btnPad + 2,
      width: btnSize - 10,
      height: btnSize - 4,
      fontSize: 14,
      fill: '#C5C1BA',
      selectable: false,
      evented: false,
    });
    (editGlyph as any).isEditGlyph = true;

    const cardGroup = new Group(
      [hoverArea, background, titleText, descText, editBg, editGlyph],
      baseGroupOptions(defaultX, defaultY)
    );

    // Resizing disabled — no scaling handlers for text cards

    cardGroup.on('mousedblclick', (e) => {
      const clickedObject = e.subTargets?.[0];
      if (clickedObject && clickedObject.type === 'textbox') {
        const textObj = clickedObject as Textbox;
        canvas.setActiveObject(textObj);
        textObj.enterEditing();
        textObj.selectAll();
        canvas.renderAll();
      }
    });

    cardTextRefs.current.set(card.id, { title: titleText, desc: descText });
    finalizeCard(cardGroup, cardWidth, cardHeight);
  });
};
