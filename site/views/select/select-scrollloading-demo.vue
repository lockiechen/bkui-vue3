<template>
  <bk-select
    class="bk-select"
    v-model="selectedValue"
    :scroll-loading="scrollLoading"
    filterable
    @scroll-end="handleScrollEnd"
  >
    <bk-option
      v-for="item in datasource"
      :disabled="item.disabled"
      :id="item.value"
      :key="item.value"
      :name="item.label"
    />
  </bk-select>
</template>
<script setup>
  import { ref } from 'vue';
  const datasource = ref([
    {
      value: 'climbing',
      label: '爬山',
    },
    {
      value: 'running',
      label: '跑步',
    },
    {
      value: 'unknow',
      label: '未知',
    },
    {
      value: 'fitness',
      label: '健身',
    },
    {
      value: 'bike',
      label: '骑车',
    },
    {
      value: 'dancing',
      label: '跳舞',
    },
    {
      value: 'sleep',
      label: '睡觉',
      disabled: true,
    },
  ]);
  const selectedValue = ref('dancing');
  const scrollLoading = ref(false);
  const handleScrollEnd = () => {
    scrollLoading.value = true;
    setTimeout(() => {
      datasource.value.push({
        value: new Date().getTime(),
        label: `滚动加载${new Date().getTime()}`,
      });
      scrollLoading.value = false;
    }, 1000);
  };
</script>
<style scoped>
  .bk-select {
    width: 300px;
  }
</style>
