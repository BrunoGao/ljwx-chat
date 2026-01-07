// Quick test script for Ollama model configuration
const { Ollama } = require('ollama/browser');

try {
  const client = new Ollama({ host: 'http://127.0.0.1:11434' });

  console.log('Testing Ollama connection...');
  const list = await client.list();
  console.log(
    'Available models:',
    list.models.map((m) => m.name),
  );

  const modelName = 'lingjingwanxiang:32b';
  const foundModel = list.models.find((m) => m.name === modelName);

  if (foundModel) {
    console.log(`\n✓ Model ${modelName} found in Ollama`);
    console.log('Model details:', foundModel);

    console.log(`\nTesting chat with ${modelName}...`);
    const response = await client.chat({
      messages: [{ content: 'Hello', role: 'user' }],
      model: modelName,
      stream: false,
    });

    console.log('✓ Chat test successful');
    console.log('Response:', response.message.content);
  } else {
    console.error(`✗ Model ${modelName} not found in Ollama`);
    console.log('Available models:', list.models.map((m) => m.name).join(', '));
  }
} catch (error) {
  console.error('Error:', error.message);
  console.error('Full error:', error);
}
