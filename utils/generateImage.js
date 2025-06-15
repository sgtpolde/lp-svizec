// utils/generateImage.js
const { createCanvas, Image } = require('canvas');
const { Chart, registerables } = require('chart.js');
const annotationPlugin = require('chartjs-plugin-annotation');

Chart.register(...registerables, annotationPlugin);
global.Image = Image;
Chart.defaults.color = '#ffffff';

const width = 1200;
const height = 600;

const rankLPMap = {
  Iron: { baseLP: 0, tiers: ['IV', 'III', 'II', 'I'] },
  Bronze: { baseLP: 400, tiers: ['IV', 'III', 'II', 'I'] },
  Silver: { baseLP: 800, tiers: ['IV', 'III', 'II', 'I'] },
  Gold: { baseLP: 1200, tiers: ['IV', 'III', 'II', 'I'] },
  Platinum: { baseLP: 1600, tiers: ['IV', 'III', 'II', 'I'] },
  Emerald: { baseLP: 2000, tiers: ['IV', 'III', 'II', 'I'] },
  Diamond: { baseLP: 2400, tiers: ['IV', 'III', 'II', 'I'] },
  Master: { baseLP: 2800, tiers: ['Master'] },
  Grandmaster: { baseLP: 3200, tiers: ['Grandmaster'] },
  Challenger: { baseLP: 3600, tiers: ['Challenger'] },
};

const CHALLENGER_MAX = 4000; // Beyond Challenger range

function calculateTotalLP(rank, lp) {
  if (!rank) return lp;
  const [baseRank, division = ''] = rank.split(' ');
  const rankData = rankLPMap[baseRank];
  if (!rankData) return lp;

  const tierIndex = rankData.tiers.findIndex(t => t.toLowerCase() === division.toLowerCase());
  const tierOffset = tierIndex >= 0 ? tierIndex * 100 : 0;
  return rankData.baseLP + lp + tierOffset;
}

/**
 * Convert an LP value into a rank label if it matches a known division boundary.
 * @param {number} value - LP value
 * @returns {string|null} Rank label or null if not a boundary.
 */
function lpToRankLabel(value) {
  if (value > CHALLENGER_MAX) return 'Challenger+';

  // Find which rank this value could belong to
  for (const [rankName, data] of Object.entries(rankLPMap)) {
    const { baseLP, tiers } = data;

    // Check if this is exactly at or above the base and within the tier range
    // For multi-division tiers: range is baseLP + 0 to baseLP + 300 (for IV to I)
    // For single-tier ranks: only one line at baseLP
    if (tiers.length > 1) {
      // Multi-division tier (e.g. Platinum)
      // Divisions: 0=IV, 100=III, 200=II, 300=I
      if (value >= baseLP && value <= baseLP + 300 && (value - baseLP) % 100 === 0) {
        const divIndex = (value - baseLP) / 100; // 0=IV,1=III,2=II,3=I
        const division = tiers[divIndex];
        return `${rankName} ${division}`;
      }
    } else {
      // Single-tier rank (e.g. Master at 2800)
      // Only a single boundary line
      if (value === baseLP && tiers.length === 1) {
        return rankName; // e.g. "Master", "Grandmaster", "Challenger"
      }
    }
  }

  // If no match found, return null
  return null;
}

/**
 * Generate an LP graph as a Buffer.
 * @param {Array} lpHistory - Array of { lp, timestamp, rank, lpChange }
 * @param {string} [summonerName] - Optional summoner name for watermark
 * @returns {Promise<Buffer>}
 */
async function generateLPGraph(lpHistory, summonerName) {
  const sortedHistory = [...lpHistory].sort((a, b) => a.timestamp - b.timestamp);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bgGradient = ctx.createLinearGradient(0, height, 0, 0);
  bgGradient.addColorStop(0, 'rgba(0,0,0,1)');
  bgGradient.addColorStop(1, 'rgba(20,20,20,1)');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Watermark (optional)
  if (summonerName) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.font = 'bold 100px Sans';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.fillText(summonerName, 0, 0);
    ctx.restore();
  }

  const labels = sortedHistory.map((_, i) => `Game ${i + 1}`);
  const totalLPData = sortedHistory.map(entry => calculateTotalLP(entry.rank, entry.lp));

  const minTotalLP = Math.min(...totalLPData);
  const maxTotalLP = Math.max(...totalLPData);
  const maxBuffer = Math.min(maxTotalLP + 100, CHALLENGER_MAX + 100);

  // Create annotations for main tier boundaries only (IV division or single-tier)
  // We'll show all relevant divisions as ticks, so we only annotate the base tier line (IV or single-tier).
  const relevantAnnotations = [];
  for (const [rank, data] of Object.entries(rankLPMap)) {
    const base = data.baseLP;
    // Annotate only if within range
    if (base >= minTotalLP && base <= maxBuffer) {
      const label = lpToRankLabel(base);
      if (label) {
        relevantAnnotations.push({
          type: 'line',
          yMin: base,
          yMax: base,
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          label: {
            display: true,
            position: 'start',
            color: '#ccc',
            content: label,
            font: { size: 12 },
          },
        });
      }
    }
  }

  if (maxTotalLP > CHALLENGER_MAX) {
    const label = lpToRankLabel(CHALLENGER_MAX);
    relevantAnnotations.push({
      type: 'line',
      yMin: CHALLENGER_MAX,
      yMax: CHALLENGER_MAX,
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      label: {
        display: true,
        position: 'start',
        color: '#ccc',
        content: label,
        font: { size: 12 },
      },
    });
  }

  const chartConfig = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'LP Over Time',
          data: totalLPData,
          borderColor: '#00BFFF',
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Games Played',
            color: '#ffffff',
            font: { size: 14, weight: 'bold' },
          },
          ticks: {
            maxTicksLimit: 30,
            color: '#ffffff',
            font: { size: 12 },
          },
          grid: {
            color: 'rgba(255,255,255,0.1)',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Rank & LP',
            color: '#ffffff',
            font: { size: 14, weight: 'bold' },
          },
          min: minTotalLP,
          max: maxBuffer,
          // Step size = 100 to align with divisions
          ticks: {
            stepSize: 100,
            color: '#ffffff',
            font: { size: 12 },
            // We'll map every tick to a rank if possible
            callback(value) {
              const label = lpToRankLabel(value);
              return label !== null ? label : '';
            },
          },
          grid: {
            borderDash: [5, 5],
            color: 'rgba(255, 255, 255, 0.2)',
          },
          // After building ticks, remove any ticks that have empty labels
          afterBuildTicks: axis => {
            axis.ticks = axis.ticks.filter(t => {
              const label = lpToRankLabel(t.value);
              return label !== null;
            });
          },
        },
      },
      plugins: {
        annotation: {
          annotations: relevantAnnotations,
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          callbacks: {
            label: context => {
              const dataIndex = context.dataIndex;
              const entry = sortedHistory[dataIndex];
              const lp = context.raw;
              const lpChange =
                entry.lpChange !== undefined
                  ? entry.lpChange > 0
                    ? `+${entry.lpChange}`
                    : `${entry.lpChange}`
                  : '';
              const dateStr = new Date(entry.timestamp).toLocaleString('en-US', {
                timeZone: 'UTC',
                hour12: false,
              });
              return [`LP: ${lp}${lpChange ? ` (${lpChange} LP)` : ''}`, `Date: ${dateStr} UTC`];
            },
            title: () => '',
          },
        },
        legend: {
          display: false,
        },
      },
      layout: {
        padding: 10,
      },
    },
  };

  new Chart(ctx, chartConfig);

  return canvas.toBuffer();
}

module.exports = { generateLPGraph };
