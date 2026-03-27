const { evaluateExpression } = require("./src/utils/expressionEngine");

const context = {
  input: {
    text: "hello world",
  },
  last: {
    output: "positive",
  },
  results: [
    { output: 5 },
    { output: "negative" },
  ],
};

const tests = [
  {
    name: "Basic equality TRUE",
    expr: "{{last.output}} === 'positive'",
    expected: true,
  },
  {
    name: "Basic equality FALSE",
    expr: "{{last.output}} === 'negative'",
    expected: false,
  },
  {
    name: "Array access",
    expr: "{{results[1].output}} === 'negative'",
    expected: true,
  },
  {
    name: "Number comparison",
    expr: "{{results[0].output}} > 3",
    expected: true,
  },
  {
    name: "AND condition",
    expr: "{{last.output}} === 'positive' && {{results[0].output}} === 5",
    expected: true,
  },
  {
    name: "Input access",
    expr: "{{input.text}} === 'hello world'",
    expected: true,
  },
  {
    name: "Invalid variable",
    expr: "{{unknown.value}} === 1",
    expected: false,
  },
];

console.log("\n🧪 Running Expression Engine Tests...\n");

tests.forEach((test, i) => {
  const result = evaluateExpression(test.expr, context);

  const pass = result === test.expected;

  console.log(
    `${pass ? "✅ PASS" : "❌ FAIL"} | ${test.name}\n   → ${test.expr}\n   → Result: ${result}\n`
  );
});