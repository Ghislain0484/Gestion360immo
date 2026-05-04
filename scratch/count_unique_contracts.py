
import json
import sys

data = json.load(sys.stdin)
property_ids = [item['property_id'] for item in data if item.get('property_id')]
unique_ids = set(property_ids)

print(f"Total contrats actifs: {len(property_ids)}")
print(f"Proprietes uniques liees: {len(unique_ids)}")
print(f"Doublons potentiels: {len(property_ids) - len(unique_ids)}")
