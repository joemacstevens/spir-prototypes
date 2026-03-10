<script>
  import Shell from './lib/Shell.svelte';
  import { initFromURL } from './lib/stores/navigation.js';
  import { onMount } from 'svelte';

  onMount(() => {
    initFromURL();
  });
</script>

<Shell />

<style>
  :global(#app) {
    position: relative;
    width: 100%;
    height: 100%;
  }
</style>
