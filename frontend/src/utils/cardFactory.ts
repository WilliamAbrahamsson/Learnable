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
  hasBorders: false,
  borderColor: 'transparent',
  borderOpacityWhenMoving: 0,
  lockRotation: true,
  lockScalingX: false,
  lockScalingY: false,
  lockScalingFlip: true,
  subTargetCheck: true,
  hoverCursor: 'move',
  cornerSize: 10,
  cornerStyle: 'circle' as const,
  cornerColor: '#6366F1',
  cornerStrokeColor: '#FFFFFF',
  transparentCorners: false,
  padding: 0,
});

const applyControlVisibility = (group: Group) => {
  group.setControlsVisibility({
    mt: true,
    mb: true,
    ml: true,
    mr: true,
    tl: true,
    tr: true,
    bl: true,
    br: true,
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
    const defaultX = typeof card.x === 'number' ? card.x : 100;
    const defaultY =
      typeof card.y === 'number' ? card.y : 100 + index * (CARD_HEIGHT + CARD_PADDING);

    const finalizeCard = (
      group: Group,
      cardWidth: number,
      cardHeight: number
    ) => {
      (group as any).cardId = card.id;
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
        // fixed card size like text cards
        const cardWidth = card.width ?? CARD_WIDTH;
        const cardHeight = card.height ?? CARD_HEIGHT;

        // scale image proportionally to fit inside the card
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

        // background frame with rounded corners and shadow
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

        // add hover area behind everything
        const hoverArea = createHoverArea(cardWidth, cardHeight, HOVER_PADDING);

        const cardGroup = new Group(
          [hoverArea, background, img],
          baseGroupOptions(defaultX, defaultY)
        );

        // keep image fitting frame even after scaling
        cardGroup.on('scaling', () => {
          const scaleX = cardGroup.scaleX || 1;
          const scaleY = cardGroup.scaleY || 1;
          background.set({ scaleX: 1, scaleY: 1 });
          img.set({
            scaleX: scale * (1 / scaleX),
            scaleY: scale * (1 / scaleY),
          });
          canvas.renderAll();
        });

        cardGroup.on('modified', () => {
          background.set({ scaleX: 1, scaleY: 1 });
          img.set({
            scaleX: scale,
            scaleY: scale,
          });
          canvas.renderAll();
        });

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

    const cardGroup = new Group(
      [hoverArea, background, titleText, descText],
      baseGroupOptions(defaultX, defaultY)
    );

    const adjustTextScaling = () => {
      const scaleX = cardGroup.scaleX || 1;
      const scaleY = cardGroup.scaleY || 1;
      titleText.set({
        width: (cardWidth - 40) * scaleX,
        scaleX: 1 / scaleX,
        scaleY: 1 / scaleY,
      });
      descText.set({
        width: (cardWidth - 40) * scaleX,
        scaleX: 1 / scaleX,
        scaleY: 1 / scaleY,
      });
      background.set({ scaleX: 1, scaleY: 1 });
      canvas.renderAll();
    };

    cardGroup.on('scaling', adjustTextScaling);
    cardGroup.on('modified', adjustTextScaling);

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
