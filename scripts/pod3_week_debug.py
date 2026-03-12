import csv, urllib.request
from datetime import datetime, timedelta

url='https://docs.google.com/spreadsheets/d/1VIVL1rMYhYRsLZYxqgPGzX1LWpZnvpF0s3p5_eGRKKU/gviz/tq?tqx=out:csv&sheet=Leads%20Tracking'
rows=list(csv.reader(urllib.request.urlopen(url).read().decode('utf-8-sig').splitlines()))

currentWeek=0
foundFirstHeader=False
currentHeaderDates=[]
weekStart=None
weekEnd=None

for i,row in enumerate(rows):
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
        weekStart=currentHeaderDates[0][1]
        weekEnd=currentHeaderDates[-1][1]
        continue
    if currentWeek==0:
        continue
    if len(row)<=7:
        continue
    if row[6].strip().lower()!='pod 3':
        continue
    weekStartBound, weekEndBound = weekStart, weekEnd
    overlapping=[col for col,date in currentHeaderDates if weekStartBound<=date<=weekEndBound]
    overlappingSum=sum(int(row[col]) if row[col].isdigit() else 0 for col in overlapping)
    weeklyTotal=int(row[16]) if len(row)>16 and row[16].isdigit() else 0
    headerSum=sum(int(row[col]) if row[col].isdigit() else 0 for col,_ in currentHeaderDates)
    if overlappingSum>0:
        weeklyLeads=overlappingSum
    elif weeklyTotal>0:
        weeklyLeads=weeklyTotal
    elif headerSum>0:
        weeklyLeads=headerSum
    else:
        weeklyLeads=weeklyTotal
    if i>=2430:
        print('row', i, 'week', currentWeek, 'leads', weeklyLeads, 'overlap', overlappingSum, 'total', weeklyTotal)
