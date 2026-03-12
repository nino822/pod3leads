import csv, urllib.request, sys
sys.stdout.reconfigure(encoding='utf-8')
url='https://docs.google.com/spreadsheets/d/1VIVL1rMYhYRsLZYxqgPGzX1LWpZnvpF0s3p5_eGRKKU/gviz/tq?tqx=out:csv&sheet=Leads%20Tracking'
rows=list(csv.reader(urllib.request.urlopen(url).read().decode('utf-8-sig').splitlines()))
for idx,row in enumerate(rows):
    if len(row)>8 and row[6].strip()=='Pod 3':
        print(idx, row[1], row[9:17], row[16])
        if idx>2590:
            break
