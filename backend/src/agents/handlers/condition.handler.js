const { runLLM } = require('../llmAdapter');
const { createStepResult } = require('../utils/stepResult');

async function execute(step, context, agent, validatedStepId, timeoutMs) {
  const config = step.config || step;
  const output = String(context.last?.output || '');

  let evaluation = false;

  if (config.conditionType === 'contains') {
    evaluation = output.toLowerCase().includes(
      String(config.value || '')
        .toLowerCase()
        .trim()
    );
  } else if (config.conditionType === 'boolean') {
    const aiResult = await runLLM(`Answer only true or false:\n${output}`, {
      provider: agent?.config?.provider,
      model: agent?.config?.model,
      temperature: 0,
    });

    const text = (aiResult.text || '').toLowerCase().trim();
    const hasTrue = /\btrue\b/i.test(text);
    const hasFalse = /\bfalse\b/i.test(text);
    const hasNot = /\b(not|never|no)\b/i.test(text);

    evaluation = hasTrue && !hasFalse && !hasNot;
  }

  return createStepResult({
    stepId: validatedStepId,
    type: 'condition',
    output: evaluation,
    branch: evaluation ? 'true' : 'false',
    success: true,
  });
}

module.exports = { execute };