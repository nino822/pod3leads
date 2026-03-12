import csv, urllib.request, sys
sys.stdout.reconfigure(encoding='utf-8')
url='https://docs.google.com/spreadsheets/d/1VIVL1rMYhYRsLZYxqgPGzX1LWpZnvpF0s3p5_eGRKKU/gviz/tq?tqx=out:csv&sheet=Leads%20Tracking'
rows=list(csv.reader(urllib.request.urlopen(url).read().decode('utf-8-sig').splitlines()))
for idx in [2439,2440,2448,2593]:
    print('row',idx, rows[idx])
