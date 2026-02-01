// RESP Portfolio Tracker - JavaScript Application
// Reads pre-fetched prices from portfolio.json (updated by GitHub Actions)

let portfolioData = null;
let currentAccountView = 'all'; // 'all' or account name
let isMultiAccount = false;
let currentUser = null;

// Authentication Management
function initAuth() {
    // Initialize Netlify Identity
    if (window.netlifyIdentity) {
        window.netlifyIdentity.on('init', user => {
            currentUser = user;
            updateAuthUI();
            if (user) {
                showPortfolio();
            } else {
                showLoginGate();
            }
        });

        window.netlifyIdentity.on('login', user => {
            currentUser = user;
            updateAuthUI();
            showPortfolio();
            window.netlifyIdentity.close();
        });

        window.netlifyIdentity.on('logout', () => {
            currentUser = null;
            updateAuthUI();
            showLoginGate();
        });

        // Check current user
        currentUser = window.netlifyIdentity.currentUser();
        updateAuthUI();
    }
}

function updateAuthUI() {
    const authButton = document.getElementById('authButton');
    const authButtonText = document.getElementById('authButtonText');
    const userEmail = document.getElementById('userEmail');

    if (currentUser) {
        authButton.style.display = 'block';
        authButtonText.textContent = 'Logout';
        userEmail.textContent = currentUser.email;
        authButton.onclick = () => window.netlifyIdentity.logout();
    } else {
        authButton.style.display = 'block';
        authButtonText.textContent = 'Login';
        userEmail.textContent = '';
        authButton.onclick = () => window.netlifyIdentity.open();
    }
}

function showLoginGate() {
    document.getElementById('loginGate').style.display = 'flex';
    document.getElementById('portfolioContent').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
}

function showPortfolio() {
    document.getElementById('loginGate').style.display = 'none';
    document.getElementById('portfolioContent').style.display = 'block';

    // Initialize portfolio if not already done
    if (!portfolioData) {
        initApp();
    }
}

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
async function fetchRealTimePrices() {
    try {
        console.log('Fetching real-time prices...');
        const response = await fetch('/.netlify/functions/prices');

        if (!response.ok) {
            throw new Error(`Failed to fetch prices: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Fetched ${Object.keys(data.prices).length} prices at ${data.timestamp}`);

        return data.prices;
    } catch (error) {
        console.error('Error fetching real-time prices:', error);
        return null;
    }
}

// Apply real-time prices to portfolio holdings
function applyPricesToHoldings(holdings, prices) {
    if (!prices) return holdings;

    holdings.forEach(holding => {
        const priceData = prices[holding.symbol];

        if (priceData) {
            // Round prices: 4 decimals for penny stocks, 2 for others
            const decimals = priceData.price < 1 ? 4 : 2;

            holding.currentPrice = parseFloat(priceData.price.toFixed(decimals));
            holding.change = parseFloat(priceData.change.toFixed(decimals));
            holding.changePercent = parseFloat(priceData.changePercent.toFixed(2));

            // Calculate market value and gains
            holding.marketValue = parseFloat((holding.shares * holding.currentPrice).toFixed(2));
            holding.costBasis = parseFloat((holding.shares * holding.avgCost).toFixed(2));
            holding.gainLoss = parseFloat((holding.marketValue - holding.costBasis).toFixed(2));

            if (holding.costBasis > 0) {
                holding.gainLossPercent = parseFloat(((holding.gainLoss / holding.costBasis) * 100).toFixed(2));
            } else {
                holding.gainLossPercent = 0;
            }
        }
    });

    return holdings;
}

// Update account summaries with current prices
function updateAccountSummaries() {
    if (!isMultiAccount) {
        // Single account format
        const holdings = portfolioData.holdings || [];
        const totalCost = holdings.reduce((sum, h) => sum + (h.costBasis || 0), 0);
        const totalMarketValue = holdings.reduce((sum, h) => sum + (h.marketValue || 0), 0);
        const totalGain = totalMarketValue - totalCost;

        portfolioData.summary = {
            totalCost: parseFloat(totalCost.toFixed(2)),
            totalMarketValue: parseFloat(totalMarketValue.toFixed(2)),
            totalGainLoss: parseFloat(totalGain.toFixed(2)),
            totalGainLossPercent: totalCost > 0 ? parseFloat(((totalGain / totalCost) * 100).toFixed(2)) : 0
        };
    } else {
        // Multi-account format
        let totalCostAll = 0;
        let totalMarketValueAll = 0;
        let totalCashAll = 0;

        portfolioData.accounts.forEach(account => {
            const accountCost = account.holdings.reduce((sum, h) => sum + (h.costBasis || 0), 0);
            const accountMarketValue = account.holdings.reduce((sum, h) => sum + (h.marketValue || 0), 0);
            const accountGain = accountMarketValue - accountCost;

            account.summary = {
                totalCost: parseFloat(accountCost.toFixed(2)),
                totalMarketValue: parseFloat(accountMarketValue.toFixed(2)),
                totalGainLoss: parseFloat(accountGain.toFixed(2)),
                totalGainLossPercent: accountCost > 0 ? parseFloat(((accountGain / accountCost) * 100).toFixed(2)) : 0,
                cashBalance: account.cash
            };

            totalCostAll += accountCost;
            totalMarketValueAll += accountMarketValue;
            totalCashAll += account.cash;
        });

        const totalGainAll = totalMarketValueAll - totalCostAll;
        portfolioData.totalSummary = {
            totalCost: parseFloat(totalCostAll.toFixed(2)),
            totalMarketValue: parseFloat(totalMarketValueAll.toFixed(2)),
            totalGainLoss: parseFloat(totalGainAll.toFixed(2)),
            totalGainLossPercent: totalCostAll > 0 ? parseFloat(((totalGainAll / totalCostAll) * 100).toFixed(2)) : 0,
            totalCash: parseFloat(totalCashAll.toFixed(2)),
            totalValue: parseFloat((totalMarketValueAll + totalCashAll).toFixed(2))
        };
    }
}

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
        // Load portfolio data (holdings only, no prices yet)
        await loadPortfolio();

        // Fetch real-time prices from serverless function
        const prices = await fetchRealTimePrices();

        // Apply prices to all holdings
        if (isMultiAccount) {
            portfolioData.accounts.forEach(account => {
                applyPricesToHoldings(account.holdings, prices);
            });
        } else {
            applyPricesToHoldings(portfolioData.holdings, prices);
        }

        // Update summaries with current prices
        updateAccountSummaries();

        // Update timestamp to now
        portfolioData.lastUpdated = new Date().toLocaleString('en-US', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        });
        updateLastUpdated();

        // Hide loading, show data
        document.getElementById('loading').style.display = 'none';

        // Render account tabs (if multi-account)
        renderAccountTabs();

        // Get current view data
        const viewData = getCurrentViewData();

        // Render holdings with real-time prices
        renderHoldings(viewData.holdings);

        // Update summary with real-time data
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
    // Initialize authentication
    initAuth();

    // Setup login button
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            window.netlifyIdentity.open();
        });
    }

    // Setup theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Start auto-refresh (will only work if logged in)
    startAutoRefresh();

    // Check if user is logged in
    if (currentUser) {
        showPortfolio();
    } else {
        showLoginGate();
    }
});
