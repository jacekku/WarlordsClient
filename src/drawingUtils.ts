import CanvasDrawer from "./canvasDrawer";
import { getImage, ImageType } from "./imageUtils";
import { Block, Terrain, Chunk, PlayerState, Building } from "./model/Models";
import Utilities from "./Utilities";

const IMAGES: Map<string, any> = new Map();
const errorImage = new Image();
errorImage.src = mapImageToString("error", "base");

function loadImage(src: string) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    function cleanup() {
      image.onload = null;
      image.onerror = null;
    }

    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = (err) => {
      cleanup();
      reject(err);
    };

    image.src = src;
  });
}

function getBlockColor(block: Block) {
  if (block.biome == "MOUNTAIN") return "gray";
  if (block.biome == "PLAIN") return "#44ae2a";
  if (block.biome == "BEACH") return "yellow";
  if (block.biome == "DEEP_WATER") return "darkblue";
  if (block.biome == "SHALLOW_WATER") return "blue";
  if (block.biome == "HILLS") return "#1b6e07";
  return "black";
}

function drawPlayers(drawer: CanvasDrawer, players: any[], blockSize: number) {
  drawer.push();
  drawer.fill("white");
  drawer.stroke("black");
  drawer.textSize(10);
  const img = mapImageToString("knight", "map");
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (player && img) {
      drawer.image(
        img,
        player.x * blockSize,
        player.y * blockSize,
        blockSize,
        blockSize
      );
    }
    drawer.text(player.name, player.x * blockSize, player.y * blockSize);
  }
  drawer.pop();
}

function findChunkByXY(blockX: number, blockY: number, terrain: Terrain) {
  return {
    x: Math.floor(blockX / terrain.chunkSize) * terrain.chunkSize,
    y: Math.floor(blockY / terrain.chunkSize) * terrain.chunkSize,
  };
}
function draw(
  drawer: CanvasDrawer,
  terrain: Terrain,
  chunks: Chunk[],
  players: { x: number; y: number }[],
  thisPlayer: { x: number; y: number },
  buildings: Building[],
  blockSize: number,
  frustumSize: number,
  playerState: PlayerState,
  pointer: { x: number; y: number },
  selectedBlock: Block
) {
  drawer.background("gray");
  drawer.push();
  if (terrain && chunks) {
    const frustum = Utilities.getFrustum(thisPlayer, terrain, frustumSize);
    // pointer = getPointer(frustum);
    drawer.translate(-frustum.x * blockSize, -frustum.y * blockSize);

    const frustumChunks = [
      findChunkByXY(frustum.x, frustum.y, terrain),
      findChunkByXY(frustum.x, frustum.y + frustumSize, terrain),
      findChunkByXY(frustum.x + frustumSize, frustum.y, terrain),
      findChunkByXY(frustum.x + frustumSize, frustum.y + frustumSize, terrain),
    ];
    const visibleChunks = chunks.filter((chunk: { x: any; y: any }) => {
      return !!frustumChunks.find((XY) => XY.x === chunk.x && XY.y === chunk.y);
    });
    for (let chunkIndex = 0; chunkIndex < visibleChunks.length; chunkIndex++) {
      if (!visibleChunks[chunkIndex]) continue;

      const chunk = visibleChunks[chunkIndex];
      // drawChunk(drawer, terrain, chunk, blockSize);
      for (let blockIndex = 0; blockIndex < chunk.blocks.length; blockIndex++) {
        const block = chunk.blocks[blockIndex];
        drawBlock(drawer, block, blockSize);
      }
    }
    drawBuildings(drawer, buildings, blockSize);
    drawPlayers(drawer, players, blockSize);
    if (selectedBlock) drawSelectedBlock(drawer, selectedBlock, blockSize);

    if (playerState.state.includes("building")) {
      drawer.fill("#0f04");
      drawer.rect(
        thisPlayer.x * blockSize - blockSize,
        thisPlayer.y * blockSize - blockSize,
        3 * blockSize,
        3 * blockSize
      );
      const block = Utilities.findBlockByXY(
        pointer.x,
        pointer.y,
        terrain,
        chunks
      );
      const nearPlayer = Utilities.objectNearEachOther(
        { x: thisPlayer.x, y: thisPlayer.y },
        block || { x: -10, y: -10 }
      );
      if (nearPlayer && block) {
        drawBuilding(
          drawer,
          {
            name: playerState.detail.building,
            x: block.x,
            y: block.y,
          } as Building,
          blockSize
        );
        drawSelectedBlock(drawer, block, blockSize);
      }
    }
    if (playerState.state == "building:chosen" && selectedBlock) {
      drawBuilding(
        drawer,
        {
          name: playerState.detail.building,
          x: selectedBlock.x,
          y: selectedBlock.y,
        } as Building,
        blockSize
      );
    }

    // if (selectedBlock) drawSelectedBlock(selectedBlock);
    drawer.pop();
  }
}

function drawSelectedBlock(
  drawer: CanvasDrawer,
  selectedBlock: { x: number; y: number },
  blockSize: number
) {
  drawer.push();
  drawer.stroke("red");
  drawer.strokeRect(
    selectedBlock.x * blockSize,
    selectedBlock.y * blockSize,
    blockSize,
    blockSize
  );
  drawer.pop();
}

function mapImageToString(name: string, TYPE: ImageType) {
  name = name.toLowerCase();
  if (name == "none") return;
  if (IMAGES.has(name)) return IMAGES.get(name);
  loadImage(getImage(name, TYPE))
    .then((img) => IMAGES.set(name, img))
    .catch((err: any) => IMAGES.set(name, IMAGES.get("error")));

  return IMAGES.get("error");
}

function drawBlock(drawer: CanvasDrawer, block: Block, blockSize: number) {
  drawer.fill(getBlockColor(block));
  drawer.rect(
    block.x * blockSize,
    block.y * blockSize,
    blockSize + 1,
    blockSize + 1
  );
  const biomeImg = mapImageToString(block.biome, "map");
  if (biomeImg) {
    drawer.image(
      biomeImg,
      block.x * blockSize,
      block.y * blockSize,
      blockSize,
      blockSize
    );
  }

  const materialRichnessImg = mapImageToString(block.materials, "map");
  if (materialRichnessImg) {
    drawer.image(
      materialRichnessImg,
      block.x * blockSize,
      block.y * blockSize,
      blockSize,
      blockSize
    );
  }
  const animalsImg = mapImageToString(block.animals, "map");
  if (animalsImg) {
    drawer.image(
      animalsImg,
      block.x * blockSize,
      block.y * blockSize,
      blockSize,
      blockSize
    );
  }
  const moistureImg = mapImageToString(block.moisture, "map");
  if (moistureImg) {
    drawer.image(
      moistureImg,
      block.x * blockSize,
      block.y * blockSize,
      blockSize,
      blockSize
    );
  }
}

function drawChunk(
  drawer: CanvasDrawer,
  terrain: Terrain,
  chunk: { x: number; y: number },
  blockSize: number
) {
  const chunkSize = terrain.chunkSize;
  const chunkX = chunk.x * blockSize;
  const chunkY = chunk.y * blockSize;
  drawer.stroke("red");
  drawer.strokeRect(
    chunkX,
    chunkY,
    chunkSize * blockSize,
    chunkSize * blockSize
  );
}

function drawBuildings(
  drawer: CanvasDrawer,
  buildings: any[],
  blockSize: number
) {
  buildings.forEach((building: any) =>
    drawBuilding(drawer, building, blockSize)
  );
}

function drawBuilding(
  drawer: CanvasDrawer,
  building: Building,
  blockSize: number
) {
  let img: CanvasImageSource = mapImageToString(building.name, "buildings");
  if (!img) {
    return;
  }
  if (building.growable) {
    const growthStage = building.growable.growthStage || 0;
    drawer.ctx.drawImage(
      img,
      growthStage * 16,
      0,
      16,
      16,
      building.x * blockSize,
      building.y * blockSize,
      blockSize,
      blockSize
    );
    return;
  }
  drawer.image(
    img,
    building.x * blockSize,
    building.y * blockSize,
    blockSize,
    blockSize
  );
}

export { draw };
