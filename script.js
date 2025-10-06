const converterForm = document.getElementById("converter-form");
const fromCurrency = document.getElementById("from-currency");
const toCurrency = document.getElementById("to-currency");
const amountInput = document.getElementById("amount");
const resultDiv = document.getElementById("result");

window.addEventListener("load", fetchCurrencies);
converterForm.addEventListener("submit", convertCurrency);

// Add swap functionality
const swapBtn = document.getElementById("swap-btn");
swapBtn.addEventListener("click", swapCurrencies);

function swapCurrencies() {
    const fromValue = fromCurrency.value;
    const toValue = toCurrency.value;
    
    fromCurrency.value = toValue;
    toCurrency.value = fromValue;
    
    // Add visual feedback
    swapBtn.style.transform = "rotate(180deg)";
    setTimeout(() => {
        swapBtn.style.transform = "rotate(0deg)";
    }, 300);
    
    // Auto-convert if amount is entered
    if (amountInput.value && parseFloat(amountInput.value) > 0) {
        convertCurrency(new Event('submit'));
    }
}

async function fetchCurrencies() {
    try {
        // Show loading state
        resultDiv.innerHTML = '<div class="loading"></div><p>Loading currencies...</p>';
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        // Validate API response structure
        if (!data || !data.rates || typeof data.rates !== 'object') {
            throw new Error('Invalid API response structure');
        }

        console.log('Currency data loaded successfully:', data);
        const currencyOptions = Object.keys(data.rates);
        
        // Add USD to the rates for completeness
        currencyOptions.unshift("USD");

        // Clear existing options except the first placeholder
        fromCurrency.innerHTML = '<option value="">Select currency...</option>';
        toCurrency.innerHTML = '<option value="">Select currency...</option>';

        currencyOptions.forEach(currency => {
            const option1 = document.createElement("option");
            option1.value = currency;
            option1.textContent = `${currency} - ${getCurrencyName(currency)}`;
            fromCurrency.appendChild(option1);

            const option2 = document.createElement("option");
            option2.value = currency;
            option2.textContent = `${currency} - ${getCurrencyName(currency)}`;
            toCurrency.appendChild(option2);
        });

        // Set default values
        fromCurrency.value = "USD";
        toCurrency.value = "EUR";
        
        // Clear loading state
        resultDiv.innerHTML = '<p style="color: var(--text-secondary);">Enter an amount and select currencies to convert</p>';
        
    } catch (error) {
        console.error("Error fetching currencies:", error);
        
        // Provide more specific error messages
        let errorMessage = "Error loading currencies. ";
        if (error.name === 'AbortError') {
            errorMessage += "Request timed out. ";
        } else if (error.message.includes('HTTP error')) {
            errorMessage += "Server error. ";
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage += "Network connection error. ";
        }
        errorMessage += "Please check your internet connection and refresh the page.";
        
        resultDiv.innerHTML = `
            <div style="text-align: center; padding: 15px; background-color: #dc2626; color: white; border-radius: 8px;">
                ⚠️<br>
                ${errorMessage}
                <br><br>
                <button onclick="fetchCurrencies()" style="background: white; color: #dc2626; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 8px;">
                    Retry
                </button>
            </div>
        `;
        
        // Load fallback currencies if API fails
        loadFallbackCurrencies();
    }
}

function getCurrencyName(code) {
    const currencyNames = {
        'USD': 'US Dollar',
        'EUR': 'Euro',
        'GBP': 'British Pound',
        'JPY': 'Japanese Yen',
        'AUD': 'Australian Dollar',
        'CAD': 'Canadian Dollar',
        'CHF': 'Swiss Franc',
        'CNY': 'Chinese Yuan',
        'INR': 'Indian Rupee',
        'KRW': 'South Korean Won',
        'MXN': 'Mexican Peso',
        'BRL': 'Brazilian Real',
        'RUB': 'Russian Ruble',
        'ZAR': 'South African Rand',
        'SGD': 'Singapore Dollar',
        'HKD': 'Hong Kong Dollar',
        'NOK': 'Norwegian Krone',
        'SEK': 'Swedish Krona',
        'DKK': 'Danish Krone',
        'PLN': 'Polish Zloty'
    };
    return currencyNames[code] || code;
}

async function convertCurrency(e) {
    e.preventDefault();

    const amount = parseFloat(amountInput.value);
    const fromCurrencyValue = fromCurrency.value;
    const toCurrencyValue = toCurrency.value;

    // Enhanced input validation
    if (isNaN(amount) || amount <= 0) {
        showError("Please enter a valid positive amount");
        return;
    }

    if (amount > 1000000000) {
        showError("Amount too large. Please enter a smaller value.");
        return;
    }

    if (!fromCurrencyValue || !toCurrencyValue) {
        showError("Please select both currencies");
        return;
    }

    if (fromCurrencyValue === toCurrencyValue) {
        resultDiv.innerHTML = `
            <div style="text-align: center; padding: 15px; background-color: var(--bg-input); border-radius: 8px; margin-top: 10px;">
                <strong>${amount} ${fromCurrencyValue} = ${amount} ${toCurrencyValue}</strong>
                <br><small style="color: var(--text-secondary); margin-top: 5px; display: block;">Same currency - no conversion needed</small>
            </div>
        `;
        return;
    }

    // Show loading state with animation
    resultDiv.innerHTML = '<div class="loading"></div><p>Converting...</p>';

    try {
        // Add timeout for conversion request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrencyValue}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        // Validate response structure
        if (!data || !data.rates || typeof data.rates !== 'object') {
            throw new Error("Invalid API response structure");
        }

        if (!data.rates[toCurrencyValue]) {
            throw new Error(`Exchange rate for ${toCurrencyValue} not found`);
        }

        const rate = data.rates[toCurrencyValue];
        
        // Validate rate is a valid number
        if (isNaN(rate) || rate <= 0) {
            throw new Error("Invalid exchange rate received");
        }
        
        const convertedAmount = (amount * rate).toFixed(2);

        resultDiv.innerHTML = `
            <div style="text-align: center; padding: 15px; background-color: var(--bg-input); border-radius: 8px; margin-top: 10px;">
                <strong>${amount} ${fromCurrencyValue} = ${convertedAmount} ${toCurrencyValue}</strong>
                <br><small style="color: var(--text-secondary); margin-top: 5px; display: block;">Exchange rate: 1 ${fromCurrencyValue} = ${rate.toFixed(4)} ${toCurrencyValue}</small>
                <br><small style="color: var(--text-secondary); margin-top: 3px; display: block;">Last updated: ${new Date().toLocaleTimeString()}</small>
            </div>
        `;
    } catch (error) {
        console.error("Error converting currency:", error);
        
        let errorMessage = "Error converting currency. ";
        if (error.name === 'AbortError') {
            errorMessage += "Request timed out. ";
        } else if (error.message.includes('HTTP error')) {
            errorMessage += "Server error. ";
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage += "Network connection error. ";
        }
        errorMessage += "Please try again.";
        
        resultDiv.innerHTML = `
            <div style="text-align: center; padding: 15px; background-color: #dc2626; color: white; border-radius: 8px; margin-top: 10px;">
                ⚠️<br>
                ${errorMessage}
                <br><br>
                <button onclick="convertCurrency(new Event('submit'))" style="background: white; color: #dc2626; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 8px;">
                    Retry
                </button>
            </div>
        `;
    }
}

// Helper function for showing user-friendly error messages
function showError(message) {
    resultDiv.innerHTML = `
        <div style="text-align: center; padding: 15px; background-color: #f59e0b; color: white; border-radius: 8px; margin-top: 10px;">
            ⚠️ ${message}
        </div>
    `;
}

// Fallback currency list in case API fails
function loadFallbackCurrencies() {
    const fallbackCurrencies = [
        'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'KRW',
        'MXN', 'BRL', 'RUB', 'ZAR', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'PLN'
    ];
    
    // Clear existing options
    fromCurrency.innerHTML = '<option value="">Select currency...</option>';
    toCurrency.innerHTML = '<option value="">Select currency...</option>';
    
    fallbackCurrencies.forEach(currency => {
        const option1 = document.createElement("option");
        option1.value = currency;
        option1.textContent = `${currency} - ${getCurrencyName(currency)}`;
        fromCurrency.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = currency;
        option2.textContent = `${currency} - ${getCurrencyName(currency)}`;
        toCurrency.appendChild(option2);
    });
    
    // Set default values
    fromCurrency.value = "USD";
    toCurrency.value = "EUR";
    
    console.log('Loaded fallback currencies');
}