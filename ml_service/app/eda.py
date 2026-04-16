import os
import pandas as pd
import matplotlib.pyplot as plt

# Get the directory where this script is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load both cleaned files using absolute paths
ffpi = pd.read_csv(os.path.join(BASE_DIR, 'data/clean_food_price_indices.csv'))
cpi = pd.read_csv(os.path.join(BASE_DIR, 'data/clean_consumer_price_indices.csv'), encoding='latin-1')

# Ensure Date is parsed correctly for plotting with axvline
ffpi['Date'] = pd.to_datetime(ffpi['Date'])

# Plot 1 — overall food price trend
plt.figure(figsize=(14,5))
# Fixed column names based on the check: 'Date' and 'Food Price Index'
plt.plot(ffpi['Date'], ffpi['Food Price Index'])
plt.axvline(x=pd.to_datetime('2022-02-01'), color='red', linestyle='--', label='Ukraine war')
plt.axvline(x=pd.to_datetime('2020-03-01'), color='orange', linestyle='--', label='COVID')
plt.title('Global Food Price Index 1990-2024')
plt.legend()
plt.tight_layout()
plt.savefig(os.path.join(BASE_DIR, 'data/plot1_global_trend.png'))
plt.close()

# Plot 2 — top 10 most affected countries
# Remove outliers (Venezuela hyperinflation skews chart)
cpi_filtered = cpi[cpi['Value'] < 100000]

plt.figure(figsize=(12,5))
top10 = cpi_filtered.groupby('Area')['Value'].mean().sort_values(ascending=False).head(10)
top10.plot(kind='bar', title='Top 10 Countries by Avg Food CPI')
plt.xticks(rotation=45, ha='right')
plt.tight_layout()
plt.savefig(os.path.join(BASE_DIR, 'data/plot2_top_countries.png'))
plt.close()

print("EDA done!")
