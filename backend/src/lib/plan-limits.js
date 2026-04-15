const { loadEnv } = require("../config/env");

const FREE = Object.freeze({
  maxProducts: 20,
  maxVideos: 5,
  maxAiGenerations: 1,
});

function readPremiumCaps() {
  loadEnv();
  const maxProducts = Number(process.env.PREMIUM_MAX_PRODUCTS);
  const maxVideos = Number(process.env.PREMIUM_MAX_VIDEOS);
  return {
    maxProducts: Number.isFinite(maxProducts) && maxProducts > 0 ? maxProducts : 500,
    maxVideos: Number.isFinite(maxVideos) && maxVideos > 0 ? maxVideos : 100,
    maxAiGenerations: Infinity,
  };
}

/**
 * @param {'free'|'premium'} plan
 */
function getLimitsForPlan(plan) {
  if (plan === "premium") return readPremiumCaps();
  return { ...FREE };
}

module.exports = {
  FREE,
  getLimitsForPlan,
};
