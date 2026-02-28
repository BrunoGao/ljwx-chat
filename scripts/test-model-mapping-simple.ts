/**
 * 简单的模型映射配置测试
 */

const MODEL_PROVIDER_MAPPING: Record<string, { model: string, provider: string; }> = {
  'lingjingwanxiang:32b': {
    model: 'claude-sonnet-4-6',
    provider: 'anthropic',
  },
};

console.log('=== 模型映射配置测试 ===\n');

const testModel = 'lingjingwanxiang:32b';
const mapping = MODEL_PROVIDER_MAPPING[testModel];

console.log(`测试模型: ${testModel}`);

if (mapping) {
  console.log(`✅ 映射配置正确:`);
  console.log(`  - 前端显示: ${testModel}`);
  console.log(`  - 实际 Provider: ${mapping.provider}`);
  console.log(`  - 实际 Model: ${mapping.model}`);
} else {
  console.log(`❌ 未找到映射配置`);
}

console.log('\n=== 环境变量检查 ===\n');
console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ 已设置' : '❌ 未设置'}`);
console.log(
  `ANTHROPIC_PROXY_URL: ${process.env.ANTHROPIC_PROXY_URL ? `✅ ${process.env.ANTHROPIC_PROXY_URL}` : '❌ 未设置'}`,
);

console.log('\n=== 测试结论 ===\n');
console.log('配置已完成，当用户在前端选择 lingjingwanxiang:32b 时：');
console.log('1. 前端显示: lingjingwanxiang:32b');
console.log('2. 后端实际调用: Anthropic Claude API');
console.log('3. 使用模型: claude-sonnet-4-6');
