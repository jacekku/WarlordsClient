<script lang="ts">
import { socket } from "../../socket";
import { MUTATION_TYPE } from "../../types";
import { defineComponent } from "vue";
import Utilities from "../../Utilities";
import { Chunk } from "../../model/Models";

export default defineComponent({
  data() {
    return { socket: socket };
  },
  mounted() {
    window.addEventListener("move", this.handleMove as any);
    window.addEventListener("craft", this.handleCraft as any);
    window.addEventListener("build", this.handleBuild as any);
    window.addEventListener("unequip", this.handleUnequip as any);
    window.addEventListener("equip", this.handleEquip as any);
    window.addEventListener("command", this.sendCommand as any);
    window.addEventListener(
      "command:building",
      this.sendCommandBuilding as any
    );
    socket.on("exception", (data) => alert(JSON.stringify(data.message)));
    socket.on("message", (data) => console.log("socket.on message: " + data));
    socket.on("connect", this.onConnected);
    socket.on("disconnected", this.onDisconnected);
    socket.on("players:all", this.updatePlayers);
    socket.on("players:connect", this.handleConnected);
    socket.on("terrain:info", this.onTerrainInfo);
    socket.on("terrain:chunk", this.onTerrainChunk);
    socket.on("players:update", this.onPlayersUpdate);
    socket.on("buildings:update", this.onBuildingsUpdate);
    socket.on("players:requestUpdate", this.onPlayersRequestUpdate);
    socket.on("buildings:requestUpdate", this.onBuildingsRequestUpdate);
    socket.on("items:update", this.onItemsUpdate);
    socket.on("success", this.onSuccess);
  },
  methods: {
    onSuccess(data: any) {
      let { success, detail } = data;
      if (!success) {
        success = data;
      }
      const ev = new CustomEvent("success:" + success, { detail });
      dispatchEvent(ev);
    },
    sendCommand({ detail }: { detail: any }) {
      const { player, selectedBlock } = this.necessaryData();
      if (!Utilities.objectNearEachOther(player, selectedBlock)) {
        alert("you are too far away");
        return;
      }
      socket.emit("items:action", {
        player: { name: player.name },
        action: detail.command,
        block: selectedBlock,
        success: { success: "action", detail: detail.command },
      });
      this.sendUpdateItems(player.name);
    },
    sendCommandBuilding({ detail }: { detail: any }) {
      const { player, selectedBlock, selectedBuilding } = this.necessaryData();
      if (!Utilities.objectNearEachOther(player, selectedBlock)) {
        alert("You are too far away!");
        return;
      }
      socket.emit("buildings:action", {
        player: { name: player.name },
        action: detail.command,
        building: selectedBuilding,
        block: selectedBlock,
        success: "build",
      });
      this.sendUpdateItems(player.name);
      this.sendUpdateBuildings(player.name);
    },

    handleUnequip({ detail }: { detail: string }) {
      const { player } = this.necessaryData();
      socket.emit("items:unequip", {
        player: { name: player.name },
        itemToUnequip: { name: detail },
        success: "unequip",
      });
      this.sendUpdateItems(player.name);
    },
    handleEquip({ detail }: { detail: string }) {
      const { player } = this.necessaryData();
      socket.emit("items:equip", {
        player: { name: player.name },
        itemToEquip: { name: detail },
        success: "equip",
      });
      this.sendUpdateItems(player.name);
    },
    handleBuild({ detail }: { detail: string }) {
      const { player, selectedBlock } = this.necessaryData();
      if (!player.name) return;
      socket.emit("buildings:create", {
        player: { name: player.name },
        building: { name: detail },
        block: selectedBlock,
        success: "build",
      });
      this.sendUpdateItems(player.name);
      this.sendUpdateBuildings(player.name);
    },
    handleCraft({ detail }: { detail: string }) {
      const { player } = this.necessaryData();
      if (!player.name) return;
      socket.emit("items:craft", {
        player: { name: player.name },
        itemToCraft: { name: detail },
        success: { success: "craft", detail },
      });
      this.sendUpdateItems(player.name);
    },
    handleMove({ detail }: { detail: string }) {
      this.$store.commit(MUTATION_TYPE.setSelectedBlock, {});
      this.$store.commit(MUTATION_TYPE.setPlayerState, {
        state: "moving",
      });
      const { player, terrain, chunks } = this.necessaryData();
      if (!player.name || !terrain.mapId || !chunks.length) return;
      const map: object = {
        left: this.moveLeft,
        right: this.moveRight,
        up: this.moveUp,
        down: this.moveDown,
        "up-left": this.moveUpLeft,
        "up-right": this.moveUpRight,
        "down-left": this.moveDownLeft,
        "down-right": this.moveDownRight,
      };
      const method = (map as any)[detail];
      if (method) method();
      this.sendUpdateTerrain(player.name, chunks);
    },

    onConnected() {
      console.log("onConnected");
    },
    onDisconnected() {
      console.log("onDisconnected");
    },
    updatePlayers(newPlayers: any[]) {
      const playerName = this.$store.state.player.name;
      const players = newPlayers;
      const newPlayer = players.find(
        (player_: any) => playerName === player_.name
      );
      this.$store.commit(MUTATION_TYPE.setPlayers, players);
      this.$store.commit(MUTATION_TYPE.setPlayer, newPlayer);
    },
    handleConnected() {
      console.log("handleConnected");
      const player = {
        name: this.$store.state.player?.name,
      };
      socket.emit("players:requestUpdate", { player });
      socket.emit("items:update", { player });
      socket.emit("terrain:info");
      socket.emit("terrain:chunk", {
        player,
        chunks: this.$store.state.chunks,
      });
      socket.emit("buildings:requestUpdate", { player });
    },
    onTerrainInfo(terrain: object) {
      this.$store.commit(MUTATION_TYPE.setTerrain, terrain);
    },
    onTerrainChunk(data: object) {
      this.$store.commit(MUTATION_TYPE.addChunk, data);
    },
    onPlayersUpdate() {
      socket.emit("players:requestUpdate", {
        player: { name: this.$store.state.player.name },
      });
    },
    onBuildingsUpdate() {
      socket.emit("buildings:requestUpdate", {
        player: { name: this.$store.state.player.name },
      });
    },
    onPlayersRequestUpdate(data: any) {
      this.updatePlayers(data);
    },
    onBuildingsRequestUpdate(data: any) {
      this.updateBuildings(data);
    },
    onItemsUpdate(data: any) {
      this.updateInventory(data);
    },
    updateBuildings(data: any) {
      this.$store.commit(MUTATION_TYPE.setBuildings, data);
    },
    updateInventory(data: any) {
      this.$store.commit(MUTATION_TYPE.setInventory, data);
    },
    necessaryData(): any {
      return {
        player: this.$store.state.player,
        terrain: this.$store.state.terrain,
        chunks: this.$store.state.chunks,
        selectedBlock: this.$store.state.selectedBlock,
        selectedBuilding: this.$store.state.selectedBuilding,
      };
    },
    moveDown() {
      const { player, terrain, chunks } = this.necessaryData();
      this.sendMovePlayer(player.name, player.x, player.y + 1, terrain, chunks);
    },
    moveUp() {
      const { player, terrain, chunks } = this.necessaryData();
      this.sendMovePlayer(player.name, player.x, player.y - 1, terrain, chunks);
    },
    moveLeft() {
      const { player, terrain, chunks } = this.necessaryData();
      this.sendMovePlayer(player.name, player.x - 1, player.y, terrain, chunks);
    },
    moveRight() {
      const { player, terrain, chunks } = this.necessaryData();
      this.sendMovePlayer(player.name, player.x + 1, player.y, terrain, chunks);
    },
    moveDownLeft() {
      const { player, terrain, chunks } = this.necessaryData();
      this.sendMovePlayer(
        player.name,
        player.x - 1,
        player.y + 1,
        terrain,
        chunks
      );
    },
    moveDownRight() {
      const { player, terrain, chunks } = this.necessaryData();
      this.sendMovePlayer(
        player.name,
        player.x + 1,
        player.y + 1,
        terrain,
        chunks
      );
    },
    moveUpLeft() {
      const { player, terrain, chunks } = this.necessaryData();
      this.sendMovePlayer(
        player.name,
        player.x - 1,
        player.y - 1,
        terrain,
        chunks
      );
    },
    moveUpRight() {
      const { player, terrain, chunks } = this.necessaryData();
      this.sendMovePlayer(
        player.name,
        player.x + 1,
        player.y - 1,
        terrain,
        chunks
      );
    },
    sendMovePlayer(
      name: string,
      x: number,
      y: number,
      terrain: any,
      chunks: any[]
    ) {
      x = Utilities.clampNumber(x, 0, terrain.width - 1);
      y = Utilities.clampNumber(y, 0, terrain.height - 1);
      if (socket) {
        socket.emit("players:move", {
          player: { name },
          move: { x, y },
          success: "move",
        });
        this.sendUpdateTerrain(name, chunks);
      }
    },
    sendUpdateTerrain(name: string, chunks: Chunk[]) {
      socket.emit("terrain:chunk", {
        player: { name },
        chunks: chunks.map((chunk: Chunk) => chunk.id),
      });
    },
    sendUpdateItems(name: string) {
      socket.emit("items:update", { player: { name } });
    },
    sendUpdateBuildings(name: string) {
      socket.emit("buildings:requestUpdate", { player: { name } });
    },
    sendUpdatePlayers(name: string) {
      socket.emit("players:requestUpdate", { player: { name } });
    },
  },
});
</script>
<template></template>