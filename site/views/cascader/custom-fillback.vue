<template>
  <bk-cascader
    v-model="area"
    :custom-text-fillback="customFillback"
    :list="list"
    :remote-method="remoteMethod"
    is-remote
  />
</template>
<script setup>
  import { ref } from 'vue';

  let id = 0;

  const list = [
    {
      id: 'hunan',
      name: '湖南',
    },
    {
      id: 'guangxi',
      name: '广西',
    },
    {
      id: 'yunnan',
      name: '云南',
    },
  ];
  const area = ref(['guangxi', 2, 3]);

  const remoteMethod = (node, resolve) => {
    const { level } = node;
    setTimeout(() => {
      const nodes = Array.from({ length: level + 1 }).map(() => {
        id = id + 1;
        return {
          id,
          name: `Option - ${id}`,
          leaf: level >= 2, // 为了更准确渲染，尽量通过`leaf`字段，告知是否是叶子节点；
        };
      });
      resolve(nodes);
    }, 1000);
  };

  const customFillback = (data, nodes) =>
    data
      .map(item => {
        const target = nodes.find(node => node.id === item);
        return target ? target.name : item;
      })
      .join('/');
</script>
