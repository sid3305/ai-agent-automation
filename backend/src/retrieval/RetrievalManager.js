class RetrievalManager {
  constructor(strategyRegistry, strategySelector) {
    this.strategyRegistry = strategyRegistry;
    this.strategySelector = strategySelector;
  }
  async retrieve(agent, userId, documentIds, query, topK = 3) {
    const strategyName =
      await this.strategySelector.selectStrategy(
          agent,
          userId,
          documentIds,
          query
      );

        const strategy = this.strategyRegistry.get(strategyName);

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