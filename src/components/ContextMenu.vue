<script lang="ts">
import { defineComponent } from "@vue/runtime-core";
import { PlayerState } from "../model/Models";
import { MUTATION_TYPE } from "../types";
import okTickImage from "../assets/ok-tick.png";
import noTickImage from "../assets/no-tick.png";
export default defineComponent({
  data() {
    return { okTickImage, noTickImage };
  },
  computed: {
    buildingName() {
      return this.$store.state.playerState.detail.building;
    },
    state() {
      return this.$store.state.playerState.state;
    },
  },
  methods: {
    reject() {
      this.$store.commit(MUTATION_TYPE.setPlayerState, {
        state: "moving",
      } as PlayerState);
    },
    accept() {
      const ev = new CustomEvent("build", { detail: this.buildingName });
      dispatchEvent(ev);
      this.$store.commit(MUTATION_TYPE.setPlayerState, {
        state: "moving",
      } as PlayerState);
    },
  },
});
</script>

<template>
  <div class="menu" v-if="state == 'building:chosen'">
    <div class="menu-header">Confirm Building</div>
    <img id="building" :src="'../assets/buildings/' + buildingName + '.png'" />
    <div class="options">
      <img :src="okTickImage" @click="accept()" />
      <img :src="noTickImage" @click="reject()" />
    </div>
  </div>
</template>
<style scoped>
.menu {
  position: absolute;
  background: white;
  width: fit-content;
  min-width: 100px;
  box-shadow: 1px 1px 1px 1px;
  z-index: 30;
  margin: auto;
  margin-left: 70%;
  margin-top: 10%;
}
.menu-header {
  text-align: center;
}

.options {
  display: flex;
}

img {
  width: 100%;
}
</style>
