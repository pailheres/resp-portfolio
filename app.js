// RESP Portfolio Tracker - JavaScript Application
// Reads pre-fetched prices from portfolio.json (updated by GitHub Actions)

let portfolioData = null;
let currentAccountView = 'all'; // 'all' or account name
let isMultiAccount = false;

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

// Fetch portfolio data from JSON file (holdings only, no prices)
async function loadPortfolio() {
    try {
        // Add timestamp to bypass browser cache
        const response = await fetch(`portfolio.json?v=${Date.now()}`);
        if (!response.ok) throw new Error('Failed to load portfolio');
        portfolioData = await response.json();

        // Detect if multi-account format
        isMultiAccount = portfolioData.accounts !== undefined;

        return portfolioData;
    } catch (error) {
        console.error('Error loading portfolio:', error);
        throw error;
    }
}

// Fetch real-time prices from Netlify serverless function
// Portfolio data is already complete from GitHub Actions update_prices.py
// No need to fetch prices separately

// Format currency
function formatCurrency(value) {
    if (value === null || value === undefined) return '--';
    // Use 4 decimals for penny stocks (< $1), otherwise 2 decimals
    const decimals = Math.abs(value) < 1 ? 4 : 2;
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
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

// Get current view data (account or all)
function getCurrentViewData() {
    if (!isMultiAccount) {
        return {
            holdings: portfolioData.holdings || [],
            summary: portfolioData.summary || {},
            cash: portfolioData.cash || 0
        };
    }

    if (currentAccountView === 'all') {
        // Combine all accounts
        let allHoldings = [];
        portfolioData.accounts.forEach(account => {
            allHoldings = allHoldings.concat(account.holdings);
        });

        return {
            holdings: allHoldings,
            summary: portfolioData.totalSummary || {},
            cash: portfolioData.totalSummary.totalCash || 0
        };
    } else {
        // Find specific account
        const account = portfolioData.accounts.find(a => a.name === currentAccountView);
        if (account) {
            return {
                holdings: account.holdings || [],
                summary: account.summary || {},
                cash: account.cash || 0
            };
        }
    }

    return { holdings: [], summary: {}, cash: 0 };
}

// Update summary cards
function updateSummary() {
    const viewData = getCurrentViewData();
    const summary = viewData.summary;
    const cash = viewData.cash;
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
    viewData.holdings.forEach(holding => {
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

// Render account tabs for multi-account view
function renderAccountTabs() {
    if (!isMultiAccount) {
        document.getElementById('accountTabs').style.display = 'none';
        return;
    }

    const tabsContainer = document.getElementById('accountTabs');
    tabsContainer.style.display = 'flex';
    tabsContainer.innerHTML = '';

    // Add "All Accounts" tab
    const allTab = document.createElement('button');
    allTab.className = 'account-tab' + (currentAccountView === 'all' ? ' active' : '');
    allTab.textContent = 'All Accounts';
    allTab.onclick = () => switchAccount('all');
    tabsContainer.appendChild(allTab);

    // Add individual account tabs
    portfolioData.accounts.forEach(account => {
        const tab = document.createElement('button');
        tab.className = 'account-tab' + (currentAccountView === account.name ? ' active' : '');
        tab.textContent = account.name;
        tab.onclick = () => switchAccount(account.name);
        tabsContainer.appendChild(tab);
    });
}

// Switch account view
function switchAccount(accountName) {
    currentAccountView = accountName;
    renderAccountTabs();

    const viewData = getCurrentViewData();
    renderHoldings(viewData.holdings);
    updateSummary();
}

// Show error state
function showError() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
}

// Main application flow
async function initApp() {
    try {
        // Load portfolio data (already includes prices from GitHub Actions)
        await loadPortfolio();

        // Update last updated timestamp
        updateLastUpdated();

        // Hide loading, show data
        document.getElementById('loading').style.display = 'none';

        // Render account tabs (if multi-account)
        renderAccountTabs();

        // Get current view data
        const viewData = getCurrentViewData();

        // Render holdings
        renderHoldings(viewData.holdings);

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
    // Setup theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Initialize portfolio
    initApp();

    // Start auto-refresh (every 5 minutes)
    startAutoRefresh();
});
