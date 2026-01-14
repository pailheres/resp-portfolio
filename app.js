// RESP Portfolio Tracker - JavaScript Application
// Reads pre-fetched prices from portfolio.json (updated by GitHub Actions)

let portfolioData = null;

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-icon');
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Initialize theme on load
initTheme();

// Fetch portfolio data from JSON file (includes prices)
async function loadPortfolio() {
    try {
        // Add timestamp to bypass browser cache
        const response = await fetch(`portfolio.json?v=${Date.now()}`);
        if (!response.ok) throw new Error('Failed to load portfolio');
        portfolioData = await response.json();
        return portfolioData;
    } catch (error) {
        console.error('Error loading portfolio:', error);
        throw error;
    }
}

// Format currency
function formatCurrency(value) {
    if (value === null || value === undefined) return '--';
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Format percentage
function formatPercent(value) {
    if (value === null || value === undefined) return '--';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

// Format number with commas
function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined) return '--';
    return new Intl.NumberFormat('en-CA', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

// Render holdings table
function renderHoldings(holdings) {
    const tbody = document.getElementById('holdingsBody');
    tbody.innerHTML = '';

    holdings.forEach(holding => {
        if (holding.shares === 0) return; // Skip zero shares

        // Check if prices are available
        const hasPrice = holding.currentPrice !== null && holding.currentPrice !== undefined;

        const gainLossClass = hasPrice && holding.gainLoss >= 0 ? 'positive' : 'negative';
        const todayClass = hasPrice && holding.change >= 0 ? 'positive' : 'negative';

        // Calculate total change in dollars (change per share * number of shares)
        const totalChange = hasPrice ? holding.change * holding.shares : null;

        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="sticky-col"><strong>${holding.brokerSymbol}</strong></td>
            <td><small>${holding.displayName}</small></td>
            <td class="text-right">${formatNumber(holding.shares, 3)}</td>
            <td class="text-right">${formatCurrency(holding.avgCost)}</td>
            <td class="text-right">${hasPrice ? formatCurrency(holding.currentPrice) : '--'}</td>
            <td class="text-right"><strong>${hasPrice ? formatCurrency(holding.marketValue) : '--'}</strong></td>
            <td class="text-right ${gainLossClass}"><strong>${hasPrice ? formatCurrency(holding.gainLoss) : '--'}</strong></td>
            <td class="text-right ${gainLossClass}"><strong>${hasPrice ? formatPercent(holding.gainLossPercent) : '--'}</strong></td>
            <td class="text-right ${todayClass}">
                ${hasPrice ? formatCurrency(totalChange) : '--'}<br>
                <small>${hasPrice ? formatPercent(holding.changePercent) : '--'}</small>
            </td>
        `;
    });
}

// Update summary cards
function updateSummary() {
    const summary = portfolioData.summary || {};
    const cash = portfolioData.cash || 0;
    const totalMarketValue = summary.totalMarketValue || 0;
    const totalValue = totalMarketValue + cash;
    const totalGain = summary.totalGainLoss || 0;
    const totalGainPercent = summary.totalGainLossPercent || 0;

    document.getElementById('totalValue').textContent = formatCurrency(totalValue);
    document.getElementById('cashBalance').textContent = formatCurrency(cash);

    const gainElement = document.getElementById('totalGain');
    const gainPercentElement = document.getElementById('totalGainPercent');

    gainElement.textContent = formatCurrency(totalGain);
    gainPercentElement.textContent = formatPercent(totalGainPercent);

    // Apply color classes
    const gainClass = totalGain >= 0 ? 'positive' : 'negative';
    gainElement.className = `card-value ${gainClass}`;
    gainPercentElement.className = `card-sublabel ${gainClass}`;

    // Calculate today's total change
    let todayTotalChange = 0;
    portfolioData.holdings.forEach(holding => {
        if (holding.change !== null && holding.change !== undefined) {
            todayTotalChange += holding.change * holding.shares;
        }
    });

    // Calculate today's percentage (change vs yesterday's value)
    const yesterdayValue = totalMarketValue - todayTotalChange;
    const todayPercent = yesterdayValue !== 0 ? (todayTotalChange / yesterdayValue) * 100 : 0;

    const todayGainElement = document.getElementById('todayGain');
    const todayGainPercentElement = document.getElementById('todayGainPercent');

    todayGainElement.textContent = formatCurrency(todayTotalChange);
    todayGainPercentElement.textContent = formatPercent(todayPercent);

    // Apply color classes for today's change
    const todayClass = todayTotalChange >= 0 ? 'positive' : 'negative';
    todayGainElement.className = `card-value ${todayClass}`;
    todayGainPercentElement.className = `card-sublabel ${todayClass}`;
}

// Update last updated timestamp
function updateLastUpdated() {
    if (portfolioData && portfolioData.lastUpdated) {
        document.getElementById('lastUpdated').textContent =
            `Last updated: ${portfolioData.lastUpdated}`;
    }
}

// Show error state
function showError() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
}

// Main application flow
async function initApp() {
    try {
        // Load portfolio data (prices already included from GitHub Actions)
        await loadPortfolio();
        updateLastUpdated();

        // Hide loading, show data
        document.getElementById('loading').style.display = 'none';

        // Render holdings
        renderHoldings(portfolioData.holdings);

        // Update summary
        updateSummary();

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError();
    }
}

// Auto-refresh every 5 minutes to check for updates
function startAutoRefresh() {
    setInterval(() => {
        console.log('Checking for updates...');
        initApp();
    }, 5 * 60 * 1000); // 5 minutes
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    startAutoRefresh();

    // Setup theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});
