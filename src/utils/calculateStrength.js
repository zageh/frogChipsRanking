// utils/calculateStrength.js

/**
 * 计算薯片的实力值
 * @param {Object} chip - 薯片对象，包含 weighted_avg_score, admin_rating, vote_count
 * @returns {number} 实力值
 */
export default function calculateStrength(chip) {
  const myScore = chip.admin_rating || 0
  const avg = chip.weighted_avg_score || 0
  const votes = chip.vote_count || 0

  // 权重参数，可随时调整
  const alpha = 0.6
  const beta = 0.3
  const gamma = 0.1

  return alpha * avg + beta * myScore + gamma * Math.log(1 + votes)
}
