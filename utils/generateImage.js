const { createCanvas } = require('canvas');
const Chart = require('chart.js/auto');

// Define dimensions of the canvas (increased size for better clarity)
const width = 1200;
const height = 600;

/**
 * Utility function to generate a u.gg-style LP graph for all League of Legends ranks and tiers.
 * The Y-axis will dynamically adjust based on the player's LP history and rank.
 * @param {Array} lpHistory - Array of LP changes with rank and LP values
 * @returns {Promise<Buffer>} - Buffer of the generated image
 */
async function generateLPGraph(lpHistory) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Extract labels (games), LP data, and rank data
  const labels = lpHistory.map((entry, index) => `Game ${index + 1}`);
  const lpData = lpHistory.map(entry => entry.lp);

  // Define rank tiers and LP boundaries for each rank with corresponding colors
  const rankLPMap = {
    Iron: { baseLP: 0, tiers: ['I4', 'I3', 'I2', 'I1'], color: 'rgba(102, 51, 0, 0.3)' },
    Bronze: { baseLP: 400, tiers: ['B4', 'B3', 'B2', 'B1'], color: 'rgba(205, 127, 50, 0.3)' },
    Silver: { baseLP: 800, tiers: ['S4', 'S3', 'S2', 'S1'], color: 'rgba(192, 192, 192, 0.3)' },
    Gold: { baseLP: 1200, tiers: ['G4', 'G3', 'G2', 'G1'], color: 'rgba(255, 215, 0, 0.3)' },
    Platinum: { baseLP: 1600, tiers: ['P4', 'P3', 'P2', 'P1'], color: 'rgba(0, 255, 127, 0.3)' },
    Diamond: { baseLP: 2000, tiers: ['D4', 'D3', 'D2', 'D1'], color: 'rgba(0, 191, 255, 0.3)' },
    Master: { baseLP: 2400, tiers: ['Master'], color: 'rgba(128, 0, 128, 0.3)' },
    Grandmaster: { baseLP: 2800, tiers: ['Grandmaster'], color: 'rgba(255, 0, 0, 0.3)' },
    Challenger: { baseLP: 3200, tiers: ['Challenger'], color: 'rgba(255, 69, 0, 0.3)' },
  };

  /**
   * Calculate total LP based on rank and LP in that tier.
   * For example, Silver II with 50 LP will be calculated as 950 LP (base 800 for Silver + 150 for the tier).
   */
  function calculateTotalLP(rank, lp) {
    const rankInfo = Object.entries(rankLPMap).find(([key]) => rank === key || rank.startsWith(key));
    if (!rankInfo) return lp; // If the rank is not found, return LP as is

    const [rankName, rankData] = rankInfo;
    const tierIndex = rankData.tiers.findIndex(tier => rank.endsWith(tier));
    return rankData.baseLP + lp + tierIndex * 100; // Base LP + LP in the division
  }

  // Calculate the total LP for each game
  const totalLPData = lpHistory.map(entry => calculateTotalLP(entry.rank, entry.lp));

  // Determine the min and max LP for the graph based on history
  const minTotalLP = Math.min(...totalLPData);
  const maxTotalLP = Math.max(...totalLPData);

  // Add a small buffer to the max value for some leeway
  const maxBuffer = maxTotalLP + 100; // Increased buffer space above max rank

  // Get relevant tiers for the Y-axis labels based on min/max LP
  const relevantRanks = Object.keys(rankLPMap).filter(rank => rankLPMap[rank].baseLP <= maxTotalLP && rankLPMap[rank].baseLP + 400 >= minTotalLP);

  // Define the chart configuration
  const chartConfig = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'LP Over Time',
          data: totalLPData,
          borderColor: '#00BFFF',  // Cyan color for the line
          borderWidth: 2,
          pointRadius: 0,  // No point markers for cleaner look
          fill: false,     // No background fill
          tension: 0.4,    // Smoother line
        },
      ],
    },
    options: {
      responsive: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Games Played',
            color: '#ffffff',
            font: {
              size: 12,
            },
          },
          ticks: {
            maxTicksLimit: 30, // Keep more ticks for X-axis precision
            color: '#ffffff',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Rank & LP',
            color: '#ffffff',
            font: {
              size: 12,
            },
          },
          min: minTotalLP,
          max: maxBuffer,  // Increased max buffer
          ticks: {
            callback: function (value) {
              // Display rank names based on the LP values
              const rank = relevantRanks.find(rank => value >= rankLPMap[rank].baseLP && value <= rankLPMap[rank].baseLP + 400);
              if (!rank) return value;
              const tierIndex = Math.floor((value - rankLPMap[rank].baseLP) / 100);
              const tier = rankLPMap[rank].tiers[tierIndex] || '';
              return `${rank} ${tier}`; // Show rank and tier
            },
            stepSize: 100,
            color: '#ffffff',
          },
          grid: {
            borderDash: [5, 5], // Dashed lines for grid
            color: 'rgba(255, 255, 255, 0.2)',
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => {
              const lp = context.raw;
              const lpChange = lpHistory[context.dataIndex].lpChange > 0 ? `+${lpHistory[context.dataIndex].lpChange}` : `${lpHistory[context.dataIndex].lpChange}`;
              return `LP: ${lp} (${lpChange} LP)`;
            },
          },
        },
        legend: {
          display: false, // Hide the legend for a cleaner look
        },
      },
      layout: {
        padding: {
          left: 10,
          right: 10,
          top: 10,
          bottom: 10,
        },
      },
    },
  };

  // Create the chart using the canvas context
  new Chart(ctx, chartConfig);

  // Return the chart as a buffer
  return canvas.toBuffer();
}

module.exports = { generateLPGraph };
