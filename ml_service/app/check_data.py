import pandas as pd
import os
#loads the data file into memory as a table.
df = pd.read_csv('data/clean_food_price_indices.csv')
print(df.columns.tolist())
print(df.head(3))
