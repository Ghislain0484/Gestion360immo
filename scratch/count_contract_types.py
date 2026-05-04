
import json
import sys

data = json.load(sys.stdin)
types = [item['type'] for item in data if item.get('type')]
from collections import Counter
counts = Counter(types)

print(f"Total contrats actifs: {len(types)}")
for t, count in counts.items():
    print(f"- {t}: {count}")
