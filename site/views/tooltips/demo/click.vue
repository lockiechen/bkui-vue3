<template>
  <span
    class="bk-tooltips-base"
    v-bk-tooltips="config"
  >
    <info />
  </span>
</template>

<script>
  import { defineComponent } from 'vue';

  import { bkTooltips } from 'bkui-vue';
  import { Info } from 'bkui-vue/lib/icon';

  export default defineComponent({
    components: {
      Info,
    },
    directives: {
      bkTooltips,
    },
    setup() {
      const config = {
        content: '提示信息',
        trigger: 'click',
        theme: 'light',
      };
      return {
        config,
      };
    },
  });
</script>

<style lang="postcss">
  .bk-tooltips-base {
    font-size: 18px;
    color: #3a84ff;
    cursor: pointer;
  }
</style>
