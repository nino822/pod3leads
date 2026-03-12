import csv, urllib.request
from datetime import datetime, timedelta

url='https://docs.google.com/spreadsheets/d/1VIVL1rMYhYRsLZYxqgPGzX1LWpZnvpF0s3p5_eGRKKU/gviz/tq?tqx=out:csv&sheet=Leads%20Tracking'
rows=list(csv.reader(urllib.request.urlopen(url).read().decode('utf-8-sig').splitlines()))

currentWeek=0
foundFirstHeader=False
currentHeaderDates=[]
week_numbers=set()
max_week=0

for row in rows:
    clientHeader=row[1].strip().lower() if len(row)>1 else ''
    if clientHeader=='client':
        headerDates=[]
        foundDate=False
        for col in range(9,len(row)):
            raw=row[col].strip()
            if not raw:
                if foundDate:
                    break
                continue
            try:
                parsed=datetime.strptime(raw, '%m/%d/%y')
            except ValueError:
                try:
                    parsed=datetime.strptime(raw, '%m/%d/%Y')
                except ValueError:
                    if foundDate:
                        break
                    continue
            headerDates.append((col, parsed))
            foundDate=True
        if not headerDates:
            continue
        currentHeaderDates=headerDates
        if not foundFirstHeader:
            foundFirstHeader=True
            currentWeek=1
        else:
            currentWeek+=1
        continue
    if currentWeek==0:
        continue
    if len(row)<=1:
        continue
    week_numbers.add(currentWeek)
    max_week=max(max_week,currentWeek)
print('max week', max_week)
print('weeks', sorted(week_numbers))
