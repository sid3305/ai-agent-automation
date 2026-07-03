class RetrievalManager {
  constructor(strategyRegistry) {
    this.strategyRegistry = strategyRegistry;
  }

  async retrieve(agent, userId, documentIds, query, topK = 3) {
    // PR1 always uses the existing hybrid retrieval strategy.
    const strategy = this.strategyRegistry.get("hybrid");

    return strategy.retrieve(
      agent,
      userId,
      documentIds,
      query,
      topK
    );
  }
}

module.exports = RetrievalManager;